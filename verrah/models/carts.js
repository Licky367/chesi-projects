const mongoose = require("mongoose");


/* ==========================================================
   CART ITEM SCHEMA
========================================================== */

const cartItemSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },

        productId: {
            type: String,
            required: true
        },

        name: {
            type: String,
            required: true,
            trim: true
        },

        price: {
            type: Number,
            required: true,
            min: 0
        },

        image: {
            type: String,
            default: ""
        },

        qty: {
            type: Number,
            required: true,
            min: 1,
            default: 1
        }
    },
    {
        _id: true
    }
);


/* ==========================================================
   CART SCHEMA
========================================================== */

const cartSchema = new mongoose.Schema(
    {
        /*
         * Logged-in user's permanent cart identity.
         *
         * The current cart service searches:
         *
         *     Cart.findOne({ user: userId })
         *
         * so this field must exist in the model.
         */
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },


        /*
         * Session identity used by the current cart service
         * for guest carts and legacy/session fallback.
         */
        sessionId: {
            type: String,
            default: null,
            index: true
        },


        /*
         * Products currently inside the cart.
         */
        items: {
            type: [cartItemSchema],
            default: []
        },


        /*
         * Calculated cart total.
         */
        totalPrice: {
            type: Number,
            required: true,
            default: 0,
            min: 0
        }
    },
    {
        timestamps: true
    }
);


/* ==========================================================
   USER CART INDEX
========================================================== */

/*
 * A logged-in user should have only one persistent cart.
 *
 * sparse allows guest carts where user is null.
 */
cartSchema.index(
    { user: 1 },
    {
        unique: true,
        sparse: true
    }
);


/* ==========================================================
   CALCULATE CART TOTAL
========================================================== */

cartSchema.pre("save", function (next) {
    this.totalPrice =
        this.items.reduce(
            (total, item) => {
                return (
                    total +
                    Number(item.price || 0) *
                    Number(item.qty || 0)
                );
            },
            0
        );

    next();
});


/* ==========================================================
   MODEL
========================================================== */

const Cart = mongoose.model(
    "Cart",
    cartSchema
);


module.exports = Cart;