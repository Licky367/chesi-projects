const mongoose = require("mongoose");

const VALID_POULTRY_TYPES = [
  "chicken",
  "duck",
  "turkey",
  "goose",
  "quail",
  "other"
];

const eggStockSchema = new mongoose.Schema(
  {
    // Type of poultry producing these eggs
    poultryType: {
      type: String,
      required: true,
      trim: true,
      enum: VALID_POULTRY_TYPES
    },

    // Total eggs available for this poultry type
    totalAvailable: {
      type: Number,
      default: 0,
      min: 0,
      set: v => Math.max(0, Math.floor(v)) // ensures no decimals or negatives
    }
  },
  { timestamps: true }
);

// Ensure ONE stock record per poultry type
eggStockSchema.index({ poultryType: 1 }, { unique: true });

// Optional safety: prevent accidental duplicate creation race issues
eggStockSchema.pre("save", function (next) {
  if (!VALID_POULTRY_TYPES.includes(this.poultryType)) {
    return next(new Error("Invalid poultry type"));
  }

  if (this.totalAvailable < 0) {
    return next(new Error("Total available cannot be negative"));
  }

  next();
});

module.exports = mongoose.model("EggStock", eggStockSchema);