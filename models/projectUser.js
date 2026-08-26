// ==========================================================
// models/projectUser.js
// PROJECT USER MODEL
// ==========================================================
//
// USER ROLES:
//
//     dairyWorker
//     poultryWorker
//     admin
//
// DAIRY RELATIONSHIPS:
//
//     assignedFarm
//         = Dairy Farm documents assigned to a dairyWorker.
//
//     assignedAsset
//         = Individual Dairy assets assigned to a user.
//
// ASSIGNED ASSET ELIGIBILITY:
//
// An asset may be assigned when:
//
//     1. assetCode is absent, null, or empty
//
// AND
//
//     2. The Dairy record is NOT a Dairy Farm.
//
// Eligible records therefore include:
//
//     code > 0
//         = identified animal / asset
//
//     code === null / undefined
//         = unnumbered structure / facility / equipment
//           ONLY when assetCode is absent / null / empty
//
// A Dairy Farm:
//
//     code < 0
//
// is NEVER an assignedAsset.
//
// IMPORTANT:
//
// This model stores the ObjectId references only.
// Eligibility validation belongs in the assignment
// service/controller.
// ==========================================================


const mongoose = require("mongoose");
const bcrypt = require("bcrypt");


// ==========================================================
// USER SCHEMA
// ==========================================================

const userSchema = new mongoose.Schema(

  {

    // ========================================================
    // PROFILE IMAGE
    // ========================================================

    profileImage: {

      type: String,

      default: "",

    },


    // ========================================================
    // NAME
    // ========================================================

    name: {

      type: String,

      required: [true, "Name is required"],

      trim: true,

    },


    // ========================================================
    // EMAIL
    // ========================================================

    email: {

      type: String,

      required: [true, "Email is required"],

      unique: true,

      lowercase: true,

      trim: true,

      index: true,

    },


    // ========================================================
    // PHONE
    // ========================================================

    phone: {

      type: String,

      default: null,

    },


    // ========================================================
    // PASSWORD
    // ========================================================

    password: {

      type: String,

      required: [true, "Password is required"],

      minlength: 6,

      select: false,

    },


    // ========================================================
    // ROLE
    // ========================================================

    role: {

      type: String,

      enum: [

        "dairyWorker",

        "poultryWorker",

        "admin"

      ],

      default: "dairyWorker",

    },


    // ========================================================
    // ASSIGNED FARMS
    //
    // Only dairyWorker users use this relationship.
    //
    // Each value references a Dairy document representing
    // a Dairy Farm.
    //
    // Dairy Farm identification:
    //
    //     code < 0
    //
    // A dairyWorker may have:
    //
    //     - No assigned farms
    //     - One assigned farm
    //     - Several assigned farms
    // ========================================================

    assignedFarm: {

      type: [

        {

          type: mongoose.Schema.Types.ObjectId,

          ref: "Dairy",

        }

      ],

      default: [],

    },


    // ========================================================
    // ASSIGNED ASSETS
    //
    // Assets assigned directly to the user.
    //
    // Each value references a Dairy document.
    //
    // --------------------------------------------------------
    // ELIGIBILITY RULES
    // --------------------------------------------------------
    //
    // An asset is eligible for assignment when:
    //
    //     assetCode is absent / null / empty
    //
    // AND
    //
    //     the record is NOT a Dairy Farm.
    //
    // --------------------------------------------------------
    //
    // IDENTIFIED ASSETS
    //
    //     code > 0
    //
    // These are eligible when they have no assetCode.
    //
    // Example:
    //
    //     code = 25
    //     assetCode = null
    //
    //     → eligible for assignedAsset
    //
    // --------------------------------------------------------
    //
    // UNNUMBERED ASSETS
    //
    //     code = null / undefined
    //
    // These are also eligible when they have no assetCode.
    //
    // Example:
    //
    //     code = null
    //     assetCode = null
    //
    //     → eligible for assignedAsset
    //
    // This includes standalone structures, facilities,
    // equipment, and other unnumbered Dairy records.
    //
    // --------------------------------------------------------
    //
    // DAIRY FARMS
    //
    //     code < 0
    //
    // These are NEVER eligible for assignedAsset.
    //
    // --------------------------------------------------------
    //
    // IMPORTANT
    //
    // This schema does not validate the referenced Dairy
    // document's code or assetCode.
    //
    // The assignment service/controller MUST validate that
    // the Dairy record satisfies the eligibility rules before
    // adding its _id to this array.
    //
    // One user may have:
    //
    //     - No assigned assets
    //     - One assigned asset
    //     - Several assigned assets
    //
    // ========================================================

    assignedAsset: {

      type: [

        {

          type: mongoose.Schema.Types.ObjectId,

          ref: "Dairy",

        }

      ],

      default: [],

    },


    // ========================================================
    // LAST LOGIN
    // ========================================================

    lastLogin: {

      type: Date,

      default: null,

    },


    // ========================================================
    // PASSWORD RESET TOKEN
    // ========================================================

    resetToken: {

      type: String,

      default: null,

    },


    // ========================================================
    // PASSWORD RESET TOKEN EXPIRY
    // ========================================================

    resetTokenExpiry: {

      type: Date,

      default: null,

    },

  },


  // ==========================================================
  // SCHEMA OPTIONS
  // ==========================================================

  {

    timestamps: true,

    collection: "project-Users",

  }

);


// ==========================================================
// HASH PASSWORD
// ==========================================================
//
// Passwords are hashed only when the password field has
// actually been modified.
//
// This prevents an already-hashed password from being
// hashed again when another user field is updated.
// ==========================================================

userSchema.pre(

  "save",

  async function(next) {

    try {

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

    catch (error) {

      next(error);

    }

  }

);


// ==========================================================
// COMPARE PASSWORD
// ==========================================================
//
// Used during authentication.
//
// Because password has select: false, the authentication
// query must explicitly request the password field when
// calling this method.
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
//
// Reuse the existing compiled model when available.
// This prevents OverwriteModelError during development,
// hot reloads, or repeated imports.
// ==========================================================

module.exports =

  mongoose.models.User ||

  mongoose.model(

    "User",

    userSchema

  );