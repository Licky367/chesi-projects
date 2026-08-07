const User = require("../models/projectUser");

// ================= GET ALL USERS =================
exports.getAllUsers = async () => {
  return await User.find().select("+password"); // optional: include password if needed
};

// ================= GET SINGLE USER =================
exports.getUserById = async (userId) => {
  return await User.findById(userId);
};

// ================= UPDATE USER ROLE =================
exports.updateUserRole = async (userId, role) => {
  return await User.findByIdAndUpdate(
    userId,
    { role },
    { new: true }
  );
};

// ================= DELETE USER =================
exports.deleteUser = async (userId) => {
  return await User.findByIdAndDelete(userId);
};