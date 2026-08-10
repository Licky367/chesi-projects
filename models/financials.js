// ==========================================================
// models/financials.js
// ==========================================================

const mongoose = require("mongoose");


// ==========================================================
// CONSTANTS
// ==========================================================

const FINANCIAL_TYPES = [

    "liability"

];


// ==========================================================
// SCHEMA
// ==========================================================

const financialSchema = new mongoose.Schema(

    {

        // ==================================================
        // DAIRY / ASSET
        //
        // The specific Dairy record to which this financial
        // transaction belongs.
        //
        // This can be:
        //
        // Negative code:
        //     Dairy Farm
        //
        // Positive code:
        //     Animal
        //
        // Null code:
        //     Structure / Facility / Equipment
        //
        // A farm itself can therefore have liabilities,
        // independently from the assets inside the farm.
        // ==================================================

        dairy: {

            type:
                mongoose.Schema.Types.ObjectId,

            ref: "Dairy",

            required: true,

            index: true

        },


        // ==================================================
        // DAIRY CODE
        //
        // Snapshot of the Dairy code when the transaction
        // was recorded.
        //
        // This is NOT the primary relationship.
        //
        // The `dairy` ObjectId above remains authoritative.
        // ==================================================

        dairyCode: {

            type: Number,

            default: null

        },


        // ==================================================
        // FINANCIAL TYPE
        //
        // Currently only liability is supported.
        //
        // This leaves room for future financial transaction
        // types without redesigning the model.
        // ==================================================

        type: {

            type: String,

            enum: FINANCIAL_TYPES,

            default: "liability",

            required: true,

            index: true

        },


        // ==================================================
        // LIABILITY AMOUNT
        //
        // Amount of the liability transaction.
        // ==================================================

        amount: {

            type: Number,

            required: true,

            min: 0

        },


        // ==================================================
        // DESCRIPTION
        //
        // Explanation of what the liability represents.
        // ==================================================

        description: {

            type: String,

            trim: true,

            required: true

        },


        // ==================================================
        // RECORDED BY
        //
        // User who recorded the financial transaction.
        // ==================================================

        recordedBy: {

            type:
                mongoose.Schema.Types.ObjectId,

            ref: "User",

            required: true,

            index: true

        },


        // ==================================================
        // RECORDED BY NAME
        //
        // Snapshot of the user's name at the time the
        // liability was recorded.
        //
        // This allows historical records to continue showing
        // the recorder's name even if the user's profile
        // changes later.
        // ==================================================

        recordedByName: {

            type: String,

            trim: true,

            default: ""

        }

    },

    {

        // ==================================================
        // TIMESTAMPS
        //
        // createdAt:
        //     When the liability was recorded.
        //
        // updatedAt:
        //     When the financial record was last changed.
        // ==================================================

        timestamps: true,

        minimize: false

    }

);


// ==========================================================
// INDEXES
// ==========================================================


// ==========================================================
// DAIRY + TYPE
//
// Useful when calculating all liabilities belonging to a
// particular Dairy.
// ==========================================================

financialSchema.index({

    dairy: 1,

    type: 1

});


// ==========================================================
// DAIRY + CREATED AT
//
// Useful for date-range financial reporting.
// ==========================================================

financialSchema.index({

    dairy: 1,

    createdAt: -1

});


// ==========================================================
// TYPE + CREATED AT
//
// Useful for lifetime and date-filtered liability reports.
// ==========================================================

financialSchema.index({

    type: 1,

    createdAt: -1

});


// ==========================================================
// RECORDED BY + CREATED AT
//
// Useful for audit/history reporting.
// ==========================================================

financialSchema.index({

    recordedBy: 1,

    createdAt: -1

});


// ==========================================================
// STATIC: GET FINANCIAL TYPES
// ==========================================================

financialSchema.statics.getFinancialTypes =
function() {

    return [

        ...FINANCIAL_TYPES

    ];

};


// ==========================================================
// MODEL
// ==========================================================

const Financials =

    mongoose.models.Financials ||

    mongoose.model(

        "Financials",

        financialSchema

    );


// ==========================================================
// CONSTANT EXPORT
// ==========================================================

Financials.FINANCIAL_TYPES =

    FINANCIAL_TYPES;


// ==========================================================
// EXPORT
// ==========================================================

module.exports = Financials;