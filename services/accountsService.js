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
          "name code profileImage status"
      });


  const dairies =
    await Dairy.find({

      code: {
        $lt: 0
      }

    })
      .select(
        "name code profileImage status"
      )
      .sort({
        name: 1
      });


  return {
    user,
    dairies
  };

};


// ==========================================================
// GET SINGLE USER
// ==========================================================

exports.getUserById =
async (userId) => {

  return await User.findById(
    userId
  ).populate({
    path: "assignedFarm",
    select:
      "name code profileImage status"
  });

};


// ==========================================================
// UPDATE USER ROLE
// ==========================================================

exports.updateUserRole =
async (userId, role) => {

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

  if (role !== "dairyWorker") {

    update.assignedFarm = [];

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
      id => id && String(id).trim()
    );


  if (!assignedFarms.length) {

    return user;

  }


  // --------------------------------------------------------
  // Remove duplicate submitted IDs.
  // --------------------------------------------------------

  const uniqueIds =
    [
      ...new Set(
        assignedFarms.map(
          id => String(id)
        )
      )
    ];


  // --------------------------------------------------------
  // Validate ObjectIds.
  // --------------------------------------------------------

  for (const id of uniqueIds) {

    if (
      !mongoose.Types.ObjectId.isValid(id)
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

    }).select("_id code name");


  if (
    farms.length !== uniqueIds.length
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

  for (const farm of farms) {

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
// DELETE USER
// ==========================================================

exports.deleteUser =
async (userId) => {

  return await User.findByIdAndDelete(
    userId
  );

};