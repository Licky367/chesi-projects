// =========================================================
// middleware/cartContext.js
// Adds cartCount to every rendered view when possible.
// =========================================================
const Cart = require("../models/carts");

module.exports = async function cartContext(req, res, next) {
  res.locals.user = req.user || null;
  res.locals.cartCount = 0;

  try {
    const sessionId = req.sessionID || (req.user && String(req.user._id || req.user.id));
    if (sessionId) {
      const cart = await Cart.findOne({ sessionId }).lean();
      res.locals.cartCount = (cart?.items || []).reduce((sum, item) => sum + Number(item.qty || 0), 0);
    }
  } catch (err) {
    // Cart display must never break the page.
    console.error("cartContext:", err.message);
  }

  next();
};
