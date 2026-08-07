const mongoose = require("mongoose");

const projectUserInvitationSchema = new mongoose.Schema(
{
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },

  role: {
    type: String,
    enum: ["dairyWorker", "poultryWorker", "admin"],
    required: true,
  },

  used: {
    type: Boolean,
    default: false, // becomes true after signup
  },
},
{
  timestamps: true,
  collection: "project-User-Invitations",
}
);

module.exports = mongoose.model(
  "ProjectUserInvitation",
  projectUserInvitationSchema
);