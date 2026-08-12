const crypto = require("crypto");

const ProjectUser =
  require("../models/projectUser");

const ProjectUserInvitation =
  require("../models/projectUserInvitations");

const {
  sendResetEmail
} = require("../utils/mailer");


// ========================,==================================
// SIGNUP
// ==========================================================

exports.signup = async ({
  name,
  email,
  password,
  phone,
  profileImage
}) => {

  // --------------------------------------------------------
  // CHECK EXISTING ACCOUNT
  // --------------------------------------------------------

  const existingUser =
    await ProjectUser.findOne({
      email
    });

  if (existingUser) {

    throw new Error(
      "Account already exists"
    );

  }


  // --------------------------------------------------------
  // FIND INVITATION
  // --------------------------------------------------------

  const invitation =
    await ProjectUserInvitation.findOne({
      email
    });

  if (!invitation) {

    throw new Error(
      "You are not invited to register"
    );

  }


  if (invitation.used) {

    throw new Error(
      "Invitation already used"
    );

  }


  // --------------------------------------------------------
  // GET ASSIGNED FARMS FROM INVITATION
  //
  // Supports an invitation containing:
  //
  // assignedFarm
  //
  // or:
  //
  // assignedFarms
  //
  // The resulting user field is always:
  //
  // assignedFarm: []
  // --------------------------------------------------------

  let assignedFarm = [];


  if (
    Array.isArray(
      invitation.assignedFarms
    )
  ) {

    assignedFarm =
      invitation.assignedFarms
        .filter(Boolean)
        .map(farm =>
          farm._id
            ? farm._id
            : farm
        );

  }
  else if (
    Array.isArray(
      invitation.assignedFarm
    )
  ) {

    assignedFarm =
      invitation.assignedFarm
        .filter(Boolean)
        .map(farm =>
          farm._id
            ? farm._id
            : farm
        );

  }
  else if (
    invitation.assignedFarm
  ) {

    assignedFarm = [
      invitation.assignedFarm._id
        ? invitation.assignedFarm._id
        : invitation.assignedFarm
    ];

  }


  // --------------------------------------------------------
  // CREATE USER
  // --------------------------------------------------------

  const user =
    await ProjectUser.create({

      name,

      email,

      password,

      phone,

      profileImage:
        profileImage || "",

      role:
        invitation.role,

      assignedFarm

    });


  // --------------------------------------------------------
  // MARK INVITATION AS USED
  // --------------------------------------------------------

  invitation.used = true;

  await invitation.save();


  return user;

};


// ==========================================================
// LOGIN
// ==========================================================

exports.login = async ({
  email,
  password
}) => {

  // --------------------------------------------------------
  // FIND USER
  // --------------------------------------------------------

  const user =
    await ProjectUser
      .findOne({
        email
      })
      .select("+password");


  if (!user) {

    throw new Error(
      "Invalid email or password"
    );

  }


  // --------------------------------------------------------
  // CHECK PASSWORD
  // --------------------------------------------------------

  const isMatch =
    await user.comparePassword(
      password
    );


  if (!isMatch) {

    throw new Error(
      "Invalid email or password"
    );

  }


  // --------------------------------------------------------
  // UPDATE LAST LOGIN
  // --------------------------------------------------------

  user.lastLogin =
    new Date();


  await user.save();


  // --------------------------------------------------------
  // RETURN USER
  //
  // assignedFarm remains available to
  // authController for:
  //
  // 1. Initial dairy-worker redirect
  // 2. Session storage
  // --------------------------------------------------------

  return user;

};


// ==========================================================
// FORGOT PASSWORD
// ==========================================================

exports.forgotPassword =
async (
  email,
  baseUrl
) => {

  const user =
    await ProjectUser.findOne({
      email
    });


  if (!user) {

    throw new Error(
      "No account with that email"
    );

  }


  // --------------------------------------------------------
  // GENERATE RESET TOKEN
  // --------------------------------------------------------

  const token =
    crypto.randomBytes(32)
      .toString("hex");


  user.resetToken =
    token;


  user.resetTokenExpiry =
    Date.now() +
    1000 * 60 * 15;


  await user.save();


  // --------------------------------------------------------
  // BUILD RESET URL
  // --------------------------------------------------------

  const effectiveBaseUrl =
    baseUrl ||
    process.env.FRONTEND_URL ||
    "http://localhost:3000";


  const resetLink =
    `${effectiveBaseUrl.replace(/\/$/, "")}` +
    `/reset-password/${token}`;


  // --------------------------------------------------------
  // SEND EMAIL
  // --------------------------------------------------------

  await sendResetEmail(
    email,
    resetLink
  );


  return true;

};


// ==========================================================
// RESET PASSWORD
// ==========================================================

exports.resetPassword =
async (
  token,
  newPassword
) => {

  // --------------------------------------------------------
  // FIND VALID TOKEN
  // --------------------------------------------------------

  const user =
    await ProjectUser.findOne({

      resetToken:
        token,

      resetTokenExpiry: {
        $gt: Date.now()
      }

    });


  if (!user) {

    throw new Error(
      "Invalid or expired token"
    );

  }


  // --------------------------------------------------------
  // UPDATE PASSWORD
  // --------------------------------------------------------

  user.password =
    newPassword;


  // --------------------------------------------------------
  // REMOVE RESET TOKEN
  // --------------------------------------------------------

  user.resetToken =
    undefined;


  user.resetTokenExpiry =
    undefined;


  await user.save();


  return true;

};