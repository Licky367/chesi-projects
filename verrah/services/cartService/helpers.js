const { getUserId } = require("../shopContext");

function getLoggedInUserId(req) {
    return getUserId(req);
}

function normalizeRequestedQuantity(value) {
    const qty = Number(value);
    if (!Number.isFinite(qty) || qty <= 0) return null;
    return Math.floor(qty);
}

module.exports = { getLoggedInUserId, normalizeRequestedQuantity };
