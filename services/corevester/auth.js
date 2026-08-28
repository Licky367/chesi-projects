const crypto = require("crypto");

const User =
  require("../../models/corevester/user");

const {
  sendResetEmail
} = require("../../utils/mailer");


// ==========================================================
// SIGNUP
// ==========================================================

exports.signup = async ({
  name,
  email,
  password,
  phone
}) => {

  // --------------------------------------------------------
  // CHECK EXISTING ACCOUNT
  // --------------------------------------------------------

  const existingUser =
    await User.findOne({
      email
    });

  if (existingUser) {

    throw new Error(
      "Account already exists"
    );

  }


  // --------------------------------------------------------
  // CREATE USER
  // --------------------------------------------------------

  const user =
    await User.create({

      name,

      email,

      password,

      phone

    });


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
    await User
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
    await User.findOne({
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
    await User.findOne({

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