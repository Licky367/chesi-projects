const mongoose = require("mongoose");

const emergencyContactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true
    },

    relationship: {
      type: String,
      trim: true
    },

    telephone: {
      type: String,
      trim: true
    },

    email: {
      type: String,
      trim: true,
      lowercase: true
    },

    remarks: {
      type: String,
      trim: true
    }
  },
  { _id: false }
);

const studentSchema = new mongoose.Schema(
  {
    registrationNumber: {
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

    programme: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Programme",
      required: true
    },

    nationalID: {
      type: String,
      trim: true
    },

    dateOfBirth: {
      type: Date
    },

    gender: {
      type: String,
      trim: true
    },

    maritalStatus: {
      type: String,
      trim: true
    },

    religion: {
      type: String,
      trim: true
    },

    disability: {
      type: Boolean,
      default: false
    },

    disabilityDescription: {
      type: String,
      trim: true
    },

    coCurricular: {
      type: [String],
      default: []
    },

    kcseIndexNumber: {
      type: String,
      trim: true
    },

    kcseYear: {
      type: Number
    },

    telephone: {
      type: [String],
      default: [],
      validate: {
        validator: value => value.length <= 3,
        message: "A student can have a maximum of three telephone numbers."
      }
    },

    email: {
      type: String,
      trim: true,
      lowercase: true
    },

    county: {
      type: String,
      trim: true
    },

    domicile: {
      type: String,
      trim: true
    },

    emergencyContact: {
      type: emergencyContactSchema
    },

    profileImage: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Student", studentSchema);
