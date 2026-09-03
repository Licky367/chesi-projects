const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema(
  {
    telephone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    location: { type: String, trim: true }
  },
  { _id: false }
);

const schoolSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true },
    vision: { type: String, trim: true },
    mission: { type: String, trim: true },
    objectives: { type: [String], default: [] },

    dean: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff"
    },

    contact: { type: contactSchema },

    staff: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Staff"
      }
    ]
  },
  { timestamps: true }
);

schoolSchema.index({ name: 1 });
module.exports = mongoose.model("School", schoolSchema);
