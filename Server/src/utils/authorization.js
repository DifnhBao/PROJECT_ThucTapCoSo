const { AppError } = require('./app-error');
class AuthorizationError extends AppError {
  constructor(message = "Không có quyền thực hiện thao tác này.", statusCode = 403, code = "FORBIDDEN") {
    super(message, statusCode, code);
    this.name = "AuthorizationError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

function positiveId(value) {
  if (typeof value !== "number" && !(typeof value === "string" && /^\d+$/.test(value))) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function requireId(value) {
  const id = positiveId(value);
  if (id === null) throw new AuthorizationError("ID không hợp lệ.", 400, "INVALID_ID");
  return id;
}

function principalFromClaims(claims) {
  const userId = positiveId(claims?.userId);
  const validRole = claims?.scope === "user"
    ? claims.role === "user"
    : claims?.scope === "admin" && ["admin", "super_admin"].includes(claims.role);
  if (userId === null || !validRole) {
    throw new AuthorizationError("Token identity không hợp lệ.", 401, "INVALID_IDENTITY");
  }
  return Object.freeze({
    userId, role: claims.role, scope: claims.scope,
    sessionId: typeof claims.sessionId === "string" ? claims.sessionId : null,
  });
}

function requirePermission(allowed) {
  if (!allowed) throw new AuthorizationError();
}

module.exports = { AuthorizationError, positiveId, requireId, principalFromClaims, requirePermission };
