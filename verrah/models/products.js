// ==========================================================
// verrah/models/products.js
// PRODUCT MODEL
// ==========================================================

const mongoose = require("mongoose");


// ==========================================================
// DIRECTIONS OF USE ITEM
// ==========================================================

const directionsOfUseItemSchema = new mongoose.Schema(
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

const directionsOfUseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      default: ""
    },

    items: {
      type: [directionsOfUseItemSchema],
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

const productSchema = new mongoose.Schema(
  {

    // ========================================================
    // STOCK
    // ========================================================
    //
    // Product belongs to a Stock record.
    //
    // ========================================================

    stock: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stock",
      required: true,
      index: true
    },


    // ========================================================
    // PRODUCT NAME
    // ========================================================

    name: {
      type: String,
      required: true,
      trim: true,
      index: true
    },


    // ========================================================
    // CATEGORY
    // ========================================================
    //
    // DATABASE:
    //
    // Product.category stores Category._id.
    //
    // FRONTEND:
    //
    // The ObjectId is resolved by productService.
    //
    // The frontend receives:
    //
    //     categoryName
    //
    // instead of:
    //
    //     category._id
    //
    // ========================================================

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true
    },


    // ========================================================
    // SUBCATEGORY
    // ========================================================

    subcategory: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true
    },


    // ========================================================
    // DELIVERY DAYS
    // ========================================================

    days: {
      type: Number,
      required: true,
      min: 0,
      default: 1
    },


    // ========================================================
    // IMAGE
    // ========================================================

    image: {
      type: String,
      trim: true,
      default: ""
    },


    // ========================================================
    // AVAILABLE UNITS
    // ========================================================

    units: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },


    // ========================================================
    // BUY PRICE
    // ========================================================

    buyPrice: {
      type: Number,
      min: 0,
      default: 0
    },


    // ========================================================
    // SELLING PRICE
    // ========================================================

    unitSellPrice: {
      type: Number,
      required: true,
      min: 0
    },


    // ========================================================
    // DESCRIPTION
    // ========================================================

    description: {
      type: String,
      trim: true,
      default: ""
    },


    // ========================================================
    // DIRECTIONS OF USE
    // ========================================================

    directionsOfUse: {
      type: directionsOfUseSchema,
      default: undefined
    },


    // ========================================================
    // SUBSTATION
    // ========================================================

    substation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Substation",
      default: null,
      index: true
    },


    // ========================================================
    // ACTIVE STATUS
    // ========================================================

    isActive: {
      type: Boolean,
      default: true,
      index: true
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
  isActive: 1
});

productSchema.index({
  category: 1,
  subcategory: 1,
  name: 1
});


// ==========================================================
// EXPORT
// ==========================================================

module.exports = mongoose.model(
  "Product",
  productSchema
);