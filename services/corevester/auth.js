const crypto = require("crypto");
const User = require("../../models/corevester/user");
const { sendResetEmail } = require("../../utils/mailer");

// ==========================================================
// SIGNUP
// ==========================================================
exports.signup = async ({ name, fullName, email, password, phone }) => {
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new Error("Account already exists");
  }

  const user = await User.create({
    fullName: fullName || name,
    name: name || fullName,
    email: email.toLowerCase(),
    password,
    phone,
    role: 'client'
  });

  return user;
};

// ==========================================================
// LOGIN
// ==========================================================
exports.login = async ({ email, password }) => {
  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
  if (!user) {
    throw new Error("Invalid email or password");
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new Error("Invalid email or password");
  }

  user.lastLogin = new Date();
  await user.save();

  return user;
};

// ==========================================================
// FORGOT PASSWORD
// ==========================================================
exports.forgotPassword = async (email, baseUrl) => {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new Error("No account with that email");
  }

  const token = crypto.randomBytes(32).toString("hex");

  user.resetToken = token;
  user.resetTokenExpiry = Date.now() + 1000 * 60 * 15; // 15 min
  await user.save();

  const effectiveBaseUrl = baseUrl || process.env.FRONTEND_URL || "http://localhost:3000";
  const resetLink = `${effectiveBaseUrl.replace(/\/$/, "")}/auth/reset-password/${token}`;

  await sendResetEmail(email, resetLink);

  return true;
};

// ==========================================================
// RESET PASSWORD
// ==========================================================
exports.resetPassword = async (token, newPassword) => {
  const user = await User.findOne({
    resetToken: token,
    resetTokenExpiry: { $gt: Date.now() }
  });

  if (!user) {
    throw new Error("Invalid or expired token");
  }

  user.password = newPassword;
  user.resetToken = undefined;
  user.resetTokenExpiry = undefined;
  await user.save();

  return true;
};