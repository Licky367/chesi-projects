const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
{
  profileImage: {
    type: String,
    default: "",
  },

  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
  },

  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },

  phone: {
    type: String,
    default: null,
  },

  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: 6,
    select: false,
  },

  role: {
    type: String,
    enum: ["dairyWorker", "poultryWorker", "admin"],
    default: "dairyWorker",
  },

  // ================= LAST LOGIN =================
  lastLogin: {
    type: Date,
    default: null,
  },

  // 🔐 Password reset support
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
}
);

// ================= HASH PASSWORD =================
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

  next();
});

// ================= COMPARE PASSWORD =================
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);