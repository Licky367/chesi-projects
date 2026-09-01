const mongoose = require("mongoose");

const staffSchema = new mongoose.Schema(
  {
    staffId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    name: {
      type: String,
      required: true,
      trim: true
    },

    title: {
      type: String,
      trim: true
    },

    gender: {
      type: String,
      trim: true
    },

    email: {
      type: String,
      trim: true,
      lowercase: true
    },

    position: {
      type: String,
      trim: true
    },

    employeeType: {
      type: String,
      trim: true
    },

    academicRank: {
      type: String,
      trim: true
    },

    specialization: {
      type: [String],
      default: []
    },

    qualifications: {
      type: [String],
      default: []
    },

    researchInterests: {
      type: [String],
      default: []
    },

    office: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Staff", staffSchema);
