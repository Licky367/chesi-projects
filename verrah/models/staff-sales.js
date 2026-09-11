// ==========================================================
// verrah/models/staff-sales.js
// STAFF SALES MODEL
// ==========================================================

const mongoose = require("mongoose");


// ==========================================================
// STAFF SALE ITEM SCHEMA
// ==========================================================

const staffSaleItemSchema =
    new mongoose.Schema(
        {

            // ------------------------------------------------
            // PRODUCT REFERENCE
            // ------------------------------------------------

            productId: {
                type:
                    mongoose.Schema.Types.ObjectId,

                ref:
                    "Product",

                required:
                    true
            },


            // ------------------------------------------------
            // PRODUCT INFORMATION SNAPSHOT
            // ------------------------------------------------

            name: {
                type:
                    String,

                required:
                    true,

                trim:
                    true
            },

            image: {
                type:
                    String,

                default:
                    ""
            },


            // ------------------------------------------------
            // CATEGORY INFORMATION
            // ------------------------------------------------

            category: {
                type:
                    String,

                default:
                    "",

                trim:
                    true
            },

            subcategory: {
                type:
                    String,

                default:
                    "",

                trim:
                    true
            },


            // ------------------------------------------------
            // QUANTITY
            // ------------------------------------------------

            qty: {
                type:
                    Number,

                required:
                    true,

                min:
                    1
            },


            // ------------------------------------------------
            // SELLING PRICE
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
            // ITEM TOTAL
            // ------------------------------------------------

            total: {
                type:
                    Number,

                required:
                    true,

                min:
                    0
            }

        },

        {
            _id:
                false
        }
    );


// ==========================================================
// STAFF SALE SCHEMA
// ==========================================================

const staffSaleSchema =
    new mongoose.Schema(
        {

            // ------------------------------------------------
            // SALES NAME
            // ------------------------------------------------

            salesName: {
                type:
                    String,

                required:
                    true,

                trim:
                    true,

                maxlength:
                    150
            },


            // ------------------------------------------------
            // PRODUCTS SOLD
            // ------------------------------------------------

            products: {
                type:
                    [staffSaleItemSchema],

                default:
                    []
            },


            // ------------------------------------------------
            // TOTAL AMOUNT
            // ------------------------------------------------

            totalAmount: {
                type:
                    Number,

                required:
                    true,

                min:
                    0
            },


            // ------------------------------------------------
            // STAFF MEMBER WHO MADE THE SALE
            // ------------------------------------------------

            soldBy: {
                type:
                    mongoose.Schema.Types.ObjectId,

                ref:
                    "VerrahUser",

                required:
                    true
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

staffSaleSchema.index({
    soldBy: 1
});

staffSaleSchema.index({
    createdAt: -1
});

staffSaleSchema.index({
    salesName: 1
});


// ==========================================================
// EXPORT MODEL
// ==========================================================

module.exports =
    mongoose.model(
        "StaffSale",
        staffSaleSchema
    );