const mongoose = require("mongoose");
const crypto = require("crypto");

// ==========================================================
// HASH HELPERS - using native crypto, no bcrypt install needed
// ==========================================================
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(derived));
}

// ==========================================================
// SCHEMA
// ==========================================================
const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    phone: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ["admin", "client"],
      default: "client",
    },
    lastLogin: {
      type: Date,
    },
    resetToken: {
      type: String,
      default: undefined,
    },
    resetTokenExpiry: {
      type: Date,
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

// ==========================================================
// PRE SAVE - HASH + SYNC name / fullName
// ==========================================================
userSchema.pre("save", function (next) {
  // Keep name and fullName in sync
  if (this.fullName && !this.name) this.name = this.fullName;
  if (this.name && !this.fullName) this.fullName = this.name;

  if (!this.isModified("password")) return next();

  this.password = hashPassword(this.password);
  next();
});

// ==========================================================
// METHODS
// ==========================================================
userSchema.methods.comparePassword = function (candidatePassword) {
  return verifyPassword(candidatePassword, this.password);
};

// Hide sensitive fields in JSON
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.resetToken;
  delete obj.resetTokenExpiry;
  return obj;
};

module.exports =
  mongoose.models.CorevesterUser ||
  mongoose.model("CorevesterUser", userSchema, "corevester_users");