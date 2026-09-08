// ==========================================================
// verrah/models/category.js
// CATEGORY MODEL
// ==========================================================

const mongoose =
  require("mongoose");

const categorySchema =
  new mongoose.Schema(
    {
      name: {
        type: String,

        required: true,

        trim: true,

        lowercase: true,

        unique: true,

        index: true
      },

      categoryIcon: {
        type: String,

        trim: true,

        default: ""
      },

      isActive: {
        type: Boolean,

        default: true,

        index: true
      }
    },

    {
      timestamps: true
    }
  );

module.exports =
  mongoose.model(
    "Category",
    categorySchema
  );