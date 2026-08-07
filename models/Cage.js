const mongoose = require("mongoose");

const cageSchema = new mongoose.Schema(
  {
    cageName: {
      type: String,
      required: true,
      trim: true
    },

    // Locked poultry type for this system
    poultryType: {
      type: String,
      required: true,
      enum: ["chicken"],
      default: "chicken"
    },

    // Total number of chickens ever placed in this cage
    total: {
      type: Number,
      required: true,
      min: 0
    },

    // Current live chickens available
    available: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: function (value) {
          return value <= this.total;
        },
        message: "Available chickens cannot exceed total chickens"
      }
    },

    // Date of poultry entry/birth
    dob: {
      type: Date,
      required: true
    },

    // Eggs collected from this cage
    eggsAvailable: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Cage", cageSchema);