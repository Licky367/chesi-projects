// ==========================================================
// services/corevester/auth.js
// ==========================================================
//
// COREVESTER AUTH SERVICE
//
// RESPONSIBILITIES:
// ----------------------------------------------------------
// • Register users
// • Validate signup information
// • Prevent duplicate accounts
// • Authenticate users
// • Verify passwords
//
// ==========================================================

const User = require("../../models/corevester/user");

// ----------------------------------------------------------
// REGISTER USER
// ----------------------------------------------------------

exports.registerUser = async ({ fullName, email, password }) => {

  // --------------------------------------------------------
  // BASIC VALIDATION
  // --------------------------------------------------------

  if (!fullName || !email || !password) {
    throw new Error("All fields are required");
  }

  const cleanName = String(fullName).trim();
  const cleanEmail = String(email).trim().toLowerCase();
  const cleanPassword = String(password);

  if (!cleanName) {
    throw new Error("Full name is required");
  }

  if (!cleanEmail) {
    throw new Error("Email is required");
  }

  if (!cleanPassword) {
    throw new Error("Password is required");
  }

  // --------------------------------------------------------
  // PASSWORD VALIDATION
  // --------------------------------------------------------

  if (cleanPassword.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  // --------------------------------------------------------
  // CHECK EXISTING USER
  // --------------------------------------------------------

  const exists = await User.findOne({
    email: cleanEmail
  });

  if (exists) {
    throw new Error("Email already exists");
  }

  // --------------------------------------------------------
  // CREATE USER
  //
  // The User model's pre-save middleware handles
  // password hashing.
  // --------------------------------------------------------

  const user = await User.create({
    fullName: cleanName,
    email: cleanEmail,
    password: cleanPassword
  });

  return user;
};

// ----------------------------------------------------------
// LOGIN USER
// ----------------------------------------------------------

exports.loginUser = async ({ email, password }) => {

  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanPassword = String(password);

  // --------------------------------------------------------
  // PASSWORD HAS select:false
  //
  // Therefore explicitly request it here.
  // --------------------------------------------------------

  const user = await User
    .findOne({
      email: cleanEmail
    })
    .select("+password");

  if (!user) {
    throw new Error("Invalid credentials");
  }

  // --------------------------------------------------------
  // VERIFY PASSWORD
  // --------------------------------------------------------

  const validPassword = await user.comparePassword(cleanPassword);

  if (!validPassword) {
    throw new Error("Invalid credentials");
  }

  return user;
};