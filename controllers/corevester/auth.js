const authService = require("../../services/corevester/auth");

exports.showSignup = (req, res) => res.render("signup", { title: "Create Account" });
exports.showLogin = (req, res) => res.render("login", { title: "Login" });

exports.signup = async (req, res) => {
  try{
    const user = await authService.registerUser(req.body);
    req.session.userId = user._id;
    req.session.role = user.role;
    req.session.user = { id: user._id, fullName: user.fullName, email: user.email, role: user.role };
    
    if(req.xhr || req.headers.accept?.includes('json')){
      return res.json({ success:true, redirect:'/' });
    }
    return res.redirect('/');
  }catch(err){
    if(req.xhr || req.headers.accept?.includes('json')){
      return res.status(400).json({ success:false, message: err.message });
    }
    return res.render("signup", { title: "Create Account", error: err.message });
  }
};

exports.login = async (req, res) => {
  try{
    const user = await authService.loginUser(req.body);
    req.session.userId = user._id;
    req.session.role = user.role;
    req.session.user = { id: user._id, fullName: user.fullName, email: user.email, role: user.role };
    
    const redirectTo = user.role === 'admin' ? '/admin/products' : '/';
    
    if(req.xhr || req.headers.accept?.includes('json')){
      return res.json({ success:true, redirect: redirectTo });
    }
    return res.redirect(redirectTo);
  }catch(err){
    if(req.xhr || req.headers.accept?.includes('json')){
      return res.status(401).json({ success:false, message: err.message });
    }
    return res.render("login", { title: "Login", error: err.message });
  }
};

exports.logout = (req,res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/auth/login');
  });
};