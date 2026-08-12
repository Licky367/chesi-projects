// ==========================================================
// services/accountsService.js
// ==========================================================

const User = require("../models/projectUser");
const Dairy = require("../models/dairy");


// ==========================================================
// GET ALL USERS
// ==========================================================

exports.getAllUsers = async () => {

  return await User
    .find()
    .select("+password");

};


// ==========================================================
// GET USER PROFILE DATA
//
// Returns:
//   - User
//   - All Dairy Farms
//
// assignedFarm is populated so accountsProfile.ejs can
// display the farm names and codes.
// ==========================================================

exports.getUserProfileData = async (userId) => {

  const user =
    await User
      .findById(userId)
      .populate({
        path: "assignedFarm",
        select: "name code profileImage status"
      });


  const dairies =
    await Dairy
      .find({
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

exports.getUserById = async (userId) => {

  return await User
    .findById(userId)
    .populate({
      path: "assignedFarm",
      select: "name code profileImage status"
    });

};


// ==========================================================
// UPDATE USER ROLE
// ==========================================================

exports.updateUserRole = async (
  userId,
  role
) => {

  return await User.findByIdAndUpdate(

    userId,

    {
      role
    },

    {
      new: true,
      runValidators: true
    }

  );

};


// ==========================================================
// ASSIGN ADDITIONAL DAIRY FARMS
//
// This ADDS farms to the user's existing assignments.
//
// It does NOT replace the farms already assigned.
// ==========================================================

exports.assignDairyFarms = async (
  userId,
  assignedFarms
) => {

  // ========================================================
  // FIND USER
  // ========================================================

  const user =
    await User.findById(userId);


  if (!user) {

    throw new Error(
      "User not found."
    );

  }


  // ========================================================
  // USER MUST BE A DAIRY WORKER
  // ========================================================

  if (
    user.role !== "dairyWorker"
  ) {

    throw new Error(
      "Only Dairy Workers can be assigned Dairy Farms."
    );

  }


  // ========================================================
  // NORMALIZE EXISTING ASSIGNMENTS
  // ========================================================

  if (!Array.isArray(user.assignedFarm)) {

    user.assignedFarm = [];

  }


  // ========================================================
  // REMOVE EMPTY VALUES
  // ========================================================

  assignedFarms =
    assignedFarms.filter(
      farmId =>
        farmId &&
        String(farmId).trim() !== ""
    );


  if (!assignedFarms.length) {

    return user;

  }


  // ========================================================
  // REMOVE DUPLICATES FROM SUBMITTED IDS
  // ========================================================

  const uniqueFarmIds =
    [
      ...new Set(
        assignedFarms.map(
          farmId =>
            String(farmId)
        )
      )
    ];


  // ========================================================
  // VERIFY THAT ALL SELECTED IDS ARE DAIRY FARMS
  //
  // Negative Dairy.code = Dairy Farm
  // ========================================================

  const farms =
    await Dairy.find({

      _id: {
        $in: uniqueFarmIds
      },

      code: {
        $lt: 0
      }

    }).select("_id code");


  // ========================================================
  // EVERY SUBMITTED ID MUST BE A VALID DAIRY FARM
  // ========================================================

  if (
    farms.length !== uniqueFarmIds.length
  ) {

    throw new Error(
      "One or more selected records are not valid Dairy Farms."
    );

  }


  // ========================================================
  // EXISTING FARM IDS
  // ========================================================

  const existingFarmIds =
    new Set(

      user.assignedFarm.map(
        farmId =>
          String(
            farmId._id ||
            farmId
          )
      )

    );


  // ========================================================
  // ADD ONLY NEW FARMS
  // ========================================================

  for (const farm of farms) {

    const farmId =
      farm._id.toString();


    if (
      !existingFarmIds.has(farmId)
    ) {

      user.assignedFarm.push(
        farm._id
      );

      existingFarmIds.add(
        farmId
      );

    }

  }


  // ========================================================
  // SAVE
  // ========================================================

  await user.save();


  return user;

};


// ==========================================================
// DELETE USER
// ==========================================================

exports.deleteUser = async (
  userId
) => {

  return await User.findByIdAndDelete(
    userId
  );

};