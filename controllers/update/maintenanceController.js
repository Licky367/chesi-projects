// ==========================================================
// controllers/maintenanceController.js
// ==========================================================

const mongoose = require("mongoose");

const Dairy =
  require("../../models/dairy");

const updateService =
  require("../../services/update");


// ==========================================================
// HELPER
//
// A maintenance target is a dairy structure/facility.
// Structures must NOT have a code.
//
// undefined, null, and "" = no code
// Any actual code = animal / coded dairy record
// ==========================================================

function hasDairyCode(dairy) {

  return (
    dairy.code !== undefined &&
    dairy.code !== null &&
    String(dairy.code).trim() !== ""
  );

}



// ==========================================================
// 🔧 MARK MAINTENANCE
//
// Rules:
// - User must be logged in.
// - Only admin or dairyWorker can report maintenance.
// - Target Dairy must be a structure/facility.
// - Structure must NOT have a code.
// - Maintenance update is created through updateService.
// - Dairy.needsMaintenance becomes true.
// - Socket failure must NEVER cancel successful operation.
// - Successful request redirects to /dairy/:id.
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
    // Maintenance is only for dairies without a code.
    // ======================================================

    if (hasDairyCode(dairy)) {

      return res
        .status(400)
        .send(
          "Maintenance can only be reported for dairy structures or facilities"
        );

    }


    // ======================================================
    // PREVENT DUPLICATE MARKING
    //
    // If maintenance is already required, the mark
    // composer should not be available.
    // ======================================================

    if (dairy.needsMaintenance === true) {

      return res
        .status(400)
        .send(
          "This dairy facility already requires maintenance"
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
    // UPDATE DAIRY STATUS
    // ======================================================

    dairy.needsMaintenance =
      true;

    await dairy.save();


    // ======================================================
    // SOCKET.IO
    //
    // Socket failure must NEVER make the successful
    // maintenance operation look like a failed request.
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
        "MAINTENANCE MARK SOCKET ERROR:",
        socketError
      );

    }


    // ======================================================
    // SUCCESS
    //
    // Always return the user to the dairy page.
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
// - Structure must NOT have a code.
// - Maintenance must currently be required.
// - Charges must be valid and >= 0.
// - Description is required.
// - Maintenance update is cleared.
// - Dairy.needsMaintenance becomes false.
// - Socket failure must NEVER cancel successful operation.
// - Successful request redirects to /dairy/:id.
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
    // Maintenance applies only to dairies without a code.
    // ======================================================

    if (hasDairyCode(dairy)) {

      return res
        .status(400)
        .send(
          "Maintenance can only be cleared for dairy structures or facilities"
        );

    }


    // ======================================================
    // PREVENT CLEARING WHEN NOTHING IS MARKED
    // ======================================================

    if (dairy.needsMaintenance !== true) {

      return res
        .status(400)
        .send(
          "This dairy facility does not currently require maintenance"
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
    // CLEAR DAIRY MAINTENANCE STATUS
    // ======================================================

    dairy.needsMaintenance =
      false;

    await dairy.save();


    // ======================================================
    // SOCKET.IO
    //
    // Socket failure must NEVER make the successful
    // maintenance clear operation look like a failure.
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
        "MAINTENANCE CLEAR SOCKET ERROR:",
        socketError
      );

    }


    // ======================================================
    // SUCCESS
    //
    // Always return the user to the dairy page.
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