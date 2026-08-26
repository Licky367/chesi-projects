// ==========================================================
// services/accountsService.js
// ==========================================================

const mongoose = require("mongoose");

const User =
  require("../models/projectUser");

const Dairy =
  require("../models/dairy");


// ==========================================================
// HELPERS
// ==========================================================

function normalizeIds(value) {

  if (!Array.isArray(value)) {

    value =
      value
        ? [value]
        : [];

  }

  return [
    ...new Set(
      value
        .filter(
          id =>
            id &&
            String(id).trim()
        )
        .map(
          id =>
            String(id)
        )
    )
  ];

}


// ==========================================================
// GET ALL USERS
// ==========================================================

exports.getAllUsers =
async () => {

  return await User.find()
    .sort({
      name: 1
    });

};


// ==========================================================
// GET USER PROFILE DATA
// ==========================================================

exports.getUserProfileData =
async (userId) => {

  if (
    !mongoose.Types.ObjectId.isValid(
      userId
    )
  ) {

    return {
      user: null,
      dairies: [],
      assets: []
    };

  }


  // ========================================================
  // USER
  // ========================================================

  const user =
    await User.findById(
      userId
    )
      .populate({
        path: "assignedFarm",
        select:
          "name code assetCode profileImage status"
      })
      .populate({
        path: "assignedAsset",
        select:
          "name code assetCode type condition location description displayImage profileImage status refNo"
      });


  // ========================================================
  // AVAILABLE DAIRY FARMS
  // ========================================================
  //
  // Farm:
  //
  //     code < 0
  //
  // ========================================================

  const dairies =
    await Dairy.find({

      code: {
        $lt: 0
      }

    })
      .select(
        "name code assetCode profileImage status"
      )
      .sort({
        name: 1
      });


  // ========================================================
  // AVAILABLE STANDALONE ASSETS
  // ========================================================
  //
  // Standalone asset:
  //
  //     code      === null OR missing
  //     assetCode === null OR missing
  //
  // MongoDB:
  //
  //     { code: null }
  //
  // matches both:
  //
  //     code: null
  //
  // and a document where code is absent.
  //
  // ========================================================

  const assets =
    await Dairy.find({

      code: null,

      assetCode: null

    })
      .select(
        [
          "name",
          "code",
          "assetCode",
          "type",
          "condition",
          "location",
          "description",
          "displayImage",
          "profileImage",
          "status",
          "refNo"
        ].join(" ")
      )
      .sort({
        name: 1
      });


  return {

    user,

    dairies,

    assets

  };

};


// ==========================================================
// GET SINGLE USER
// ==========================================================

exports.getUserById =
async (userId) => {

  return await User.findById(
    userId
  )
    .populate({
      path: "assignedFarm",
      select:
        "name code assetCode profileImage status"
    })
    .populate({
      path: "assignedAsset",
      select:
        "name code assetCode type condition location description displayImage profileImage status refNo"
    });

};


// ==========================================================
// UPDATE USER ROLE
// ==========================================================

exports.updateUserRole =
async (
  userId,
  role
) => {

  if (
    ![
      "dairyWorker",
      "poultryWorker",
      "admin"
    ].includes(role)
  ) {

    throw new Error(
      "Invalid user role."
    );

  }


  const update = {
    role
  };


  // --------------------------------------------------------
  // Only dairyWorker can have Dairy Farms.
  // --------------------------------------------------------

  if (
    role !== "dairyWorker"
  ) {

    update.assignedFarm = [];

  }


  // --------------------------------------------------------
  // Admins cannot have standalone assets.
  // --------------------------------------------------------

  if (
    role === "admin"
  ) {

    update.assignedAsset = [];

  }


  const updatedUser =
    await User.findByIdAndUpdate(

      userId,

      update,

      {
        new: true,
        runValidators: true
      }

    );


  if (!updatedUser) {

    throw new Error(
      "User not found."
    );

  }


  return updatedUser;

};


// ==========================================================
// ASSIGN DAIRY FARMS
// ==========================================================

exports.assignDairyFarms =
async (
  userId,
  assignedFarms
) => {

  const user =
    await User.findById(
      userId
    );


  if (!user) {

    throw new Error(
      "User not found."
    );

  }


  if (
    user.role !== "dairyWorker"
  ) {

    throw new Error(
      "Only a Dairy Worker can be assigned Dairy Farms."
    );

  }


  const uniqueIds =
    normalizeIds(
      assignedFarms
    );


  if (!uniqueIds.length) {

    return user;

  }


  // --------------------------------------------------------
  // Validate ObjectIds.
  // --------------------------------------------------------

  for (
    const id of uniqueIds
  ) {

    if (
      !mongoose.Types.ObjectId.isValid(
        id
      )
    ) {

      throw new Error(
        "One or more selected Dairy Farms are invalid."
      );

    }

  }


  // --------------------------------------------------------
  // Find only negative-code Dairy Farms.
  // --------------------------------------------------------

  const farms =
    await Dairy.find({

      _id: {
        $in: uniqueIds
      },

      code: {
        $lt: 0
      }

    })
      .select(
        "_id name code assetCode"
      );


  if (
    farms.length !==
    uniqueIds.length
  ) {

    throw new Error(
      "One or more selected records are not valid Dairy Farms."
    );

  }


  // --------------------------------------------------------
  // Existing assignments.
  // --------------------------------------------------------

  const existingIds =
    new Set(

      (user.assignedFarm || [])
        .map(
          id =>
            String(
              id._id || id
            )
        )

    );


  // --------------------------------------------------------
  // Add only new farms.
  // --------------------------------------------------------

  for (
    const farm of farms
  ) {

    const id =
      farm._id.toString();


    if (
      !existingIds.has(id)
    ) {

      user.assignedFarm.push(
        farm._id
      );

      existingIds.add(id);

    }

  }


  await user.save();


  return user;

};


// ==========================================================
// UNASSIGN ONE DAIRY FARM
// ==========================================================

exports.unassignDairyFarm =
async (
  userId,
  farmId
) => {

  const user =
    await User.findById(
      userId
    );


  if (!user) {

    throw new Error(
      "User not found."
    );

  }


  if (
    user.role !== "dairyWorker"
  ) {

    throw new Error(
      "Only a Dairy Worker can have assigned Dairy Farms."
    );

  }


  if (
    !mongoose.Types.ObjectId.isValid(
      farmId
    )
  ) {

    throw new Error(
      "Invalid Dairy Farm."
    );

  }


  const farm =
    await Dairy.findOne({

      _id: farmId,

      code: {
        $lt: 0
      }

    });


  if (!farm) {

    throw new Error(
      "The selected record is not a valid Dairy Farm."
    );

  }


  user.assignedFarm =
    (user.assignedFarm || [])
      .filter(
        id =>
          String(
            id._id || id
          ) !==
          String(farmId)
      );


  await user.save();


  return user;

};


// ==========================================================
// ASSIGN STANDALONE DAIRY ASSETS
// ==========================================================
//
// USER FIELD:
//
//     assignedAsset
//
// ELIGIBLE ASSET:
//
//     code      === null OR missing
//     assetCode === null OR missing
//
// ELIGIBLE USER:
//
//     any user except admin
//
// ==========================================================

exports.assignDairyAssets =
async (
  userId,
  assignedAssets
) => {

  const user =
    await User.findById(
      userId
    );


  if (!user) {

    throw new Error(
      "User not found."
    );

  }


  // --------------------------------------------------------
  // Admin protection.
  // --------------------------------------------------------

  if (
    user.role === "admin"
  ) {

    throw new Error(
      "An Administrator cannot be assigned standalone Dairy assets."
    );

  }


  const uniqueIds =
    normalizeIds(
      assignedAssets
    );


  if (!uniqueIds.length) {

    return user;

  }


  // --------------------------------------------------------
  // Validate ObjectIds.
  // --------------------------------------------------------

  for (
    const id of uniqueIds
  ) {

    if (
      !mongoose.Types.ObjectId.isValid(
        id
      )
    ) {

      throw new Error(
        "One or more selected assets are invalid."
      );

    }

  }


  // --------------------------------------------------------
  // Find only standalone/code-less assets.
  //
  // IMPORTANT:
  //
  //     code: null
  //     assetCode: null
  //
  // MongoDB treats null matching as:
  //
  //     explicit null
  //     OR field does not exist
  //
  // --------------------------------------------------------

  const assets =
    await Dairy.find({

      _id: {
        $in: uniqueIds
      },

      code: null,

      assetCode: null

    })
      .select(
        "_id name code assetCode type condition location description displayImage profileImage status refNo"
      );


  if (
    assets.length !==
    uniqueIds.length
  ) {

    throw new Error(
      "One or more selected records are not valid standalone assets."
    );

  }


  // --------------------------------------------------------
  // Existing assignedAsset IDs.
  // --------------------------------------------------------

  if (
    !Array.isArray(
      user.assignedAsset
    )
  ) {

    user.assignedAsset = [];

  }


  const existingIds =
    new Set(

      user.assignedAsset
        .map(
          id =>
            String(
              id._id || id
            )
        )

    );


  // --------------------------------------------------------
  // Add only assets not already assigned.
  // --------------------------------------------------------

  for (
    const asset of assets
  ) {

    const id =
      asset._id.toString();


    if (
      !existingIds.has(id)
    ) {

      user.assignedAsset.push(
        asset._id
      );

      existingIds.add(id);

    }

  }


  await user.save();


  return user;

};


// ==========================================================
// UNASSIGN ONE STANDALONE DAIRY ASSET
// ==========================================================

exports.unassignDairyAsset =
async (
  userId,
  assetId
) => {

  const user =
    await User.findById(
      userId
    );


  if (!user) {

    throw new Error(
      "User not found."
    );

  }


  if (
    user.role === "admin"
  ) {

    throw new Error(
      "An Administrator cannot have assigned standalone Dairy assets."
    );

  }


  if (
    !mongoose.Types.ObjectId.isValid(
      assetId
    )
  ) {

    throw new Error(
      "Invalid standalone asset."
    );

  }


  const asset =
    await Dairy.findOne({

      _id: assetId,

      code: null,

      assetCode: null

    });


  if (!asset) {

    throw new Error(
      "The selected record is not a valid standalone asset."
    );

  }


  user.assignedAsset =
    (user.assignedAsset || [])
      .filter(
        id =>
          String(
            id._id || id
          ) !==
          String(assetId)
      );


  await user.save();


  return user;

};


// ==========================================================
// DELETE USER
// ==========================================================

exports.deleteUser =
async (userId) => {

  const deletedUser =
    await User.findByIdAndDelete(
      userId
    );


  if (!deletedUser) {

    throw new Error(
      "User not found."
    );

  }


  return deletedUser;

};