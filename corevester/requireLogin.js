// =========================================================
// middleware/requireLogin.js
// Requires the existing authentication layer to expose
// req.user. No authentication strategy is created here.
// =========================================================
module.exports = function requireLogin(req, res, next) {
  if (req.user) return next();

  const nextUrl = encodeURIComponent(req.originalUrl || "/products");
  return res.redirect(`/auth/login?next=${nextUrl}`);
};
