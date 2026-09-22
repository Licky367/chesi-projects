const Cart = require("../../models/carts");
const { getLoggedInUserId } = require("./helpers");

async function getOrCreateCart(req, session = null) {
    const userId = getLoggedInUserId(req);
    if (!userId) throw new Error("User is not authenticated.");
    let cartQuery = Cart.findOne({ user: userId });
    if (session) cartQuery = cartQuery.session(session);
    let cart = await cartQuery;
    if (!cart) {
        cart = new Cart({ user: userId, items: [], isMobile: true });
        await cart.save(session ? { session } : undefined);
    }
    return cart;
}

async function getCart(req) {
    const userId = getLoggedInUserId(req);
    if (!userId) return null;
    return Cart.findOne({ user: userId }).populate("items.product").lean();
}

function calculateTotal(cart) {
    if (!cart || !Array.isArray(cart.items)) return 0;
    return cart.items.reduce((total, item) => {
        const price = Number(item.price || 0);
        const qty = Number(item.qty || 0);
        return total + (price * qty);
    }, 0);
}

module.exports = { getOrCreateCart, getCart, calculateTotal };
