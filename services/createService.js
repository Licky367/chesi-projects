// ==========================================================
// services/createService.js
// ==========================================================

const ProjectUser = require("../models/projectUser");
const ProjectUserInvitation = require("../models/projectUserInvitations");
const Dairy = require("../models/dairy");


// ==========================================================
// CREATE INVITATION
// ==========================================================

exports.createInvitation = async ({
  email,
  role,
  assignedFarm
}) => {

  // ========================================================
  // CHECK IF USER ALREADY EXISTS
  // ========================================================

  const existingUser =
    await ProjectUser.findOne({
      email
    });

  if (existingUser) {

    throw new Error(
      "User already exists with this email"
    );

  }


  // ========================================================
  // CHECK IF INVITATION ALREADY EXISTS
  // ========================================================

  const existingInvite =
    await ProjectUserInvitation.findOne({
      email
    });

  if (existingInvite) {

    throw new Error(
      "Invitation already exists for this email"
    );

  }


  // ========================================================
  // DAIRY WORKER FARM ASSIGNMENT
  // ========================================================

  let farm = null;


  if (role === "dairyWorker") {

    // ------------------------------------------------------
    // A Dairy Worker must have a first farm.
    // ------------------------------------------------------

    if (!assignedFarm) {

      throw new Error(
        "A Dairy Farm must be selected for a Dairy Worker."
      );

    }


    // ------------------------------------------------------
    // Find the selected Dairy record.
    // ------------------------------------------------------

    farm =
      await Dairy.findOne({

        _id: assignedFarm,

        code: {
          $lt: 0
        }

      });


    // ------------------------------------------------------
    // Make sure the selected record is actually a
    // Dairy Farm.
    // ------------------------------------------------------

    if (!farm) {

      throw new Error(
        "The selected Dairy Farm is invalid."
      );

    }

  }


  // ========================================================
  // NON-DAIRY WORKERS
  // ========================================================
  //
  // Poultry workers and admins receive no Dairy Farm
  // assignment.
  // ========================================================

  if (role !== "dairyWorker") {

    farm = null;

  }


  // ========================================================
  // CREATE INVITATION
  // ========================================================

  const invitationData = {

    email,

    role

  };


  // ========================================================
  // SAVE FIRST FARM FOR DAIRY WORKER
  // ========================================================

  if (role === "dairyWorker") {

    invitationData.assignedFarm =
      farm._id;

  }


  const invitation =
    await ProjectUserInvitation.create(
      invitationData
    );


  // ========================================================
  // RETURN INVITATION
  // ========================================================

  return invitation;

};