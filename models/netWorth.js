const mongoose = require("mongoose");


/* =========================================================
   NET WORTH ASSET SCHEMA
========================================================= */

const netWorthSchema = new mongoose.Schema(

  {

    /* =====================================================
       ITEM

       Dairy asset:
           Populated from Dairy.name.

       Manual structure asset:
           Stored directly in NetWorth.
    ===================================================== */

    item: {

      type: String,

      required: true,

      trim: true

    },


    /* =====================================================
       TYPE

       Dairy asset:
           Derived from Dairy.code.

           code > 0
               cow

           code < 0
               dairy Facility

       Manual asset:
           Entered manually.
    ===================================================== */

    type: {

      type: String,

      required: true,

      trim: true

    },


    /* =====================================================
       BUYING PRICE
    ===================================================== */

    buyingPrice: {

      type: Number,

      default: 0,

      min: 0

    },


    /* =====================================================
       CURRENT WORTH
    ===================================================== */

    currentWorth: {

      type: Number,

      default: 0,

      min: 0

    },


    /* =====================================================
       DESCRIPTION
    ===================================================== */

    description: {

      type: String,

      trim: true,

      default: ""

    },


    /* =====================================================
       CONDITION
    ===================================================== */

    condition: {

      type: String,

      trim: true,

      default: ""

    },


    /* =====================================================
       LOCATION
    ===================================================== */

    location: {

      type: String,

      trim: true,

      default: ""

    },


    /* =====================================================
       ACQUISITION DATE
       
       Dairy:
           Dairy.createdAt

       Manual:
           Date created.
    ===================================================== */

    acquisitionDate: {

      type: Date,

      required: true

    },


    /* =====================================================
       VALUATION DATE
    ===================================================== */

    valuationDate: {

      type: Date,

      default: null

    },


    /* =====================================================
       STATUS
    ===================================================== */

    status: {

      type: String,

      enum: [

        "active",

        "sold",

        "disposed",

        "inactive"

      ],

      default: "active",

      index: true

    },


    /* =====================================================
       SOURCE

       dairy:
           Generated from Dairy.

       structure:
           Manually created NetWorth asset.
    ===================================================== */

    source: {

      type: String,

      enum: [

        "dairy",

        "structure"

      ],

      required: true,

      index: true

    },


    /* =====================================================
       SOURCE ID

       Dairy:
           Points to Dairy document.

       Manual:
           null.
    ===================================================== */

    sourceId: {

      type: mongoose.Schema.Types.ObjectId,

      ref: "Dairy",

      default: null,

      index: true

    },


    /* =====================================================
       PARENT STRUCTURE

       Points to the NetWorth representation of a
       Dairy structure.

       Example:

           Cow
             ↓
           parentStructure
             ↓
           NetWorth structure asset
    ===================================================== */

    parentStructure: {

      type: mongoose.Schema.Types.ObjectId,

      ref: "NetWorth",

      default: null,

      index: true

    },


    /* =====================================================
       STRUCTURE CODE

       For a Dairy animal assigned to a structure:

           Dairy.code       = 25
           Dairy.assetCode  = -10

           NetWorth.structureCode = -10

       For standalone Dairy assets:
           null

       For manual structure assets:
           structure's Dairy code.
    ===================================================== */

    structureCode: {

      type: Number,

      default: null,

      index: true

    }

  },

  {

    timestamps: true,

    minimize: false

  }

);


/* =========================================================
   VIRTUAL
   CURRENT ASSET VALUE
========================================================= */

netWorthSchema.virtual("assetValue").get(function () {

  return Number(this.currentWorth) || 0;

});


/* =========================================================
   STATIC
   CALCULATE TOTAL NET WORTH
========================================================= */

netWorthSchema.statics.calculateNetWorth = async function () {

  const result =
    await this.aggregate([

      {

        $match: {

          status: "active"

        }

      },

      {

        $group: {

          _id: null,

          totalNetWorth: {

            $sum: "$currentWorth"

          }

        }

      }

    ]);


  return result.length

    ? result[0].totalNetWorth

    : 0;

};


/* =========================================================
   STATIC
   TOTAL CURRENT WORTH
========================================================= */

netWorthSchema.statics.getTotalCurrentWorth =
  async function () {

    return this.calculateNetWorth();

  };


/* =========================================================
   INDEXES
========================================================= */


/* ---------------------------------------------------------
   Structure assets
--------------------------------------------------------- */

netWorthSchema.index({

  parentStructure: 1,

  status: 1

});


/* ---------------------------------------------------------
   Dairy source records
--------------------------------------------------------- */

netWorthSchema.index({

  source: 1,

  sourceId: 1

});


/* ---------------------------------------------------------
   Structure code
--------------------------------------------------------- */

netWorthSchema.index({

  structureCode: 1,

  status: 1

});


/* =========================================================
   EXPORT
========================================================= */

module.exports = mongoose.model(

  "NetWorth",

  netWorthSchema

);