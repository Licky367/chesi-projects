const mongoose = require("mongoose");


/* =========================================================
   NET WORTH ASSET SCHEMA
========================================================= */

const netWorthSchema = new mongoose.Schema(

  {

    /* =====================================================
       ITEM

       Dairy asset:
       Automatically populated from Dairy.name.

       Manual structure asset:
       Entered by the user.
    ===================================================== */

    item: {

      type: String,

      required: true,

      trim: true

    },


    /* =====================================================
       TYPE

       Dairy positive-code asset:
           cow

       Dairy negative-code asset:
           dairy Facility

       Manual structure asset:
           User-defined type.
    ===================================================== */

    type: {

      type: String,

      required: true,

      trim: true

    },


    /* =====================================================
       ASSET CODE

       THIS FIELD IS ONLY FOR DAIRY POSITIVE-CODE ASSETS.

       Example:

           Dairy.code = 25
           Dairy.name = "Bella"

       NetWorth:

           source = "dairy"
           assetCode = 25

       Structures and manually-created assets MUST NOT
       have an assetCode.

       The value is the original Dairy.code of the
       positive-code Dairy record.
    ===================================================== */

    assetCode: {

      type: Number,

      default: null,

      index: true

    },


    /* =====================================================
       BUYING PRICE

       Dairy-generated assets:
           Default = 0.

       User may update from frontend.

       Manual assets:
           Supplied by user.
    ===================================================== */

    buyingPrice: {

      type: Number,

      default: 0,

      min: 0

    },


    /* =====================================================
       CURRENT WORTH

       Current value of the asset.

       This is the value used for net-worth calculation.

       Dairy-generated assets:
           Initially 0.

       User may update from frontend.
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

       Dairy-generated asset:
           Dairy.createdAt.

       Manual structure asset:
           Time the user saves the asset.
    ===================================================== */

    acquisitionDate: {

      type: Date,

      required: true

    },


    /* =====================================================
       VALUATION DATE

       Date on which currentWorth was last evaluated.
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
           Automatically generated from Dairy.

       structure:
           Manually created asset belonging to a structure.
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

       For Dairy-generated assets, points to the original
       Dairy document.

       Manual assets have no Dairy source.
    ===================================================== */

    sourceId: {

      type: mongoose.Schema.Types.ObjectId,

      ref: "Dairy",

      default: null,

      index: true

    },


    /* =====================================================
       PARENT STRUCTURE

       Points to the NetWorth record representing the
       structure containing this asset.

       NULL means the asset is standalone.

       Examples:

       Standalone cow:
           parentStructure = null

       Cow inside structure:
           parentStructure = structure._id

       Structure:
           parentStructure = null

       Manual asset inside structure:
           parentStructure = structure._id
    ===================================================== */

    parentStructure: {

      type: mongoose.Schema.Types.ObjectId,

      ref: "NetWorth",

      default: null,

      index: true

    },


    /* =====================================================
       STRUCTURE CODE

       Stores the Dairy.code of the structure containing
       the asset.

       Example:

           Structure Dairy.code = -10

       Cow:

           assetCode = 25
           structureCode = -10

       Standalone cow:

           assetCode = 25
           structureCode = null

       Structure:

           structureCode = null

       Manual structure asset:

           structureCode = structure's Dairy.code
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

   Net worth is simply:

       SUM(currentWorth)

   Only active assets are included.
========================================================= */

netWorthSchema.statics.calculateNetWorth = async function () {

  const result = await this.aggregate([

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
   CALCULATE TOTAL CURRENT WORTH
========================================================= */

netWorthSchema.statics.getTotalCurrentWorth =
  async function () {

    return this.calculateNetWorth();

  };


/* =========================================================
   INDEXES
========================================================= */


/* ---------------------------------------------------------
   Find assets belonging to a structure
--------------------------------------------------------- */

netWorthSchema.index({

  parentStructure: 1,

  status: 1

});


/* ---------------------------------------------------------
   Find Dairy-generated assets
--------------------------------------------------------- */

netWorthSchema.index({

  source: 1,

  sourceId: 1

});


/* ---------------------------------------------------------
   Find assets by asset code

   Primarily useful for positive-code Dairy assets.
--------------------------------------------------------- */

netWorthSchema.index({

  assetCode: 1

});


/* ---------------------------------------------------------
   Find assets by structure code
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