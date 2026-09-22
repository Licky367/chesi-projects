// ==========================================================
// verrah/models/carts.js
// VERRAH COSMETICS
// CART MODEL
//
// CART IDENTITY
//
// Every cart belongs to a logged-in user.
//
// Cart.user is the ONLY cart identity.
//
// There is NO sessionId.
// There are NO guest carts.
//
// CART SUBSTATION
//
// cartSubstation stores the ID of the active substation
// associated with the cart.
//
// This field is OPTIONAL.
//
// A cart can therefore exist without a substation when the
// route does not provide an activeSubstationId.
//
// When activeSubstationId is supplied, the cart service
// stores that substation's MongoDB ObjectId directly in
// cartSubstation.
//
// No substation name is stored in this field.
//
// CART ITEM FIELDS
//
// product
// productId
// name
// image
// price
// qty
//
// INVENTORY
//
// Adding an item to the cart DOES NOT reduce inventory.
//
// Inventory is reduced only when a sale is completed.
// ==========================================================

const mongoose = require("mongoose");


// ==========================================================
// CART ITEM SCHEMA
// ==========================================================

const cartItemSchema = new mongoose.Schema(
    {

        // --------------------------------------------------
        // PRODUCT REFERENCE
        // --------------------------------------------------

        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },


        // --------------------------------------------------
        // PRODUCT ID
        //
        // Kept explicitly because the cart, package and
        // sales services use productId when processing items.
        // --------------------------------------------------

        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },


        // --------------------------------------------------
        // PRODUCT NAME SNAPSHOT
        // --------------------------------------------------

        name: {
            type: String,
            required: true,
            trim: true
        },


        // --------------------------------------------------
        // PRODUCT IMAGE SNAPSHOT
        // --------------------------------------------------

        image: {
            type: String,
            default: ""
        },


        // --------------------------------------------------
        // SELLING PRICE SNAPSHOT
        // --------------------------------------------------

        price: {
            type: Number,
            required: true,
            min: 0
        },


        // --------------------------------------------------
        // QUANTITY
        //
        // THIS IS THE ONLY CART QUANTITY FIELD.
        //
        // Use:
        //
        //     item.qty
        //
        // throughout the cart system.
        // --------------------------------------------------

        qty: {
            type: Number,
            required: true,
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


// ==========================================================
// CART SCHEMA
// ==========================================================

const cartSchema = new mongoose.Schema(
    {

        // --------------------------------------------------
        // USER
        //
        // This is the ONLY identity of a cart.
        //
        // One user = one cart.
        // --------------------------------------------------

        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "VerrahUser",
            required: true,
            unique: true
        },


        // --------------------------------------------------
        // CART SUBSTATION
        //
        // Stores the MongoDB ObjectId of the active
        // substation associated with the cart.
        //
        // IMPORTANT:
        //
        // This is an ID, NOT the substation name.
        //
        // Example:
        //
        //     "68c123456789abcdef123456"
        //
        // When no activeSubstationId is supplied:
        //
        //     cartSubstation remains unset.
        //
        // The field is optional so routes that do not provide
        // an active substation remain valid.
        // --------------------------------------------------

        cartSubstation: {
            type: mongoose.Schema.Types.ObjectId,
            default: undefined
        },


        // --------------------------------------------------
        // MOBILE CART
        //
        // Indicates whether the cart is associated with
        // the mobile shopping experience.
        //
        // Defaults to true.
        // --------------------------------------------------

        isMobile: {
            type: Boolean,
            default: true
        },


        // --------------------------------------------------
        // CART ITEMS
        // --------------------------------------------------

        items: {
            type: [cartItemSchema],
            default: []
        },


        // --------------------------------------------------
        // TOTAL PRICE
        // --------------------------------------------------

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


// ==========================================================
// CALCULATE TOTAL BEFORE SAVE
// ==========================================================

cartSchema.pre(
    "save",
    function (next) {

        this.totalPrice =
            this.items.reduce(
                (
                    total,
                    item
                ) => {

                    const price =
                        Number(
                            item.price || 0
                        );

                    const qty =
                        Number(
                            item.qty || 0
                        );

                    return (
                        total +
                        price * qty
                    );

                },
                0
            );

        next();

    }
);


// ==========================================================
// MODEL
// ==========================================================

const Cart =
    mongoose.model(
        "Cart",
        cartSchema
    );


// ==========================================================
// EXPORT
// ==========================================================

module.exports = Cart;