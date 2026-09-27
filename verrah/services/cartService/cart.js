// ==========================================================
// verrah/services/cartService/cart.js
//
// VERRAH COSMETICS
// CART SERVICE
//
// Handles:
// - Creating carts
// - Retrieving carts
// - Cart totals
// - Optional active substation context
//
// IMPORTANT:
// activeSubstationId is OPTIONAL.
//
// If supplied:
//     -> Validate the supplied substation ID
//     -> Save the ID directly as cartSubstation
//
// If NOT supplied:
//     -> Do not require it
//     -> Do not throw an error
//     -> Preserve normal cart behavior
//
// cartSubstation stores the SUBSTATION ID, never the name.
//
// This works for admin, staff, and other roles.
// ==========================================================


const mongoose =
    require("mongoose");


// ==========================================================
// MODELS
// ==========================================================

const Cart =
    require("../../models/carts");

const Substation =
    require("../../models/substations");


// ==========================================================
// HELPERS
// ==========================================================

const {
    getLoggedInUserId
} = require("./helpers");


// ==========================================================
// GET OPTIONAL ACTIVE SUBSTATION ID
// ==========================================================
//
// The active substation can come from:
//
// 1. req.body.activeSubstationId
// 2. req.query.substation
//
// Body takes priority.
//
// Neither source is compulsory.
//
// If neither exists:
//     return null
//
// If an ID is supplied:
//     validate the ID
//     verify that the substation exists
//     return the ID itself
//
// DO NOT resolve the name.
// DO NOT save the name.
// ==========================================================

async function getOptionalCartSubstation(
    req
) {

    const bodySubstationId =
        req.body &&
        req.body.activeSubstationId
            ? String(
                req.body.activeSubstationId
            ).trim()
            : "";


    const querySubstationId =
        req.query &&
        req.query.substation
            ? String(
                req.query.substation
            ).trim()
            : "";


    const activeSubstationId =
        bodySubstationId ||
        querySubstationId;


    // ------------------------------------------------------
    // No active substation supplied.
    // ------------------------------------------------------

    if (!activeSubstationId) {

        return null;

    }


    // ------------------------------------------------------
    // Validate ObjectId.
    // ------------------------------------------------------

    if (
        !mongoose.Types.ObjectId.isValid(
            activeSubstationId
        )
    ) {

        throw new Error(
            "Invalid active substation."
        );

    }


    // ------------------------------------------------------
    // Verify that the substation exists.
    // ------------------------------------------------------

    const substationExists =
        await Substation.exists({
            _id:
                activeSubstationId
        });


    if (!substationExists) {

        throw new Error(
            "Active substation not found."
        );

    }


    // ------------------------------------------------------
    // Return ONLY the ID.
    // ------------------------------------------------------

    return activeSubstationId;

}


// ==========================================================
// APPLY OPTIONAL CART SUBSTATION
// ==========================================================

async function applyOptionalCartSubstation(
    req,
    cart,
    session = null
) {

    const activeSubstationId =
        await getOptionalCartSubstation(
            req
        );


    // ------------------------------------------------------
    // No active substation supplied.
    // Leave existing value untouched.
    // ------------------------------------------------------

    if (!activeSubstationId) {

        return cart;

    }


    const newSubstationId =
        new mongoose.Types.ObjectId(
            activeSubstationId
        );


    const currentSubstationId =
        cart.cartSubstation
            ? String(
                cart.cartSubstation
            )
            : "";


    const newSubstationIdString =
        String(
            newSubstationId
        );


    // ------------------------------------------------------
    // Only save when the substation actually changed.
    // ------------------------------------------------------

    if (
        currentSubstationId !==
        newSubstationIdString
    ) {

        cart.cartSubstation =
            newSubstationId;


        if (session) {

            cart.$session(
                session
            );

        }


        await cart.save();

    }


    return cart;

}


// ==========================================================
// CALCULATE TOTAL
// ==========================================================
//
// IMPORTANT:
//
// Verrah cart items use:
//
//     qty
//
// not only:
//
//     quantity
//
// Therefore both are supported.
//
// Expected item:
//
// {
//     qty,
//     quantity,
//     price
// }
//
// Price is the item's stored unit price.
//
// ==========================================================

function calculateTotal(
    cart
) {

    if (
        !cart ||
        !Array.isArray(
            cart.items
        )
    ) {

        return 0;

    }


    return cart.items.reduce(
        function (
            total,
            item
        ) {

            if (!item) {

                return total;

            }


            // ------------------------------------------------
            // Cart quantity.
            //
            // Prefer qty because that is the cart field.
            // quantity remains supported for compatibility.
            // ------------------------------------------------

            const quantity =
                Number(
                    item.qty ??
                    item.quantity ??
                    0
                );


            // ------------------------------------------------
            // Unit price.
            // ------------------------------------------------

            const price =
                Number(
                    item.price ??
                    item.unitSellPrice ??
                    0
                );


            // ------------------------------------------------
            // Ignore invalid values.
            // ------------------------------------------------

            if (
                !Number.isFinite(
                    quantity
                ) ||
                !Number.isFinite(
                    price
                )
            ) {

                return total;

            }


            return (
                total +
                (
                    quantity *
                    price
                )
            );

        },
        0
    );

}


// ==========================================================
// SYNC CART TOTAL
// ==========================================================
//
// Calculates the current total from cart.items and stores
// the result in:
//
//     cart.totalPrice
//
// This is the important part that prevents the database
// cart total from remaining 0 while the cart contains items.
//
// ==========================================================

async function syncCartTotal(
    cart,
    session = null
) {

    if (!cart) {

        return cart;

    }


    const calculatedTotal =
        calculateTotal(
            cart
        );


    // ------------------------------------------------------
    // Store the calculated total on the cart document.
    // ------------------------------------------------------

    cart.totalPrice =
        calculatedTotal;


    // ------------------------------------------------------
    // Attach transaction session when supplied.
    // ------------------------------------------------------

    if (session) {

        cart.$session(
            session
        );

    }


    await cart.save();


    return cart;

}


// ==========================================================
// GET OR CREATE CART
// ==========================================================

async function getOrCreateCart(
    req,
    session = null
) {

    const userId =
        getLoggedInUserId(
            req
        );


    if (!userId) {

        throw new Error(
            "You must be logged in to use the cart."
        );

    }


    // ------------------------------------------------------
    // Resolve optional active substation ID.
    // ------------------------------------------------------

    const activeSubstationId =
        await getOptionalCartSubstation(
            req
        );


    // ------------------------------------------------------
    // Find existing cart.
    // ------------------------------------------------------

    let cart =
        await Cart.findOne({
            user: userId
        }).session(
            session || null
        );


    // ======================================================
    // CREATE NEW CART
    // ======================================================

    if (!cart) {

        const cartData = {

            user:
                userId,

            items:
                [],

            totalPrice:
                0,

            isMobile:
                true

        };


        // --------------------------------------------------
        // Only add cartSubstation when supplied.
        // --------------------------------------------------

        if (activeSubstationId) {

            cartData.cartSubstation =
                new mongoose.Types.ObjectId(
                    activeSubstationId
                );

        }


        cart =
            new Cart(
                cartData
            );


        if (session) {

            cart.$session(
                session
            );

        }


        await cart.save();


        return cart;

    }


    // ======================================================
    // EXISTING CART
    // ======================================================

    // ------------------------------------------------------
    // Apply optional active substation.
    // ------------------------------------------------------

    if (activeSubstationId) {

        const currentSubstationId =
            cart.cartSubstation
                ? String(
                    cart.cartSubstation
                )
                : "";


        const newSubstationId =
            String(
                activeSubstationId
            );


        if (
            currentSubstationId !==
            newSubstationId
        ) {

            cart.cartSubstation =
                new mongoose.Types.ObjectId(
                    activeSubstationId
                );


            if (session) {

                cart.$session(
                    session
                );

            }


            await cart.save();

        }

    }


    // ------------------------------------------------------
    // Synchronize total.
    //
    // This also repairs an existing cart whose totalPrice
    // is currently 0 or stale.
    // ------------------------------------------------------

    await syncCartTotal(
        cart,
        session
    );


    return cart;

}


// ==========================================================
// GET CART
// ==========================================================
//
// Retrieves the user's existing cart.
//
// If no cart exists:
//     create one.
//
// The cart total is synchronized before returning.
//
// ==========================================================

async function getCart(
    req
) {

    const userId =
        getLoggedInUserId(
            req
        );


    if (!userId) {

        throw new Error(
            "You must be logged in to use the cart."
        );

    }


    let cart =
        await Cart.findOne({
            user: userId
        });


    // ------------------------------------------------------
    // No cart yet.
    // ------------------------------------------------------

    if (!cart) {

        return getOrCreateCart(
            req
        );

    }


    // ------------------------------------------------------
    // Apply optional active substation.
    // ------------------------------------------------------

    await applyOptionalCartSubstation(
        req,
        cart
    );


    // ------------------------------------------------------
    // Recalculate and save total.
    //
    // This is what fixes stale/zero cart.totalPrice.
    // ------------------------------------------------------

    await syncCartTotal(
        cart
    );


    return cart;

}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    getOrCreateCart,

    getCart,

    calculateTotal,

    syncCartTotal

};