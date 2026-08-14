const mongoose = require("mongoose");

const Dairy = require("../../models/dairy");
const updateService = require("../../services/update");


/* =========================================================
   🔧 MARK MAINTENANCE
========================================================= */

exports.markMaintenance = async (req, res) => {

  try {

    const { id } = req.params;
    const user = req.session.user;


    /* =====================================================
       AUTHENTICATION
    ====================================================== */

    if (!user) {

      return res
        .status(401)
        .send("Unauthorized");

    }


    /* =====================================================
       ROLE
       
       Only admin and dairyWorker can report maintenance.
    ====================================================== */

    if (
      user.role !== "admin" &&
      user.role !== "dairyWorker"
    ) {

      return res
        .status(403)
        .send("Not allowed");

    }


    /* =====================================================
       VALIDATE DAIRY ID
    ====================================================== */

    if (!mongoose.Types.ObjectId.isValid(id)) {

      return res
        .status(400)
        .send("Invalid dairy ID");

    }


    /* =====================================================
       FIND DAIRY
       
       This ensures the record actually exists before
       attempting to create the maintenance update.
    ====================================================== */

    const dairy = await Dairy.findById(id);

    if (!dairy) {

      return res
        .status(404)
        .send("Dairy facility not found");

    }


    /* =====================================================
       READ FORM DATA
    ====================================================== */

    const type =
      typeof req.body.type === "string"
        ? req.body.type.trim()
        : "";

    const description =
      typeof req.body.description === "string"
        ? req.body.description.trim()
        : "";


    /* =====================================================
       VALIDATE TYPE
    ====================================================== */

    const allowedTypes = [
      "repair",
      "maintenance",
      "construction"
    ];


    if (!allowedTypes.includes(type)) {

      return res
        .status(400)
        .send("Invalid maintenance type");

    }


    /* =====================================================
       VALIDATE DESCRIPTION
    ====================================================== */

    if (!description) {

      return res
        .status(400)
        .send(
          "Maintenance type and description are required"
        );

    }


    /* =====================================================
       CREATE MAINTENANCE UPDATE
       
       Keep the existing updateService contract.
    ====================================================== */

    const update =
      await updateService.markMaintenance({

        dairyId: dairy._id,

        userId: user._id,

        userName: user.name,

        type,

        description

      });


    /* =====================================================
       ACTUALLY MARK THE DAIRY
       
       This is the important part:
       the Dairy record itself must carry the maintenance
       status used by the page UI.
    ====================================================== */

    dairy.needsMaintenance = true;

    await dairy.save();


    /* =====================================================
       REAL-TIME PAYLOAD
    ====================================================== */

    const payload = {

      dairyId: dairy._id.toString(),

      status: "marked",

      type,

      description,

      userName: user.name,

      userImage:
        user.profileImage ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(
          user.name
        )}`,

      dateText:
        update && update.createdAt
          ? new Date(
              update.createdAt
            ).toLocaleString()
          : new Date().toLocaleString()

    };


    /* =====================================================
       SOCKET.IO
    ====================================================== */

    const io =
      req.app.get("io");


    if (io) {

      io.to(dairy._id.toString()).emit(
        "maintenanceMarked",
        payload
      );

    }


    /* =====================================================
       REDIRECT
    ====================================================== */

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



/* =========================================================
   ✅ CLEAR MAINTENANCE
========================================================= */

exports.clearMaintenance = async (req, res) => {

  try {

    const { id } = req.params;
    const user = req.session.user;


    /* =====================================================
       AUTHENTICATION
    ====================================================== */

    if (!user) {

      return res
        .status(401)
        .send("Unauthorized");

    }


    /* =====================================================
       ADMIN ONLY
    ====================================================== */

    if (user.role !== "admin") {

      return res
        .status(403)
        .send(
          "Only admin can clear maintenance"
        );

    }


    /* =====================================================
       VALIDATE DAIRY ID
    ====================================================== */

    if (!mongoose.Types.ObjectId.isValid(id)) {

      return res
        .status(400)
        .send("Invalid dairy ID");

    }


    /* =====================================================
       FIND DAIRY
    ====================================================== */

    const dairy = await Dairy.findById(id);

    if (!dairy) {

      return res
        .status(404)
        .send("Dairy facility not found");

    }


    /* =====================================================
       READ FORM DATA
    ====================================================== */

    const charges =
      Number(req.body.charges);

    const description =
      typeof req.body.description === "string"
        ? req.body.description.trim()
        : "";


    /* =====================================================
       VALIDATE CHARGES
    ====================================================== */

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


    /* =====================================================
       VALIDATE DESCRIPTION
    ====================================================== */

    if (!description) {

      return res
        .status(400)
        .send(
          "Description is required"
        );

    }


    /* =====================================================
       CREATE CLEAR-MAINTENANCE UPDATE
    ====================================================== */

    const update =
      await updateService.clearMaintenance({

        dairyId: dairy._id,

        userId: user._id,

        userName: user.name,

        charges,

        description

      });


    /* =====================================================
       ACTUALLY CLEAR THE DAIRY STATUS
    ====================================================== */

    dairy.needsMaintenance = false;

    await dairy.save();


    /* =====================================================
       REAL-TIME PAYLOAD
    ====================================================== */

    const payload = {

      dairyId: dairy._id.toString(),

      status: "cleared",

      charges,

      description,

      userName: user.name,

      userImage:
        user.profileImage ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(
          user.name
        )}`,

      dateText:
        update && update.createdAt
          ? new Date(
              update.createdAt
            ).toLocaleString()
          : new Date().toLocaleString()

    };


    /* =====================================================
       SOCKET.IO
    ====================================================== */

    const io =
      req.app.get("io");


    if (io) {

      io.to(dairy._id.toString()).emit(
        "maintenanceCleared",
        payload
      );

    }


    /* =====================================================
       REDIRECT
    ====================================================== */

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