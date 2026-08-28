const authService = require('../../services/corevester/auth');

exports.showSignup = (req,res) => res.render('signup');
exports.showLogin = (req,res) => res.render('login');

exports.signup = async (req,res) => {
  try{
    const { fullName, email, password, role } = req.body;
    if(!fullName || !email || !password) return res.status(400).json({ success:false, message:'All fields required' });
    
    const user = await authService.registerUser({ fullName, email, password, role });
    
    // SESSION
    req.session.userId = user._id;
    req.session.role = user.role;
    req.session.fullName = user.fullName;
    
    return res.json({ success:true, role:user.role, redirect: user.role==='admin'?'/admin/dashboard':'/products' });
  }catch(err){
    return res.status(400).json({ success:false, message: err.message });
  }
};

exports.login = async (req,res) => {
  try{
    const { email, password } = req.body;
    const user = await authService.loginUser({ email, password });
    
    // SESSION
    req.session.userId = user._id;
    req.session.role = user.role;
    req.session.fullName = user.fullName;
    req.session.email = user.email;
    
    return res.json({ success:true, role:user.role, redirect: user.role==='admin'?'/admin/dashboard':'/products' });
  }catch(err){
    return res.status(401).json({ success:false, message: err.message });
  }
};

exports.logout = (req,res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/auth/login');
  });
};