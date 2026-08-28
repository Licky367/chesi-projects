// ==========================================================
// models/user.js
// USER MODEL
// ==========================================================

const mongoose = require("mongoose");
const crypto = require("crypto");


// ==========================================================
// USER SCHEMA
// ==========================================================

const userSchema = new mongoose.Schema(
  {

    // --------------------------------------------------------
    // BASIC INFORMATION
    // --------------------------------------------------------

    name: {
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

    phone: {
      type: String,
      trim: true,
      default: ""
    },


    // --------------------------------------------------------
    // PASSWORD
    // --------------------------------------------------------

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false
    },


    // --------------------------------------------------------
    // USER ROLE
    // --------------------------------------------------------

    role: {
      type: String,
      default: "user",
      trim: true
    },


    // --------------------------------------------------------
    // ASSIGNED FARMS
    // --------------------------------------------------------

    assignedFarm: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Dairy"
      }
    ],


    // --------------------------------------------------------
    // LOGIN INFORMATION
    // --------------------------------------------------------

    lastLogin: {
      type: Date,
      default: null
    },


    // --------------------------------------------------------
    // PASSWORD RESET
    // --------------------------------------------------------

    resetToken: {
      type: String,
      default: undefined,
      select: false
    },

    resetTokenExpiry: {
      type: Date,
      default: undefined,
      select: false
    }

  },
  {
    timestamps: true
  }
);


// ==========================================================
// HASH PASSWORD
// ==========================================================

function hashPassword(password) {

  const salt =
    crypto.randomBytes(16).toString("hex");

  const hash =
    crypto
      .scryptSync(
        password,
        salt,
        64
      )
      .toString("hex");

  return `${salt}:${hash}`;

}


// ==========================================================
// VERIFY PASSWORD
// ==========================================================

function verifyPassword(
  password,
  storedPassword
) {

  if (!storedPassword) {
    return false;
  }

  const parts =
    storedPassword.split(":");

  if (parts.length !== 2) {
    return false;
  }

  const [
    salt,
    storedHash
  ] = parts;

  const hash =
    crypto
      .scryptSync(
        password,
        salt,
        64
      )
      .toString("hex");

  const storedHashBuffer =
    Buffer.from(
      storedHash,
      "hex"
    );

  const hashBuffer =
    Buffer.from(
      hash,
      "hex"
    );

  if (
    storedHashBuffer.length !==
    hashBuffer.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    storedHashBuffer,
    hashBuffer
  );

}


// ==========================================================
// HASH PASSWORD BEFORE SAVE
// ==========================================================

userSchema.pre(
  "save",
  function (next) {

    if (!this.isModified("password")) {
      return next();
    }

    this.password =
      hashPassword(
        this.password
      );

    next();

  }
);


// ==========================================================
// COMPARE PASSWORD
// ==========================================================

userSchema.methods.comparePassword =
function (candidatePassword) {

  return verifyPassword(
    candidatePassword,
    this.password
  );

};


// ==========================================================
// MODEL
// ==========================================================

module.exports =
  mongoose.model(
    "User",
    userSchema
  );