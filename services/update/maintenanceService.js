// ==========================================================
// services/update/maintenanceService.js
// ==========================================================

const Dairy = require("../../models/dairy");
const Update = require("../../models/Update");



/* ==========================================================
   🔧 MARK MAINTENANCE
========================================================== */

exports.markMaintenance = async ({

  dairyId,

  userId,

  userName,

  type,

  description

}) => {


  /* ========================================================
     VALIDATE DAIRY
  ======================================================== */

  const dairy = await Dairy.findById(dairyId);


  if (!dairy) {

    throw new Error(
      "Structure not found."
    );

  }


  /* ========================================================
     VALIDATE MAINTENANCE TYPE
  ======================================================== */

  const allowedTypes = [
    "repair",
    "maintenance",
    "construction"
  ];


  if (!allowedTypes.includes(type)) {

    throw new Error(
      "Invalid maintenance type."
    );

  }


  /* ========================================================
     VALIDATE DESCRIPTION
  ======================================================== */

  if (
    typeof description !== "string" ||
    !description.trim()
  ) {

    throw new Error(
      "Maintenance description is required."
    );

  }


  /* ========================================================
     MARK DAIRY AS REQUIRING MAINTENANCE
  ======================================================== */

  dairy.needsMaintenance = true;

  await dairy.save();


  /* ========================================================
     CREATE MAINTENANCE FEED UPDATE
  ======================================================== */

  const update = await Update.create({

    dairy: dairyId,

    user: userId,

    userName,

    type: "maintenance",

    maintenance: {

      status: "marked",

      type,

      description: description.trim(),

      markedAt: new Date(),

      markedBy: userId,

      charges: 0,

      clearDescription: ""

    }

  });


  /* ========================================================
     RETURN CREATED UPDATE
  ======================================================== */

  return update;

};



/* ==========================================================
   ✅ CLEAR MAINTENANCE
========================================================== */

exports.clearMaintenance = async ({

  dairyId,

  userId,

  userName,

  charges = 0,

  description = ""

}) => {


  /* ========================================================
     VALIDATE DAIRY
  ======================================================== */

  const dairy = await Dairy.findById(dairyId);


  if (!dairy) {

    throw new Error(
      "Structure not found."
    );

  }


  /* ========================================================
     VALIDATE CHARGES
  ======================================================== */

  if (
    !Number.isFinite(Number(charges)) ||
    Number(charges) < 0
  ) {

    throw new Error(
      "Invalid maintenance charges."
    );

  }


  /* ========================================================
     VALIDATE CLEAR DESCRIPTION
  ======================================================== */

  if (
    typeof description !== "string" ||
    !description.trim()
  ) {

    throw new Error(
      "Maintenance completion description is required."
    );

  }


  /* ========================================================
     CLEAR MAINTENANCE STATUS
  ======================================================== */

  dairy.needsMaintenance = false;

  await dairy.save();


  /* ========================================================
     CREATE MAINTENANCE FEED UPDATE
  ======================================================== */

  const update = await Update.create({

    dairy: dairyId,

    user: userId,

    userName,

    type: "maintenance",

    maintenance: {

      status: "cleared",

      type: "maintenance",

      description: "",

      markedAt: null,

      markedBy: null,

      clearedAt: new Date(),

      clearedBy: userId,

      charges: Number(charges),

      clearDescription: description.trim()

    }

  });


  /* ========================================================
     RETURN CREATED UPDATE
  ======================================================== */

  return update;

};