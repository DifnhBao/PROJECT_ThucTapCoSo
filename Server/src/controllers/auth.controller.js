const authService = require('../services/auth.service');
const { cookieOptions } = require('../config/security');
const optionsFor = (req) => cookieOptions({ NODE_ENV: req.app.locals.securityConfig.production ? 'production' : 'development' });

function setTokens(req, res, tokens, scope) {
  const options = optionsFor(req);
  const suffix = scope === 'admin' ? '_admin' : '';
  res.cookie(`accessToken${suffix}`, tokens.accessToken, { ...options, maxAge: tokens.accessExpiresIn });
  res.cookie(`refreshToken${suffix}`, tokens.refreshToken, { ...options, expires: new Date(tokens.refreshExpiresAt) });
}
const register = async (req, res, next) => {
  try { res.status(201).json({ message: 'Register successfully!', data: await authService.registerUser(req.body) }); }
  catch (error) { next(error); }
};
const login = (scope) => async (req, res, next) => {
  try {
    const result = await (scope === 'admin' ? authService.loginAdmin : authService.loginUser)(req.body);
    setTokens(req, res, result.tokens, scope);
    res.set('Cache-Control', 'no-store');
    if (scope === 'admin') res.json({ message: 'Admin login successfully', admin: result.admin });
    else res.json({ message: 'Login successfully!', data: result });
  } catch (error) { next(error); }
};
const refresh = (scope) => async (req, res, next) => {
  try {
    const raw = req.cookies?.[scope === 'admin' ? 'refreshToken_admin' : 'refreshToken'];
    const result = await (scope === 'admin' ? authService.refreshAdminToken : authService.refreshToken)(raw);
    setTokens(req, res, result, scope);
    res.set('Cache-Control', 'no-store');
    res.json({ message: 'Refresh token thành công', accessToken: result.accessToken });
  } catch (error) { next(error); }
};
const logout = (scope) => async (req, res, next) => {
  try {
    const suffix = scope === 'admin' ? '_admin' : '';
    await (scope === 'admin' ? authService.logoutAdmin : authService.logoutUser)(req.cookies?.[`refreshToken${suffix}`]);
    res.clearCookie(`accessToken${suffix}`, optionsFor(req));
    res.clearCookie(`refreshToken${suffix}`, optionsFor(req));
    res.set('Cache-Control', 'no-store');
    res.json({ message: 'Logout successfully.' });
  } catch (error) { next(error); }
};
module.exports = { register, login: login('user'), loginAdmin: login('admin'), requestRefreshToken: refresh('user'), refreshAdminToken: refresh('admin'), logout: logout('user'), logoutAdmin: logout('admin') };
module.exports = require('../validation/validate-controller').withContracts(module.exports, require('../validation/contracts').contracts.auth);
