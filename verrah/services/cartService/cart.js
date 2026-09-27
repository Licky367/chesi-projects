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
// - Populating cartSubstation for EJS
//
// IMPORTANT:
//
// cartSubstation is STORED as the Substation ObjectId.
//
// When the cart is returned from this service:
//
//     cart.cartSubstation
//
// is populated with:
//
//     _id
//     name
//
// Therefore EJS can use:
//
//     cart.cartSubstation.name
//
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
// DO NOT resolve the name here.
//
// The name is populated separately when the cart is returned.
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
//
// This function works with the raw ObjectId value.
//
// IMPORTANT:
//
// Do not populate cartSubstation before calling this
// function.
//
// Otherwise:
//
//     String(cart.cartSubstation)
//
// would operate on a populated document instead of the ID.
//
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
    // Leave existing cartSubstation untouched.
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
    // Only update when the substation changed.
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
// Cart items use:
//
//     qty
//
// The older `quantity` field is also supported.
//
// Price uses:
//
//     price
//
// `unitSellPrice` is supported as a fallback.
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


            const quantity =
                Number(
                    item.qty ??
                    item.quantity ??
                    0
                );


            const price =
                Number(
                    item.price ??
                    item.unitSellPrice ??
                    0
                );


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
// Calculates the current cart total and stores it in:
//
//     cart.totalPrice
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


    cart.totalPrice =
        calculatedTotal;


    if (session) {

        cart.$session(
            session
        );

    }


    await cart.save();


    return cart;

}


// ==========================================================
// POPULATE CART SUBSTATION
// ==========================================================
//
// cartSubstation remains an ObjectId in MongoDB.
//
// This function only populates the returned Mongoose
// document so controllers and EJS can access:
//
//     cart.cartSubstation._id
//
//     cart.cartSubstation.name
//
// Only the fields required here are selected.
// ==========================================================

async function populateCartSubstation(
    cart
) {

    if (!cart) {

        return cart;

    }


    // ------------------------------------------------------
    // If there is no cartSubstation, there is nothing to
    // populate.
    // ------------------------------------------------------

    if (!cart.cartSubstation) {

        return cart;

    }


    // ------------------------------------------------------
    // Populate the existing Mongoose document.
    // ------------------------------------------------------

    await cart.populate({
        path:
            "cartSubstation",

        select:
            "_id name"
    });


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
// If activeSubstationId is supplied:
//     save it as cartSubstation.
//
// The returned cart has cartSubstation populated so EJS
// receives the substation name.
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
    // ------------------------------------------------------

    const activeSubstationId =
        await getOptionalCartSubstation(
            req
        );


    // ------------------------------------------------------
    // Find existing cart.
    //
    // IMPORTANT:
    //
    // Do NOT populate here yet.
    //
    // applyOptionalCartSubstation() needs the raw ObjectId.
    // ------------------------------------------------------

    let cart =
        await Cart.findOne({
            user:
                userId
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
        // Save cartSubstation only when supplied.
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


        // --------------------------------------------------
        // Populate the substation for the caller/EJS.
        // --------------------------------------------------

        await populateCartSubstation(
            cart
        );


        return cart;

    }


    // ======================================================
    // EXISTING CART
    // ======================================================

    // ------------------------------------------------------
    // Apply active substation only when supplied.
    //
    // cartSubstation is still an ObjectId at this point.
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
    // ------------------------------------------------------

    await syncCartTotal(
        cart,
        session
    );


    // ------------------------------------------------------
    // Populate cartSubstation AFTER all ID operations.
    // ------------------------------------------------------

    await populateCartSubstation(
        cart
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
//     create one through getOrCreateCart()
//
// If activeSubstationId was supplied:
//     update cartSubstation.
//
// Before returning:
//
//     cart.totalPrice
//
// is synchronized.
//
// Then:
//
//     cart.cartSubstation
//
// is populated with the substation name.
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


    // ------------------------------------------------------
    // Get the raw cart first.
    // ------------------------------------------------------

    let cart =
        await Cart.findOne({
            user:
                userId
        });


    // ------------------------------------------------------
    // No cart exists.
    // ------------------------------------------------------

    if (!cart) {

        return getOrCreateCart(
            req
        );

    }


    // ------------------------------------------------------
    // Apply optional active substation.
    //
    // This happens BEFORE population.
    // ------------------------------------------------------

    await applyOptionalCartSubstation(
        req,
        cart
    );


    // ------------------------------------------------------
    // Synchronize cart total.
    // ------------------------------------------------------

    await syncCartTotal(
        cart
    );


    // ------------------------------------------------------
    // Populate cartSubstation.
    //
    // EJS can now use:
    //
    //     cart.cartSubstation.name
    //
    // ------------------------------------------------------

    await populateCartSubstation(
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

    syncCartTotal,

    populateCartSubstation

};