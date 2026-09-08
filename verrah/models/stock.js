const mongoose = require("mongoose");

// ==========================================================
// COSMETICS INDUSTRY CATEGORIES
// ==========================================================

const COSMETICS_CATEGORIES = [
  "skincare",
  "haircare",
  "body care",
  "makeup",
  "fragrance",
  "personal care",
  "bath and shower",
  "oral care",
  "sun care",
  "men's grooming",
  "baby care",
  "nail care",
  "beauty tools",
  "cosmetic accessories",
  "professional beauty",
  "spa and wellness",
  "dermatological cosmetics",
  "natural and organic cosmetics",
  "clean beauty",
  "cosmeceuticals",
  "sexual wellness",
  "gift sets",
  "travel size",
  "beauty kits",
  "other"
];

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
  { _id: false }
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
  { _id: false }
);

// ==========================================================
// STOCK SCHEMA
// ==========================================================

const stockSchema = new mongoose.Schema(
  {
    // ------------------------------------------------------
    // PRODUCT NAME
    // ------------------------------------------------------

    name: {
      type: String,
      required: true,
      trim: true,
      index: true
    },

    // ------------------------------------------------------
    // CATEGORY
    // ------------------------------------------------------
    // The category must be one of the defined cosmetics
    // industry categories above.

    category: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      enum: {
        values: COSMETICS_CATEGORIES,
        message: "{VALUE} is not a valid cosmetics category"
      },
      index: true
    },

    // ------------------------------------------------------
    // SUBCATEGORY
    // ------------------------------------------------------

    subcategory: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true
    },

    // ------------------------------------------------------
    // DAYS
    // ------------------------------------------------------

    days: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },

    // ------------------------------------------------------
    // IMAGE
    // ------------------------------------------------------

    image: {
      type: String,
      trim: true,
      default: ""
    },

    // ------------------------------------------------------
    // UNITS IN STOCK
    // ------------------------------------------------------

    units: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },

    // ------------------------------------------------------
    // BUY PRICE
    // ------------------------------------------------------

    buyPrice: {
      type: Number,
      min: 0,
      default: 0
    },

    // ------------------------------------------------------
    // DESCRIPTION
    // ------------------------------------------------------

    description: {
      type: String,
      default: ""
    },

    // ------------------------------------------------------
    // DIRECTIONS OF USE
    // ------------------------------------------------------
    // Optional instructions shown to customers on the
    // product details page.

    directionsOfUse: {
      type: directionsOfUseSchema,
      default: undefined
    },

    // ------------------------------------------------------
    // ACTIVE STATUS
    // ------------------------------------------------------

    isActive: {
      type: Boolean,
      default: true
    }
  },

  { timestamps: true }
);

// ==========================================================
// INDEXES
// ==========================================================

// Do not make this unique: legacy databases may contain
// duplicate category/subcategory combinations.

stockSchema.index({
  category: 1,
  subcategory: 1
});

// ==========================================================
// EXPORTS
// ==========================================================

module.exports = mongoose.model("Stock", stockSchema);

// Also export the category list so controllers, routes,
// EJS forms, validation, etc. can reuse the exact same list.

module.exports.COSMETICS_CATEGORIES = COSMETICS_CATEGORIES;