// ==========================================================
// models/projectUserInvitations.js
// ==========================================================

const mongoose = require("mongoose");


// ==========================================================
// SCHEMA
// ==========================================================

const projectUserInvitationSchema = new mongoose.Schema(
{
  // ========================================================
  // EMAIL
  // ========================================================

  email: {
    type: String,

    required: true,

    unique: true,

    lowercase: true,

    trim: true,
  },


  // ========================================================
  // ROLE
  // ========================================================

  role: {
    type: String,

    enum: [
      "dairyWorker",
      "poultryWorker",
      "admin"
    ],

    required: true,
  },


  // ========================================================
  // ASSIGNED FARM
  //
  // Only used when role === "dairyWorker".
  //
  // This represents the FIRST Dairy Farm assigned to the
  // worker during invitation creation.
  //
  // The actual ProjectUser can later have several farms.
  // ========================================================

  assignedFarm: {

    type: mongoose.Schema.Types.ObjectId,

    ref: "Dairy",

    default: null,

  },


  // ========================================================
  // USED
  //
  // Becomes true after the invitation is accepted and the
  // ProjectUser account has been created.
  // ========================================================

  used: {

    type: Boolean,

    default: false,

  },

},
{
  timestamps: true,

  collection: "project-User-Invitations",
}
);


// ==========================================================
// MODEL
// ==========================================================

module.exports =
  mongoose.models.ProjectUserInvitation ||

  mongoose.model(
    "ProjectUserInvitation",
    projectUserInvitationSchema
  );