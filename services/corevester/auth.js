const User = require('../../models/corevester/user');

exports.registerUser = async ({ fullName, email, password, role }) => {
  const exists = await User.findOne({ email });
  if(exists) throw new Error('Email already registered');
  
  const safeRole = role === 'admin' ? 'client' : (role || 'client');
  const user = await User.create({ fullName, email, password, role: safeRole });
  return user;
};

exports.loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+password');
  if(!user) throw new Error('Invalid email or password');
  
  const isMatch = await user.comparePassword(password);
  if(!isMatch) throw new Error('Invalid email or password');
  
  return user;
};