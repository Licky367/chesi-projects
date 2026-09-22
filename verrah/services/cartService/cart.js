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
//     -> Resolve the substation
//     -> Save its NAME as cartSubstation
//
// If NOT supplied:
//     -> Do not require it
//     -> Do not throw an error
//     -> Preserve normal cart behavior
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
// GET OPTIONAL ACTIVE SUBSTATION
// ==========================================================
//
// The active substation can come from:
//
// 1. req.body.activeSubstationId
// 2. req.query.substation
//
// Body takes priority because POST forms such as
// addManyToCart explicitly carry the selected substation.
//
// IMPORTANT:
// Neither source is compulsory.
//
// If neither exists:
//     return null
//
// If an ID is supplied:
//     resolve the actual substation name from MongoDB.
//
// We never trust a substation NAME supplied by the client.
// ==========================================================

async function getOptionalCartSubstation(req) {

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
    //
    // This is completely valid.
    // ------------------------------------------------------

    if (!activeSubstationId) {

        return null;

    }


    // ------------------------------------------------------
    // Validate ObjectId only when an ID was actually
    // supplied.
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
    // Resolve the actual substation.
    // ------------------------------------------------------

    const substation =
        await Substation
            .findById(
                activeSubstationId
            )
            .select("name")
            .lean();


    if (!substation) {

        throw new Error(
            "Active substation not found."
        );

    }


    // ------------------------------------------------------
    // Return the actual database name.
    // ------------------------------------------------------

    return {
        id:
            activeSubstationId,

        name:
            substation.name
    };

}


// ==========================================================
// APPLY OPTIONAL CART SUBSTATION
// ==========================================================
//
// This function only changes cartSubstation when an active
// substation was actually supplied.
//
// Therefore:
//
//     activeSubstation supplied
//         -> cartSubstation = actual substation name
//
//     activeSubstation NOT supplied
//         -> leave existing cartSubstation untouched
//
// This is important because many existing routes do not
// carry activeSubstationId.
// ==========================================================

async function applyOptionalCartSubstation(
    req,
    cart,
    session = null
) {

    const activeSubstation =
        await getOptionalCartSubstation(
            req
        );


    // ------------------------------------------------------
    // No active substation supplied.
    //
    // Do NOT make it compulsory.
    // Do NOT overwrite an existing cartSubstation.
    // ------------------------------------------------------

    if (!activeSubstation) {

        return cart;

    }


    // ------------------------------------------------------
    // Save the actual substation NAME.
    // ------------------------------------------------------

    cart.cartSubstation =
        activeSubstation.name;


    // ------------------------------------------------------
    // Preserve transaction/session support.
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
//
// Finds the logged-in user's cart.
//
// If it does not exist:
//     create it.
//
// If activeSubstationId was supplied:
//     save the resolved substation name.
//
// If activeSubstationId was NOT supplied:
//     continue normally.
//
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
    // Resolve optional active substation.
    //
    // This happens before cart creation so the value can
    // be included directly when creating a new cart.
    // ------------------------------------------------------

    const activeSubstation =
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

            isMobile:
                true

        };


        // --------------------------------------------------
        // Only add cartSubstation when an active substation
        // was actually supplied.
        // --------------------------------------------------

        if (
            activeSubstation &&
            activeSubstation.name
        ) {

            cartData.cartSubstation =
                activeSubstation.name;

        }


        cart =
            new Cart(
                cartData
            );


        // --------------------------------------------------
        // Attach MongoDB session if one was provided.
        // --------------------------------------------------

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
    // Only update cartSubstation when the request actually
    // contains an active substation.
    //
    // Routes without activeSubstationId leave the existing
    // cartSubstation untouched.
    // ------------------------------------------------------

    if (
        activeSubstation &&
        activeSubstation.name
    ) {

        const currentName =
            cart.cartSubstation
                ? String(
                    cart.cartSubstation
                ).trim()
                : "";


        const newName =
            String(
                activeSubstation.name
            ).trim();


        // --------------------------------------------------
        // Avoid unnecessary database writes when the
        // cart already contains the correct substation.
        // --------------------------------------------------

        if (
            currentName !==
            newName
        ) {

            cart.cartSubstation =
                newName;


            if (session) {

                cart.$session(
                    session
                );

            }


            await cart.save();

        }

    }


    return cart;

}


// ==========================================================
// GET CART
// ==========================================================
//
// Retrieves the user's existing cart.
//
// If no cart exists, create one through getOrCreateCart().
//
// This also means an optional active substation supplied on
// the request can update cartSubstation.
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


    const cart =
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
    // Apply active substation only when supplied.
    //
    // Routes without it remain completely valid.
    // ------------------------------------------------------

    await applyOptionalCartSubstation(
        req,
        cart
    );


    return cart;

}


// ==========================================================
// CALCULATE TOTAL
// ==========================================================
//
// Calculates the cart total from the cart items.
//
// Expected item structure:
//
// {
//     quantity,
//     price
// }
//
// Also supports product/unit price fields commonly present
// in the VERRAH cart.
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

            const quantity =
                Number(
                    item.quantity || 0
                );


            const price =
                Number(
                    item.price ||
                    item.unitSellPrice ||
                    0
                );


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
// EXPORTS
// ==========================================================

module.exports = {

    getOrCreateCart,

    getCart,

    calculateTotal

};