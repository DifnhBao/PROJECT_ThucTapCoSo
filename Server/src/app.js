const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { AppError } = require('./utils/app-error');

const { getSecurityConfig } = require('./config/security');
const { createSecurity } = require('./midlewares/security');

// Constructing an app never connects to DB, starts timers, or opens a port.
function createApp({ securityConfig = getSecurityConfig(), securityClock, readinessProbe, runtimeState } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('query parser', 'extended');
  app.set('trust proxy', securityConfig.proxies.length ? securityConfig.proxies : false);
  app.locals.securityConfig = securityConfig;
  app.locals.security = createSecurity(securityConfig, securityClock);
  app.use(require('./midlewares/api-contract').apiContract);
  app.use(require('./operations/access-log').accessLog);
  require('./operations/health').mountHealth(app, { probe: readinessProbe, state: runtimeState });
  app.use(app.locals.security.early);
  app.use((req, res, next) => {
    const route = req.path.toLowerCase().replace(/\/+$/, '');
    if (/^\/api\/auth\/(admin\/)?login$/.test(route)) return app.locals.security.loginIp(req, res, next);
    if (route === '/api/auth/register') return app.locals.security.register(req, res, next);
    if (/^\/api\/auth\/(admin\/)?refresh-token$/.test(route)) return app.locals.security.refresh(req, res, next);
    next();
  });
  app.use((req, res, next) => {
    const hasBody = Number(req.headers['content-length']) > 0 || req.headers['transfer-encoding'];
    if (req.path.startsWith('/api') && hasBody && !req.is(['application/json', 'application/x-www-form-urlencoded', 'multipart/form-data'])) {
      return next(new AppError('Content-Type không được hỗ trợ.', 415, 'UNSUPPORTED_MEDIA_TYPE'));
    }
    next();
  });
  const activityJson = express.json({ limit: securityConfig.activityMaxBytes });
  const normalJson = express.json({ limit: '100kb' });
  app.use((req, res, next) => (req.path.toLowerCase().replace(/\/+$/, '') === '/api/activity' ? activityJson : normalJson)(req, res, next));
  app.use(cookieParser());
  app.use(express.urlencoded({ extended: true, limit: '8kb', parameterLimit: 50 }));
  app.use(cors({
    origin(origin, callback) {
      if (!origin || securityConfig.origins.includes(origin)) return callback(null, true);
      callback(new AppError('Origin không được phép.', 403, 'ORIGIN_FORBIDDEN'));
    },
    credentials: true,
  }));
  app.set("etag", false);
  app.use("/api", require("./routes/index"));
  app.get("/", (req, res) => res.send("API Backend"));
  app.use((req, res, next) => next(new AppError('Không tìm thấy endpoint.', 404, 'ROUTE_NOT_FOUND')));
  app.use(require("./midlewares/error.midleware"));
  return app;
}

module.exports = { createApp };
