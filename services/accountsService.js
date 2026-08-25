// ==========================================================
// services/accountsService.js
// ==========================================================

const mongoose = require("mongoose");

const User =
  require("../models/projectUser");

const Dairy =
  require("../models/dairy");


// ==========================================================
// GET ALL USERS
// ==========================================================

exports.getAllUsers = async () => {

  return await User.find();

};


// ==========================================================
// GET USER PROFILE DATA
// ==========================================================

exports.getUserProfileData =
async (userId) => {

  const user =
    await User.findById(userId)
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


  // --------------------------------------------------------
  // Available Dairy Farms
  //
  // Farm rule:
  //
  //     code < 0
  //
  // --------------------------------------------------------

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


  // --------------------------------------------------------
  // Available standalone / code-less assets
  //
  // Asset rule:
  //
  //     code      === null
  //     assetCode === null
  //
  // --------------------------------------------------------

  const assets =
    await Dairy.find({

      code: null,

      assetCode: null

    })
      .select(
        "name code assetCode type condition location description displayImage profileImage status refNo"
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
  // Admins cannot have assigned standalone assets.
  // --------------------------------------------------------

  if (
    role === "admin"
  ) {

    update.assignedAsset = [];

  }


  return await User.findByIdAndUpdate(

    userId,

    update,

    {
      new: true,
      runValidators: true
    }

  );

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


  // --------------------------------------------------------
  // Only dairyWorker can be assigned Dairy Farms.
  // --------------------------------------------------------

  if (
    user.role !== "dairyWorker"
  ) {

    throw new Error(
      "Only a Dairy Worker can be assigned Dairy Farms."
    );

  }


  if (
    !Array.isArray(assignedFarms)
  ) {

    assignedFarms =
      assignedFarms
        ? [assignedFarms]
        : [];

  }


  // --------------------------------------------------------
  // Remove empty values.
  // --------------------------------------------------------

  assignedFarms =
    assignedFarms.filter(
      id =>
        id &&
        String(id).trim()
    );


  if (
    !assignedFarms.length
  ) {

    return user;

  }


  // --------------------------------------------------------
  // Remove duplicate submitted IDs.
  // --------------------------------------------------------

  const uniqueIds =
    [
      ...new Set(
        assignedFarms.map(
          id =>
            String(id)
        )
      )
    ];


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
        "_id code name assetCode"
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
  // Add only farms that aren't already assigned.
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
// ELIGIBLE DAIRY:
//
//     code      === null
//     assetCode === null
//
// ELIGIBLE USERS:
//
//     Any user except admin.
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
  // Admins cannot receive assigned assets.
  // --------------------------------------------------------

  if (
    user.role === "admin"
  ) {

    throw new Error(
      "An Administrator cannot be assigned standalone Dairy assets."
    );

  }


  // --------------------------------------------------------
  // Normalize submitted values.
  // --------------------------------------------------------

  if (
    !Array.isArray(assignedAssets)
  ) {

    assignedAssets =
      assignedAssets
        ? [assignedAssets]
        : [];

  }


  // --------------------------------------------------------
  // Remove empty values.
  // --------------------------------------------------------

  assignedAssets =
    assignedAssets.filter(
      id =>
        id &&
        String(id).trim()
    );


  if (
    !assignedAssets.length
  ) {

    return user;

  }


  // --------------------------------------------------------
  // Remove duplicate submitted IDs.
  // --------------------------------------------------------

  const uniqueIds =
    [
      ...new Set(
        assignedAssets.map(
          id =>
            String(id)
        )
      )
    ];


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
  // Find ONLY standalone/code-less assets.
  //
  // IMPORTANT:
  //
  //     code      must be null
  //     assetCode must be null
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
        "_id name code assetCode type condition location description"
      );


  // --------------------------------------------------------
  // Every submitted ID must correspond to an eligible
  // standalone asset.
  // --------------------------------------------------------

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

  const existingIds =
    new Set(

      (user.assignedAsset || [])
        .map(
          id =>
            String(
              id._id || id
            )
        )

    );


  // --------------------------------------------------------
  // Add only assets that are not already assigned.
  // --------------------------------------------------------

  for (
    const asset of assets
  ) {

    const id =
      asset._id.toString();


    if (
      !existingIds.has(id)
    ) {

      if (
        !Array.isArray(
          user.assignedAsset
        )
      ) {

        user.assignedAsset = [];

      }


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
//
// Removes the Dairy ObjectId from:
//
//     user.assignedAsset
//
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


  // --------------------------------------------------------
  // Admins cannot have assigned assets.
  // --------------------------------------------------------

  if (
    user.role === "admin"
  ) {

    throw new Error(
      "An Administrator cannot have assigned standalone Dairy assets."
    );

  }


  // --------------------------------------------------------
  // Validate ObjectId.
  // --------------------------------------------------------

  if (
    !mongoose.Types.ObjectId.isValid(
      assetId
    )
  ) {

    throw new Error(
      "Invalid standalone asset."
    );

  }


  // --------------------------------------------------------
  // Confirm that the Dairy is actually a standalone asset.
  // --------------------------------------------------------

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


  // --------------------------------------------------------
  // Remove asset from assignedAsset.
  // --------------------------------------------------------

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

  return await User.findByIdAndDelete(
    userId
  );

};