const mongoose = require("mongoose");

const eggCollectionSchema = new mongoose.Schema(
  {
    poultryType: {
      type: String,
      required: true,
      enum: ["chicken", "duck", "turkey", "goose", "quail", "other"]
    },

    quantity: {
      type: Number,
      required: true,
      min: 0
    },

    sourceBatch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NursingBatch"
    },

    collectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  { timestamps: true }
);

eggCollectionSchema.index({ poultryType: 1, createdAt: 1 });

module.exports = mongoose.model("EggCollectionLog", eggCollectionSchema);