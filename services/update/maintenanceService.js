// ==========================================================
// services/update/maintenanceService.js
// ==========================================================

const Dairy = require("../../models/dairy");
const Update = require("../../models/Update");


/* ==========================================================
   🔧 MARK MAINTENANCE
========================================================= */
exports.markMaintenance = async ({

  dairyId,

  userId,

  userName,

  type,

  description

}) => {

  const dairy = await Dairy.findById(dairyId);

  if (!dairy) {

    throw new Error(

      "Structure not found."

    );

  }

  // Update dairy status
  dairy.needsMaintenance = true;

  await dairy.save();

  // Create feed update
  return await Update.create({

    dairy: dairyId,

    user: userId,

    userName,

    type: "maintenance",

    maintenance: {

      status: "marked",

      type,

      description,

      markedAt: new Date(),

      markedBy: userId,

      charges: 0,

      clearDescription: ""

    }

  });

};


/* ==========================================================
   ✅ CLEAR MAINTENANCE
========================================================= */
exports.clearMaintenance = async ({

  dairyId,

  userId,

  userName,

  charges = 0,

  description = ""

}) => {

  const dairy = await Dairy.findById(dairyId);

  if (!dairy) {

    throw new Error(

      "Structure not found."

    );

  }

  dairy.needsMaintenance = false;

  await dairy.save();

  console.log("Creating maintenance update...");

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

      charges,

      clearDescription: description

    }

  });

  console.log("Maintenance update created successfully.");

  return update;

};