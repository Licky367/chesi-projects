const mongoose = require("mongoose");
const Product = require("../../models/products");
const Cart = require("../../models/carts");
const {
    getLoggedInUserId,
    normalizeRequestedQuantity
} = require("./helpers");
const {
    getOrCreateCart
} = require("./cart");


async function addToCart(
    req,
    productId,
    quantity,
    cartSubstation = ""
) {

    const qty =
        normalizeRequestedQuantity(
            quantity
        );

    if (!qty) {
        throw new Error(
            "Invalid quantity."
        );
    }

    if (
        !mongoose.Types.ObjectId.isValid(
            productId
        )
    ) {
        throw new Error(
            "Invalid product."
        );
    }


    const product =
        await Product.findOne({
            _id: productId,
            isActive: true
        }).lean();

    if (!product) {
        throw new Error(
            "Product not found or inactive."
        );
    }


    if (
        product.units !== undefined &&
        Number(product.units) < qty
    ) {
        throw new Error(
            `Only ${product.units} unit(s) available.`
        );
    }


    const cart =
        await getOrCreateCart(req);


    // ======================================================
    // ALWAYS USE THE LATEST CART SUBSTATION
    // ======================================================

    const latestSubstation =
        String(
            cartSubstation || ""
        ).trim();

    if (latestSubstation) {

        cart.cartSubstation =
            latestSubstation;

    }


    // ======================================================
    // EXISTING ITEM
    // ======================================================

    const existingItem =
        cart.items.find(
            item =>
                String(item.productId) ===
                String(product._id)
        );


    if (existingItem) {

        const newQty =
            Number(existingItem.qty || 0) +
            qty;

        if (
            product.units !== undefined &&
            Number(product.units) < newQty
        ) {
            throw new Error(
                `Only ${product.units} unit(s) available.`
            );
        }

        existingItem.qty =
            newQty;

        if (
            existingItem.price === undefined ||
            existingItem.price === null
        ) {

            existingItem.price =
                Number(
                    product.unitSellPrice || 0
                );

        }

    } else {

        // ==================================================
        // NEW ITEM
        // ==================================================

        cart.items.push({

            product:
                product._id,

            productId:
                product._id,

            name:
                product.name || "",

            price:
                Number(
                    product.unitSellPrice || 0
                ),

            image:
                product.image || "",

            qty

        });

    }


    await cart.save();

    return cart;
}


async function removeItem(
    req,
    productId
) {

    const userId =
        getLoggedInUserId(req);

    if (!userId) {
        throw new Error(
            "User is not authenticated."
        );
    }


    const cart =
        await Cart.findOne({
            user: userId
        });

    if (!cart) {
        throw new Error(
            "Cart not found."
        );
    }


    cart.items =
        cart.items.filter(
            item =>
                String(item.productId) !==
                String(productId)
        );


    // ======================================================
    // CLEAR SUBSTATION WHEN CART BECOMES EMPTY
    // ======================================================

    if (!cart.items.length) {

        cart.cartSubstation =
            "";

    }


    await cart.save();

    return cart;
}


module.exports = {
    addToCart,
    removeItem
};