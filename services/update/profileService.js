// ==========================================================
// services/update/profileService.js
// ==========================================================

const Dairy = require("../../models/dairy");
const Update = require("../../models/Update");
const Milk = require("../../models/milk");

/* ==========================================================
   🟦 UPDATE PROFILE IMAGE
========================================================= */
exports.updateImage = async ({

  dairyId,

  userId,

  image

}) => {

  const dairy = await Dairy.findById(dairyId);

  if (!dairy) {

    throw new Error(

      "Dairy profile not found."

    );

  }

  dairy.profileImage = image;

  await dairy.save();

  return await Update.create({

    dairy: dairyId,

    user: userId,

    userName: "System",

    type: "image",

    image

  });

};


/* ==========================================================
   🗑 DELETE DAIRY PROFILE
========================================================= */
exports.deleteProfile = async (dairyId) => {

  await Update.deleteMany({

    dairy: dairyId

  });

  await Milk.deleteMany({

    dairy: dairyId

  });

  await Dairy.findByIdAndDelete(dairyId);

  return true;

};


/* ==========================================================
   📝 UPDATE PROFILE INFO
========================================================= */
exports.updateProfile = async (id, data) => {

  return await Dairy.findByIdAndUpdate(

    id,

    {

      name: data.name,

      code: data.code,

      mass: data.mass,

      dateOfBirth: data.dateOfBirth

    },

    {

      new: true,

      runValidators: true

    }

  );

};