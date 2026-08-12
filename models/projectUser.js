const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
{
  // ==========================================================
  // PROFILE IMAGE
  // ==========================================================

  profileImage: {
    type: String,
    default: "",
  },


  // ==========================================================
  // NAME
  // ==========================================================

  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
  },


  // ==========================================================
  // EMAIL
  // ==========================================================

  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },


  // ==========================================================
  // PHONE
  // ==========================================================

  phone: {
    type: String,
    default: null,
  },


  // ==========================================================
  // PASSWORD
  // ==========================================================

  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: 6,
    select: false,
  },


  // ==========================================================
  // ROLE
  // ==========================================================

  role: {
    type: String,

    enum: [
      "dairyWorker",
      "poultryWorker",
      "admin"
    ],

    default: "dairyWorker",
  },


  // ==========================================================
  // ASSIGNED FARMS
  //
  // Only dairyWorker users use this field.
  //
  // One dairyWorker may have:
  //
  //     - No assigned farms
  //     - One assigned farm
  //     - Several assigned farms
  //
  // Each value references a Dairy document.
  //
  // The referenced Dairy document must represent a
  // Dairy Farm, identified by a negative Dairy.code.
  // ==========================================================

  assignedFarm: {

    type: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Dairy",
      }
    ],

    default: [],

  },


  // ==========================================================
  // LAST LOGIN
  // ==========================================================

  lastLogin: {
    type: Date,
    default: null,
  },


  // ==========================================================
  // PASSWORD RESET
  // ==========================================================

  resetToken: {
    type: String,
    default: null,
  },

  resetTokenExpiry: {
    type: Date,
    default: null,
  },

},
{
  timestamps: true,

  collection: "project-Users",
});


// ==========================================================
// HASH PASSWORD
// ==========================================================

userSchema.pre(
  "save",
  async function(next) {

    if (!this.isModified("password")) {

      return next();

    }

    const salt =
      await bcrypt.genSalt(10);

    this.password =
      await bcrypt.hash(
        this.password,
        salt
      );

    next();

  }
);


// ==========================================================
// COMPARE PASSWORD
// ==========================================================

userSchema.methods.comparePassword =
async function(candidatePassword) {

  return bcrypt.compare(
    candidatePassword,
    this.password
  );

};


// ==========================================================
// MODEL
// ==========================================================

module.exports =
  mongoose.models.User ||

  mongoose.model(
    "User",
    userSchema
  );