// ==========================================================
// verrah/models/carts.js
//
// VERRAH COSMETICS
// CART MODEL
// ==========================================================

const mongoose = require("mongoose");


// ==========================================================
// CART ITEM SCHEMA
// ==========================================================

const cartItemSchema =
    new mongoose.Schema(
        {

            // ------------------------------------------------
            // Product reference
            // ------------------------------------------------

            product: {
                type:
                    mongoose.Schema.Types.ObjectId,

                ref:
                    "Product"
            },


            // ------------------------------------------------
            // Product ID snapshot
            //
            // cartService uses this value when identifying
            // cart items and processing sales.
            // ------------------------------------------------

            productId: {
                type:
                    String,

                required:
                    true
            },


            // ------------------------------------------------
            // Product name snapshot
            // ------------------------------------------------

            name: {
                type:
                    String,

                required:
                    true,

                trim:
                    true
            },


            // ------------------------------------------------
            // Selling price snapshot
            // ------------------------------------------------

            price: {
                type:
                    Number,

                required:
                    true,

                min:
                    0
            },


            // ------------------------------------------------
            // Product image snapshot
            // ------------------------------------------------

            image: {
                type:
                    String,

                default:
                    ""
            },


            // ------------------------------------------------
            // Quantity
            // ------------------------------------------------

            qty: {
                type:
                    Number,

                required:
                    true,

                min:
                    1,

                validate: {
                    validator:
                        Number.isInteger,

                    message:
                        "Cart quantity must be a whole number."
                }
            }

        },
        {
            _id:
                true
        }
    );


// ==========================================================
// CART SCHEMA
// ==========================================================

const cartSchema =
    new mongoose.Schema(
        {

            // ------------------------------------------------
            // SESSION ID
            //
            // Used for guest/session carts.
            //
            // A logged-in user's permanent cart is identified
            // by the user field.
            // ------------------------------------------------

            sessionId: {
                type:
                    String,

                default:
                    null,

                index:
                    true
            },


            // ------------------------------------------------
            // USER
            //
            // The customer's persistent cart owner.
            //
            // This allows the cart to survive logout/login.
            // ------------------------------------------------

            user: {
                type:
                    mongoose.Schema.Types.ObjectId,

                ref:
                    "User",

                default:
                    null,

                index:
                    true
            },


            // ------------------------------------------------
            // CART ITEMS
            // ------------------------------------------------

            items: {
                type:
                    [cartItemSchema],

                default:
                    []
            }

        },
        {
            timestamps:
                true
        }
    );


// ==========================================================
// INDEXES
// ==========================================================
//
// Do NOT make sessionId unique.
//
// A session can be associated with a cart and later the cart
// can become a user's persistent cart.
//
// The user index is intentionally not unique here because
// existing database records may contain duplicate/legacy
// carts from the previous session-based implementation.
// ==========================================================

cartSchema.index({
    user:
        1
});

cartSchema.index({
    sessionId:
        1
});


// ==========================================================
// MODEL
// ==========================================================

module.exports =
    mongoose.model(
        "Cart",
        cartSchema
    );