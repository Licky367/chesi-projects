// ==========================================================
// controllers/maintenanceController.js
// ==========================================================

const mongoose = require("mongoose");

const Dairy =
  require("../../models/dairy");

const updateService =
  require("../../services/update");


// ==========================================================
// 🔧 MARK MAINTENANCE
//
// Rules:
// - User must be logged in.
// - Only admin or dairyWorker can report maintenance.
// - Target Dairy must be a structure/facility.
// - A structure/facility must NOT have a code.
// - Maintenance update is created through updateService.
// - Dairy.needsMaintenance is set to true.
// - Socket errors must NEVER cause the successful request
//   to become a failure.
// ==========================================================

exports.markMaintenance = async (req, res) => {

  try {

    const { id } = req.params;

    const user =
      req.session.user;


    // ======================================================
    // AUTHENTICATION
    // ======================================================

    if (!user) {

      return res
        .status(401)
        .send("Unauthorized");

    }


    // ======================================================
    // ROLE
    //
    // Only admin and dairyWorker may report maintenance.
    // ======================================================

    if (
      user.role !== "admin" &&
      user.role !== "dairyWorker"
    ) {

      return res
        .status(403)
        .send("Not allowed");

    }


    // ======================================================
    // VALIDATE DAIRY ID
    // ======================================================

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {

      return res
        .status(400)
        .send("Invalid dairy ID");

    }


    // ======================================================
    // FIND DAIRY
    // ======================================================

    const dairy =
      await Dairy.findById(id);

    if (!dairy) {

      return res
        .status(404)
        .send("Dairy facility not found");

    }


    // ======================================================
    // STRUCTURE VALIDATION
    //
    // Maintenance is for structures/facilities.
    //
    // A Dairy with a code is not a structure.
    // ======================================================

    if (
      dairy.code !== undefined &&
      dairy.code !== null
    ) {

      return res
        .status(400)
        .send(
          "Maintenance can only be reported for dairy structures or facilities"
        );

    }


    // ======================================================
    // READ FORM DATA
    // ======================================================

    const type =
      typeof req.body.type === "string"
        ? req.body.type.trim()
        : "";

    const description =
      typeof req.body.description === "string"
        ? req.body.description.trim()
        : "";


    // ======================================================
    // VALIDATE MAINTENANCE TYPE
    // ======================================================

    const allowedTypes = [
      "repair",
      "maintenance",
      "construction"
    ];


    if (
      !allowedTypes.includes(type)
    ) {

      return res
        .status(400)
        .send(
          "Invalid maintenance type"
        );

    }


    // ======================================================
    // VALIDATE DESCRIPTION
    // ======================================================

    if (!description) {

      return res
        .status(400)
        .send(
          "Maintenance type and description are required"
        );

    }


    // ======================================================
    // CREATE MAINTENANCE UPDATE
    //
    // Keep the existing updateService contract.
    // ======================================================

    const update =
      await updateService.markMaintenance({

        dairyId:
          dairy._id,

        userId:
          user._id,

        userName:
          user.name,

        type,

        description

      });


    // ======================================================
    // ACTUALLY MARK THE DAIRY
    //
    // This is the status used by structures.ejs.
    // ======================================================

    dairy.needsMaintenance =
      true;

    await dairy.save();


    // ======================================================
    // REAL-TIME SOCKET PAYLOAD
    //
    // Socket errors are isolated so they cannot turn a
    // successful maintenance operation into HTTP 500.
    // ======================================================

    try {

      const io =
        req.app.get("io");


      if (
        io &&
        typeof io.to === "function"
      ) {

        io
          .to(
            dairy._id.toString()
          )
          .emit(
            "maintenanceMarked",
            {

              dairyId:
                dairy._id.toString(),

              status:
                "marked",

              type,

              description,

              userName:
                user.name,

              userImage:
                user.profileImage ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  user.name
                )}`,

              dateText:
                update &&
                update.createdAt
                  ? new Date(
                      update.createdAt
                    ).toLocaleString()
                  : new Date().toLocaleString()

            }
          );

      }

    } catch (socketError) {

      console.error(
        "MAINTENANCE SOCKET ERROR:",
        socketError
      );

    }


    // ======================================================
    // SUCCESS REDIRECT
    // ======================================================

    return res.redirect(
      `/dairy/${dairy._id}`
    );


  } catch (err) {

    console.error(
      "MAINTENANCE MARK ERROR:",
      err
    );


    return res
      .status(500)
      .send(
        "Failed to mark maintenance"
      );

  }

};



// ==========================================================
// ✅ CLEAR MAINTENANCE
//
// Rules:
// - User must be logged in.
// - Admin only.
// - Target Dairy must be a structure/facility.
// - Charges must be a valid non-negative number.
// - Description is required.
// - Maintenance update is cleared.
// - Dairy.needsMaintenance becomes false.
// - Socket errors cannot break the redirect.
// ==========================================================

exports.clearMaintenance = async (req, res) => {

  try {

    const { id } = req.params;

    const user =
      req.session.user;


    // ======================================================
    // AUTHENTICATION
    // ======================================================

    if (!user) {

      return res
        .status(401)
        .send("Unauthorized");

    }


    // ======================================================
    // ADMIN ONLY
    // ======================================================

    if (
      user.role !== "admin"
    ) {

      return res
        .status(403)
        .send(
          "Only admin can clear maintenance"
        );

    }


    // ======================================================
    // VALIDATE DAIRY ID
    // ======================================================

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {

      return res
        .status(400)
        .send("Invalid dairy ID");

    }


    // ======================================================
    // FIND DAIRY
    // ======================================================

    const dairy =
      await Dairy.findById(id);

    if (!dairy) {

      return res
        .status(404)
        .send("Dairy facility not found");

    }


    // ======================================================
    // STRUCTURE VALIDATION
    //
    // Only structures/facilities can have maintenance.
    // ======================================================

    if (
      dairy.code !== undefined &&
      dairy.code !== null
    ) {

      return res
        .status(400)
        .send(
          "Maintenance can only be cleared for dairy structures or facilities"
        );

    }


    // ======================================================
    // READ FORM DATA
    // ======================================================

    const charges =
      Number(req.body.charges);

    const description =
      typeof req.body.description === "string"
        ? req.body.description.trim()
        : "";


    // ======================================================
    // VALIDATE CHARGES
    // ======================================================

    if (
      !Number.isFinite(charges) ||
      charges < 0
    ) {

      return res
        .status(400)
        .send(
          "Valid charges are required"
        );

    }


    // ======================================================
    // VALIDATE DESCRIPTION
    // ======================================================

    if (!description) {

      return res
        .status(400)
        .send(
          "Description is required"
        );

    }


    // ======================================================
    // CREATE CLEAR-MAINTENANCE UPDATE
    // ======================================================

    const update =
      await updateService.clearMaintenance({

        dairyId:
          dairy._id,

        userId:
          user._id,

        userName:
          user.name,

        charges,

        description

      });


    // ======================================================
    // ACTUALLY CLEAR THE DAIRY STATUS
    // ======================================================

    dairy.needsMaintenance =
      false;

    await dairy.save();


    // ======================================================
    // REAL-TIME SOCKET PAYLOAD
    //
    // Again, socket failure must not affect the operation.
    // ======================================================

    try {

      const io =
        req.app.get("io");


      if (
        io &&
        typeof io.to === "function"
      ) {

        io
          .to(
            dairy._id.toString()
          )
          .emit(
            "maintenanceCleared",
            {

              dairyId:
                dairy._id.toString(),

              status:
                "cleared",

              charges,

              description,

              userName:
                user.name,

              userImage:
                user.profileImage ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  user.name
                )}`,

              dateText:
                update &&
                update.createdAt
                  ? new Date(
                      update.createdAt
                    ).toLocaleString()
                  : new Date().toLocaleString()

            }
          );

      }

    } catch (socketError) {

      console.error(
        "MAINTENANCE SOCKET ERROR:",
        socketError
      );

    }


    // ======================================================
    // SUCCESS REDIRECT
    // ======================================================

    return res.redirect(
      `/dairy/${dairy._id}`
    );


  } catch (err) {

    console.error(
      "MAINTENANCE CLEAR ERROR:",
      err
    );


    return res
      .status(500)
      .send(
        "Failed to clear maintenance"
      );

  }

};