// ==========================================================
// services/update/medicalService.js
// ==========================================================

const Dairy = require("../../models/dairy");
const Update = require("../../models/Update");


/* ==========================================================
   🩺 MARK MEDICAL ATTENTION
========================================================= */
exports.markMedicalAttention = async ({

  dairyId,

  userId,

  userName,

  type,

  details

}) => {

  const dairy = await Dairy.findById(dairyId);

  if (!dairy) {

    throw new Error(

      "Dairy profile not found."

    );

  }

  // Update dairy status
  dairy.medicalAttention = {

    isMarked: true,

    type,

    details,

    markedBy: userId,

    markedAt: new Date(),

    updatedAt: new Date()

  };

  await dairy.save();

  // Create feed update
  return await Update.create({

    dairy: dairyId,

    user: userId,

    userName,

    type: "medical",

    medical: {

      status: "marked",

      type,

      details,

      markedAt: new Date(),

      markedBy: userId,

      charges: 0,

      clearDescription: ""

    }

  });

};


/* ==========================================================
   ✅ CLEAR MEDICAL ATTENTION
========================================================= */
exports.unmarkMedicalAttention = async ({

  dairyId,

  userId,

  userName,

  charges = 0,

  description = ""

}) => {

  const dairy = await Dairy.findById(dairyId);

  if (!dairy) {

    throw new Error(

      "Dairy profile not found."

    );

  }

  const previousType =

    dairy.medicalAttention?.type || "";

  const previousDetails =

    dairy.medicalAttention?.details || "";

  // Reset dairy status
  dairy.medicalAttention = {

    isMarked: false,

    type: "",

    details: "",

    markedBy: null,

    markedAt: null,

    updatedAt: new Date()

  };

  await dairy.save();

  // Create feed update
  return await Update.create({

    dairy: dairyId,

    user: userId,

    userName,

    type: "medical",

    medical: {

      status: "cleared",

      type: previousType,

      details: previousDetails,

      markedAt: null,

      markedBy: null,

      clearedAt: new Date(),

      clearedBy: userId,

      charges,

      clearDescription: description

    }

  });

};