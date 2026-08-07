const Dairy = require("../models/dairy");

// =========================
// CREATE NEW RECORD
// =========================
exports.createDairyRecord = async (data) => {

  const dairy = new Dairy({

    name: data.name,

    profileImage: data.profileImage || "",

    dateOfBirth: data.dateOfBirth || null,

    code: Number(data.code),

    mass: Number(data.mass)

  });

  return await dairy.save();

};