const authService = require("../../services/corevester/auth");

exports.showSignup = (req, res) => res.render("signup", { title: "Create Account" });
exports.showLogin = (req, res) => res.render("login", { title: "Login" });

exports.signup = async (req, res) => {
  try{
    const user = await authService.registerUser(req.body);
    req.session.userId = user._id;
    req.session.role = user.role;
    req.session.user = { id: user._id, fullName: user.fullName, email: user.email, role: user.role };
    
    req.session.save((err) => {
      if(err) return res.status(500).json({ success:false, message: 'Session error' });
      return res.json({ success:true, redirect:'/' });
    });
  }catch(err){
    return res.status(400).json({ success:false, message: err.message });
  }
};

exports.login = async (req, res) => {
  try{
    const user = await authService.loginUser(req.body);
    req.session.userId = user._id;
    req.session.role = user.role;
    req.session.user = { id: user._id, fullName: user.fullName, email: user.email, role: user.role };
    
    const redirectTo = user.role === 'admin' ? '/admin/products' : '/';
    
    req.session.save((err) => {
      if(err) return res.status(500).json({ success:false, message: 'Session error' });
      return res.json({ success:true, redirect: redirectTo });
    });
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