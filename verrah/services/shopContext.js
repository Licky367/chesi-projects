// =========================================================
// services/shopContext.js
// Small helpers shared by shop services.
// =========================================================
function getUserId(req) {
  const id = req.user && (req.user._id || req.user.id);
  return id ? String(id) : null;
}

function getSessionId(req) {
  return req.sessionID || getUserId(req);
}

function money(value) {
  return Number(value || 0).toFixed(2);
}

module.exports = { getUserId, getSessionId, money };
