// ==========================================================
// controllers/maintenanceController.js
// ==========================================================

const mongoose = require("mongoose");

const Dairy =
  require("../../models/dairy");

const updateService =
  require("../../services/update");


// =========================================================
// 🔧 MARK MAINTENANCE
// =========================================================

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
    // VALIDATE ID
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
    // STRUCTURE / FACILITY
    //
    // No code = structure/facility.
    // ======================================================

    if (
      dairy.code !== undefined &&
      dairy.code !== null &&
      dairy.code !== ""
    ) {

      return res
        .status(400)
        .send(
          "Maintenance can only be reported for dairy structures or facilities"
        );

    }


    // ======================================================
    // FORM DATA
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
    // MAINTENANCE TYPE
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
    // DESCRIPTION
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
    // DO NOT CHANGE THIS CONTRACT.
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
    // MARK DAIRY
    // ======================================================

    dairy.needsMaintenance =
      true;

    await dairy.save();


    // ======================================================
    // SOCKET
    //
    // Socket is OPTIONAL.
    // It must not interfere with the redirect.
    // ======================================================

    try {

      const io =
        req.app.get("io");


      if (io) {

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
        "Maintenance socket error:",
        socketError
      );

    }


    // ======================================================
    // IMPORTANT
    //
    // The operation has succeeded.
    // Send the browser back to the dairy page.
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
    // VALIDATE ID
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
    // STRUCTURE / FACILITY
    // ======================================================

    if (
      dairy.code !== undefined &&
      dairy.code !== null &&
      dairy.code !== ""
    ) {

      return res
        .status(400)
        .send(
          "Maintenance can only be cleared for dairy structures or facilities"
        );

    }


    // ======================================================
    // FORM DATA
    // ======================================================

    const charges =
      Number(req.body.charges);

    const description =
      typeof req.body.description === "string"
        ? req.body.description.trim()
        : "";


    // ======================================================
    // CHARGES
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
    // DESCRIPTION
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
    // CLEAR DAIRY STATUS
    // ======================================================

    dairy.needsMaintenance =
      false;

    await dairy.save();


    // ======================================================
    // SOCKET
    // ======================================================

    try {

      const io =
        req.app.get("io");


      if (io) {

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
        "Maintenance socket error:",
        socketError
      );

    }


    // ======================================================
    // IMPORTANT
    //
    // The operation has succeeded.
    // Send the browser back to the dairy page.
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