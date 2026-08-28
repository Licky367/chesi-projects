const User = require("../../models/corevester/user");

exports.registerUser = async ({ fullName, email, password }) => {
  if(!fullName || !email || !password) throw new Error('All fields required');
  const exists = await User.findOne({ email });
  if(exists) throw new Error('Email already exists');
  return await User.create({ fullName, email, password });
};

exports.loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+password');
  if(!user) throw new Error('Invalid credentials');
  const ok = await user.comparePassword(password);
  if(!ok) throw new Error('Invalid credentials');
  return user;
};