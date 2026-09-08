// ==========================================================
// verrah/models/products.js
// PRODUCT MODEL
// ==========================================================

const mongoose = require("mongoose");

// ==========================================================
// DIRECTIONS OF USE ITEM
// ==========================================================

const directionsOfUseItemSchema =
  new mongoose.Schema(
    {
      subtitle: {
        type: String,
        trim: true,
        default: ""
      },

      content: {
        type: String,
        trim: true,
        default: ""
      }
    },
    {
      _id: false
    }
  );

// ==========================================================
// DIRECTIONS OF USE
// ==========================================================

const directionsOfUseSchema =
  new mongoose.Schema(
    {
      title: {
        type: String,
        trim: true,
        default: ""
      },

      items: {
        type: [
          directionsOfUseItemSchema
        ],

        default: []
      }
    },
    {
      _id: false
    }
  );

// ==========================================================
// PRODUCT SCHEMA
// ==========================================================

const productSchema =
  new mongoose.Schema(
    {
      // ----------------------------------------------------
      // SOURCE STOCK
      //
      // Product is created from a Stock record.
      // ----------------------------------------------------

      stock: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: "Stock",

        required: true,

        index: true
      },

      // ----------------------------------------------------
      // PRODUCT NAME
      // ----------------------------------------------------

      name: {
        type: String,
        required: true,
        trim: true,
        index: true
      },

      // ----------------------------------------------------
      // CATEGORY
      //
      // References Category._id
      // ----------------------------------------------------

      category: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: "Category",

        required: true,

        index: true
      },

      // ----------------------------------------------------
      // SUBCATEGORY
      // ----------------------------------------------------

      subcategory: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        index: true
      },

      // ----------------------------------------------------
      // DAYS
      // ----------------------------------------------------

      days: {
        type: Number,
        required: true,
        min: 0,
        default: 1
      },

      // ----------------------------------------------------
      // PRODUCT IMAGE
      // ----------------------------------------------------

      image: {
        type: String,
        trim: true,
        default: ""
      },

      // ----------------------------------------------------
      // PRODUCT UNITS
      //
      // IMPORTANT:
      //
      // This is separate from Stock.units.
      //
      // Stock.units = warehouse stock
      // Product.units = units belonging to this product
      // ----------------------------------------------------

      units: {
        type: Number,
        required: true,
        min: 0,
        default: 0
      },

      // ----------------------------------------------------
      // BUY PRICE
      // ----------------------------------------------------

      buyPrice: {
        type: Number,
        min: 0,
        default: 0
      },

      // ----------------------------------------------------
      // SELLING PRICE
      // ----------------------------------------------------

      unitSellPrice: {
        type: Number,
        required: true,
        min: 0
      },

      // ----------------------------------------------------
      // DESCRIPTION
      // ----------------------------------------------------

      description: {
        type: String,
        default: ""
      },

      // ----------------------------------------------------
      // DIRECTIONS OF USE
      // ----------------------------------------------------

      directionsOfUse: {
        type: directionsOfUseSchema,
        default: undefined
      },

      // ----------------------------------------------------
      // SUBSTATION
      // ----------------------------------------------------

      substation: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: "Substation",

        default: null,

        index: true
      },

      // ----------------------------------------------------
      // ACTIVE STATUS
      // ----------------------------------------------------

      isActive: {
        type: Boolean,
        default: true
      }
    },

    {
      timestamps: true,

      toJSON: {
        virtuals: true
      },

      toObject: {
        virtuals: true
      }
    }
  );

// ==========================================================
// INDEXES
// ==========================================================

productSchema.index({
  stock: 1,
  isActive: 1
});

productSchema.index({
  category: 1,
  subcategory: 1,
  isActive: 1
});

productSchema.index({
  category: 1,
  isActive: 1
});

// ==========================================================
// EXPORT
// ==========================================================

module.exports =
  mongoose.model(
    "Product",
    productSchema
  );