const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema(
  {
    telephone: {
      type: String,
      trim: true
    },

    email: {
      type: String,
      trim: true,
      lowercase: true
    },

    location: {
      type: String,
      trim: true
    }
  },
  { _id: false }
);

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    code: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    departmentType: {
      type: String,
      trim: true
    },

    COD: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff"
    },

    description: {
      type: String,
      trim: true
    },

    mission: {
      type: String,
      trim: true
    },

    vision: {
      type: String,
      trim: true
    },

    objectives: {
      type: [String],
      default: []
    },

    contact: {
      type: contactSchema
    },

    programmes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Programme"
      }
    ],

    units: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Unit"
      }
    ],

    staff: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Staff"
      }
    ],

    facilities: {
      type: [String],
      default: []
    },

    researchArears: {
      type: [String],
      default: []
    },

    session: {
      type: String,
      trim: true
    },

    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("SchoolDepartment", departmentSchema);
