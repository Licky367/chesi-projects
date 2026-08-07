const mongoose = require("mongoose");

const incubationSchema = new mongoose.Schema(
{
  groupName: {
    type: String,
    required: true,
    trim: true
  },

  poultryType: {
    type: String,
    enum: ["chicken", "duck", "goose", "turkey", "other"],
    required: true
  },

  eggCount: {
    type: Number,
    required: true,
    min: 1
  },

  status: {
    type: String,
    enum: ["active", "completed"],
    default: "active"
  },

  successfulHatches: {
    type: Number,
    default: 0
  },

  startDate: {
    type: Date,
    default: Date.now
  },

  endDate: Date, // incubation end date

  dob: Date // date of birth (same as endDate logically)
},
{ timestamps: true }
);

module.exports = mongoose.model("Incubation", incubationSchema);