const Cart = require("../../models/carts");
const { getLoggedInUserId } = require("./helpers");

async function updatePaymentMode(req, isMobile) {
    const userId = getLoggedInUserId(req);
    if (!userId) throw new Error("User is not authenticated.");
    if (typeof isMobile !== "boolean") throw new Error("Invalid payment mode.");
    const cart = await Cart.findOne({ user: userId });
    if (!cart) throw new Error("Cart not found.");
    cart.isMobile = isMobile;
    await cart.save();
    return cart;
}

module.exports = { updatePaymentMode };
