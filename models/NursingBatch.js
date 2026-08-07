const mongoose = require("mongoose");

const deathLogSchema = new mongoose.Schema(
{
  count: {
    type: Number,
    required: true,
    min: 1
  },

  cause: {
    type: String,
    required: true
  },

  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  profileImage: String,

  likes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  ],

  comments: [
    {
      text: String,
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }
  ]

},
{ timestamps: true }
);

const nursingBatchSchema = new mongoose.Schema(
{
  groupName: {
    type: String,
    required: true
  },

  poultryType: {
    type: String,
    required: true
  },

  source: {
    type: String,
    enum: ["incubation", "purchase"],
    required: true
  },

  total: {
    type: Number,
    required: true
  },

  available: {
    type: Number,
    required: true
  },

  dob: {
    type: Date,
    required: true
  },

  status: {
    type: String,
    enum: ["active", "caged", "depleted"],
    default: "active"
  },

  deaths: [deathLogSchema]

},
{ timestamps: true }
);

module.exports = mongoose.model("NursingBatch", nursingBatchSchema);