const mongoose = require("mongoose");
const crypto = require("crypto");

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['admin','client'], default: 'client' }
}, { timestamps: true });

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return hash === derived;
}

userSchema.pre('save', function(next){
  if(!this.isModified('password')) return next();
  this.password = hashPassword(this.password);
  next();
});

userSchema.methods.comparePassword = function(candidate){
  return verifyPassword(candidate, this.password);
};

module.exports = mongoose.models.CorevesterUser || mongoose.model("CorevesterUser", userSchema);