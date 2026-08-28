// ==========================================================
// models/corevester/user.js
// ==========================================================
//
// COREVESTER USER MODEL
//
// RESPONSIBILITIES:
// ----------------------------------------------------------
// • Store CoreVester users
// • Store authentication credentials
// • Hash passwords before saving
// • Verify login passwords
// • Store user roles
//
// ==========================================================

const mongoose = require("mongoose");
const crypto = require("crypto");

// ==========================================================
// USER SCHEMA
// ==========================================================

const userSchema = new mongoose.Schema({

  fullName: {
    type: String,
    required: true,
    trim: true
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },

  password: {
    type: String,
    required: true,
    select: false
  },

  role: {
    type: String,
    enum: ["admin", "client"],
    default: "client"
  }

}, {
  timestamps: true
});

// ==========================================================
// PASSWORD HASHING
// ==========================================================

function hashPassword(password) {

  const salt = crypto
    .randomBytes(16)
    .toString("hex");

  const hash = crypto
    .scryptSync(password, salt, 64)
    .toString("hex");

  return `${salt}:${hash}`;
}

// ==========================================================
// PASSWORD VERIFICATION
// ==========================================================

function verifyPassword(password, stored) {

  if (!stored || typeof stored !== "string") {
    return false;
  }

  const parts = stored.split(":");

  if (parts.length !== 2) {
    return false;
  }

  const [salt, storedHash] = parts;

  try {

    const derivedHash = crypto
      .scryptSync(password, salt, 64)
      .toString("hex");

    const storedBuffer = Buffer.from(storedHash, "hex");
    const derivedBuffer = Buffer.from(derivedHash, "hex");

    if (storedBuffer.length !== derivedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      storedBuffer,
      derivedBuffer
    );

  } catch (err) {

    return false;
  }
}

// ==========================================================
// HASH PASSWORD BEFORE SAVE
// ==========================================================

userSchema.pre("save", function(next) {

  if (!this.isModified("password")) {
    return next();
  }

  this.password = hashPassword(this.password);

  next();
});

// ==========================================================
// COMPARE PASSWORD
// ==========================================================

userSchema.methods.comparePassword = function(candidate) {

  return verifyPassword(
    candidate,
    this.password
  );
};

// ==========================================================
// MODEL
// ==========================================================

module.exports =
  mongoose.models.CorevesterUser ||
  mongoose.model("CorevesterUser", userSchema);