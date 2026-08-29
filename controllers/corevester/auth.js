const authService = require("../../services/corevester/auth");

// ==========================================================
// RENDER PAGES
// ==========================================================
exports.renderSignup = (req, res) => {
  res.render("corevester/signup", { title: "Sign Up - Corevester", error: null });
};

exports.renderLogin = (req, res) => {
  res.render("corevester/login", { title: "Login - Corevester", error: null });
};

exports.renderForgot = (req, res) => {
  res.render("corevester/forgot-password", { title: "Forgot Password", error: null, success: null });
};

exports.renderReset = (req, res) => {
  res.render("corevester/reset-password", { title: "Reset Password", token: req.params.token, error: null });
};

// ==========================================================
// SIGNUP
// ==========================================================
exports.signup = async (req, res) => {
  try {
    let { name, fullName, email, password, phone } = req.body;
    email = email.toLowerCase().trim();
    const profileImage = req.file ? req.file.filename : "";

    if (!email || !password || (!name && !fullName)) {
      const msg = "All required fields must be filled";
      if (req.xhr) return res.status(400).json({ success: false, message: msg });
      return res.render("corevester/signup", { title: "Sign Up - Corevester", error: msg });
    }

    if (password.length < 6) {
      const msg = "Password must be at least 6 characters";
      if (req.xhr) return res.status(400).json({ success: false, message: msg });
      return res.render("corevester/signup", { title: "Sign Up - Corevester", error: msg });
    }

    const user = await authService.signup({ name, fullName, email, password, phone, profileImage });

    // Auto login after signup for Corevester
    req.session.userId = user._id;
    req.session.role = user.role;
    req.session.user = { _id: user._id, id: user._id, name: user.fullName || user.name, fullName: user.fullName, email: user.email, role: user.role };

    req.session.save((err) => {
      if (err) {
        if (req.xhr) return res.status(500).json({ success: false, message: "Session save failed" });
        return res.render("corevester/signup", { title: "Sign Up - Corevester", error: "Signup ok but session failed" });
      }
      if (req.xhr) return res.json({ success: true, redirect: "/" });
      return res.redirect("/");
    });

  } catch (err) {
    console.error("Signup error:", err);
    if (req.xhr) return res.status(400).json({ success: false, message: err.message });
    return res.render("corevester/signup", { title: "Sign Up - Corevester", error: err.message });
  }
};

// ==========================================================
// LOGIN
// ==========================================================
exports.login = async (req, res) => {
  try {
    let { email, password } = req.body;
    email = email.toLowerCase().trim();

    const user = await authService.login({ email, password });

    req.session.userId = user._id;
    req.session.role = user.role;
    req.session.user = {
      _id: user._id,
      id: user._id,
      name: user.fullName || user.name,
      fullName: user.fullName,
      role: user.role,
      email: user.email,
      profileImage: user.profileImage || ""
    };

    req.session.save((sessionError) => {
      if (sessionError) {
        console.error("Session save error:", sessionError);
        if (req.xhr) return res.status(500).json({ success: false, message: "Session save failed" });
        return res.status(500).render("corevester/login", { title: "Login - Corevester", error: "Login succeeded, but session could not be saved." });
      }

      const redirectTo = user.role === "admin" ? "/admin/products" : "/";

      if (req.xhr) return res.json({ success: true, redirect: redirectTo });
      return res.redirect(redirectTo);
    });

  } catch (err) {
    console.error("Login error:", err);
    if (req.xhr) return res.status(401).json({ success: false, message: err.message });
    return res.render("corevester/login", { title: "Login - Corevester", error: err.message });
  }
};

// ==========================================================
// LOGOUT
// ==========================================================
exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error("Logout error:", err);
    res.clearCookie("connect.sid");
    return res.redirect("/auth/login");
  });
};

// ==========================================================
// FORGOT PASSWORD
// ==========================================================
exports.forgotPassword = async (req, res) => {
  try {
    let { email } = req.body;
    email = email.toLowerCase().trim();
    const requestOrigin = process.env.FRONTEND_URL || `${req.protocol}://${req.get("host")}`;

    await authService.forgotPassword(email, requestOrigin);

    if (req.xhr) return res.json({ success: true, message: "Reset link sent" });
    return res.render("corevester/forgot-password", { title: "Forgot Password", success: "Reset link sent successfully.", error: null });

  } catch (err) {
    console.error("Forgot password error:", err);
    if (req.xhr) return res.status(400).json({ success: false, message: err.message });
    return res.render("corevester/forgot-password", { title: "Forgot Password", error: err.message, success: null });
  }
};

// ==========================================================
// RESET PASSWORD
// ==========================================================
exports.resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    const token = req.params.token;

    if (!password || password.length < 6) {
      const msg = "Password must be at least 6 characters";
      if (req.xhr) return res.status(400).json({ success: false, message: msg });
      return res.render("corevester/reset-password", { title: "Reset Password", token, error: msg });
    }

    await authService.resetPassword(token, password);

    if (req.xhr) return res.json({ success: true, redirect: "/auth/login" });
    return res.redirect("/auth/login");

  } catch (err) {
    console.error("Reset password error:", err);
    if (req.xhr) return res.status(400).json({ success: false, message: err.message });
    return res.render("corevester/reset-password", { title: "Reset Password", token: req.params.token, error: err.message });
  }
};