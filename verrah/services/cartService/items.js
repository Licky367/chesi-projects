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
    quantity
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
    // ADMIN / BRANCH CART SUBSTATION
    //
    // The branch form submits:
    //
    //     cartSubstation
    //
    // The value belongs to the CURRENT branch being used.
    //
    // Every time a product is added from a branch, replace
    // the previous cartSubstation with the latest one.
    //
    // Staff-sale processing itself still decides the sales
    // substation based on the user's role.
    // ======================================================

    const cartSubstation =
        String(
            req.body?.cartSubstation ||
            ""
        ).trim();

    if (
        cartSubstation &&
        mongoose.Types.ObjectId.isValid(
            cartSubstation
        )
    ) {

        cart.cartSubstation =
            new mongoose.Types.ObjectId(
                cartSubstation
            );

    }


    // ======================================================
    // FIND EXISTING ITEM
    // ======================================================

    const existingItem =
        cart.items.find(
            item =>
                String(item.productId) ===
                String(product._id)
        );


    // ======================================================
    // EXISTING ITEM
    // ======================================================

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

    }


    // ======================================================
    // NEW ITEM
    // ======================================================

    else {

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
    // CART IS NOW EMPTY
    //
    // cartSubstation is an ObjectId field.
    // Do NOT assign "" to it.
    //
    // Remove the field instead so an old branch cannot
    // remain attached to the empty cart.
    // ======================================================

    if (!cart.items.length) {

        cart.set(
            "cartSubstation",
            undefined
        );

    }


    await cart.save();

    return cart;
}


module.exports = {
    addToCart,
    removeItem
};