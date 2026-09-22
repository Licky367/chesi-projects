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
// Body takes priority because POST forms such as
// addManyToCart explicitly carry the selected substation.
//
// IMPORTANT:
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
    // Verify that the supplied substation ID exists.
    //
    // IMPORTANT:
    //
    // We do NOT retrieve the name.
    //
    // The ID itself is what gets stored in the cart.
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
//
// This function only changes cartSubstation when an active
// substation was actually supplied.
//
// Therefore:
//
//     activeSubstation supplied
//         -> cartSubstation = active substation ID
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

    const activeSubstationId =
        await getOptionalCartSubstation(
            req
        );


    // ------------------------------------------------------
    // No active substation supplied.
    //
    // Do NOT make it compulsory.
    // Do NOT overwrite an existing cartSubstation.
    // ------------------------------------------------------

    if (!activeSubstationId) {

        return cart;

    }


    // ------------------------------------------------------
    // Save the SUBSTATION ID directly.
    //
    // NEVER save the substation name here.
    // ------------------------------------------------------

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
    // Only save when the active substation actually changed.
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
// GET OR CREATE CART
// ==========================================================
//
// Finds the logged-in user's cart.
//
// If it does not exist:
//     create it.
//
// If activeSubstationId was supplied:
//     save that ID as cartSubstation.
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
    // Resolve optional active substation ID.
    //
    // This happens before cart creation so the value can
    // be included directly when creating a new cart.
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

            isMobile:
                true

        };


        // --------------------------------------------------
        // Only add cartSubstation when an active substation
        // was actually supplied.
        //
        // Store the ID directly.
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


        // --------------------------------------------------
        // Avoid unnecessary database writes when the cart
        // already contains the correct substation ID.
        // --------------------------------------------------

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