function apiOrigin(env = process.env) {
  const value = env.API_INTERNAL_URL || (env.NODE_ENV === "production" ? "" : "http://127.0.0.1:5000");
  let url;
  try { url = new URL(value); } catch { throw new Error("API_INTERNAL_URL is required and must be an HTTP(S) origin"); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("API_INTERNAL_URL must be an HTTP(S) origin without credentials or a path");
  }
  return url.origin;
}
module.exports = { apiOrigin };
