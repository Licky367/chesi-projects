const mongoose = require("mongoose");


/* ==========================================================
   CART ITEM SCHEMA
========================================================== */

const cartItemSchema = new mongoose.Schema(
    {
        /* --------------------------------------------------
           PRODUCT
        -------------------------------------------------- */

        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },


        /* --------------------------------------------------
           PRODUCT ID

           Kept because the current cart/package/payment
           services use item.productId.
        -------------------------------------------------- */

        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },


        /* --------------------------------------------------
           PRODUCT NAME
        -------------------------------------------------- */

        name: {
            type: String,
            required: true,
            trim: true
        },


        /* --------------------------------------------------
           PRODUCT IMAGE
        -------------------------------------------------- */

        image: {
            type: String,
            default: ""
        },


        /* --------------------------------------------------
           PRICE AT TIME OF ADDING TO CART
        -------------------------------------------------- */

        price: {
            type: Number,
            required: true,
            min: 0
        },


        /* --------------------------------------------------
           QUANTITY

           qty is the field used by the current cart,
           package and payment services.
        -------------------------------------------------- */

        qty: {
            type: Number,
            required: true,
            min: [
                1,
                "Quantity cannot be less than 1."
            ],
            default: 1
        },


        /* --------------------------------------------------
           QUANTITY COMPATIBILITY FIELD

           Kept so existing/new code that expects
           item.quantity can still work.
        -------------------------------------------------- */

        quantity: {
            type: Number,
            min: [
                1,
                "Quantity cannot be less than 1."
            ],
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
        /* --------------------------------------------------
           LOGGED-IN USER

           One user can have one cart.
        -------------------------------------------------- */

        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },


        /* --------------------------------------------------
           SESSION ID

           Used for identifying the cart during the current
           browser/session.

           IMPORTANT:
           index: true is used here.

           Do NOT also call:
           cartSchema.index({ sessionId: 1 })

           because that creates a duplicate index warning.
        -------------------------------------------------- */

        sessionId: {
            type: String,
            default: null,
            index: true
        },


        /* --------------------------------------------------
           CART ITEMS
        -------------------------------------------------- */

        items: {
            type: [cartItemSchema],
            default: []
        },


        /* --------------------------------------------------
           TOTAL CART VALUE
        -------------------------------------------------- */

        totalPrice: {
            type: Number,
            required: true,
            min: 0,
            default: 0
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
 * A logged-in user can have only one cart.
 *
 * sparse: true is important because guest carts have
 * user = null and should not violate the unique index.
 */

cartSchema.index(
    {
        user: 1
    },
    {
        unique: true,
        sparse: true
    }
);


/* ==========================================================
   CALCULATE TOTAL BEFORE SAVE
========================================================== */

cartSchema.pre("save", function (next) {

    this.totalPrice =
        this.items.reduce(
            (total, item) => {

                const price =
                    Number(
                        item.price || 0
                    );

                /*
                 * Current services use qty.
                 * quantity is retained for compatibility.
                 */

                const quantity =
                    Number(
                        item.qty ||
                        item.quantity ||
                        0
                    );

                return (
                    total +
                    price * quantity
                );
            },
            0
        );


    next();
});


/* ==========================================================
   MODEL
========================================================== */

const Cart =
    mongoose.model(
        "Cart",
        cartSchema
    );


/* ==========================================================
   EXPORT
========================================================== */

module.exports = Cart;