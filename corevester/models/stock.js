const mongoose = require("mongoose");

const STOCK_CATEGORIES = [
  "Diagnostic Equipment",
  "Hospital Furniture",
  "Laboratory Equipment",
  "Surgical Equipment"
];

const stockSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true
    },

    category: {
      type: String,
      required: true,
      trim: true,
      enum: STOCK_CATEGORIES,
      index: true
    },

    subcategory: {
      type: String,
      required: true,
      trim: true,
      index: true
    },

    days: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },

    image: {
      type: String,
      trim: true,
      default: ""
    },

    units: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },

    buyPrice: {
      type: Number,
      min: 0,
      default: 0
    },

    description: {
      type: String,
      default: ""
    },

    // NEW FIELD
    directionsOfUse: {
      title: {
        type: String,
        trim: true,
        default: ""
      },
      items: [
        {
          subtitle: {
            type: String,
            required: true,
            trim: true
          },
          content: {
            type: String,
            required: true,
            trim: true
          },
          _id: false
        }
      ]
    },

    cashOutflow: {
      type: Number,
      min: 0,
      default: 0
    },

    categoryOveral: {
      type: Number,
      min: 0,
      default: 0
    },

    overal: {
      type: Number,
      min: 0,
      default: 0
    },

    totalsUpdatedAt: {
      type: Date,
      default: Date.now
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

stockSchema.index({ category: 1, subcategory: 1 });
stockSchema.statics.CATEGORIES = STOCK_CATEGORIES;

module.exports = mongoose.model("Stock", stockSchema);