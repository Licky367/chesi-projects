// ==========================================================
// controllers/corevester/auth.js
// ==========================================================
//
// COREVESTER AUTH CONTROLLER
//
// RESPONSIBILITIES:
// ----------------------------------------------------------
// • Render signup page
// • Render login page
// • Register new users
// • Authenticate existing users
// • Create login sessions
// • Destroy login sessions
//
// AUTH FLOW:
// ----------------------------------------------------------
// SIGN UP
//     POST /auth/signup
//         ↓
//     Create account
//         ↓
//     Redirect to /auth/login
//
// LOGIN
//     POST /auth/login
//         ↓
//     Verify credentials
//         ↓
//     Create session
//         ↓
//     Redirect to /
//
// IMPORTANT:
// ----------------------------------------------------------
// Signup does NOT log the user in automatically.
// All authenticated roles redirect to "/" after login.
// ==========================================================

const authService = require("../../services/corevester/auth");

// ----------------------------------------------------------
// SHOW SIGNUP
// ----------------------------------------------------------

exports.showSignup = (req, res) => {
  return res.render("signup", {
    title: "Create Account"
  });
};

// ----------------------------------------------------------
// SHOW LOGIN
// ----------------------------------------------------------

exports.showLogin = (req, res) => {
  return res.render("login", {
    title: "Login"
  });
};

// ----------------------------------------------------------
// SIGNUP
// ----------------------------------------------------------

exports.signup = async (req, res) => {
  try {

    const user = await authService.registerUser(req.body);

    // ------------------------------------------------------
    // IMPORTANT:
    // Do NOT create a session here.
    //
    // A newly registered user must first go to the
    // login page and authenticate normally.
    // ------------------------------------------------------

    return res.json({
      success: true,
      redirect: "/auth/login"
    });

  } catch (err) {

    console.error("CoreVester signup error:", err);

    return res.status(400).json({
      success: false,
      message: err.message || "Unable to create account"
    });
  }
};

// ----------------------------------------------------------
// LOGIN
// ----------------------------------------------------------

exports.login = async (req, res) => {
  try {

    const user = await authService.loginUser(req.body);

    // ------------------------------------------------------
    // CREATE SESSION
    // ------------------------------------------------------

    req.session.userId = user._id.toString();
    req.session.role = user.role;

    req.session.user = {
      id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      role: user.role
    };

    // ------------------------------------------------------
    // ALL ROLES GO TO "/"
    // ------------------------------------------------------

    req.session.save((err) => {

      if (err) {
        console.error("CoreVester login session error:", err);

        return res.status(500).json({
          success: false,
          message: "Session error"
        });
      }

      return res.json({
        success: true,
        redirect: "/"
      });
    });

  } catch (err) {

    console.error("CoreVester login error:", err);

    return res.status(401).json({
      success: false,
      message: err.message || "Invalid credentials"
    });
  }
};

// ----------------------------------------------------------
// LOGOUT
// ----------------------------------------------------------

exports.logout = (req, res) => {

  req.session.destroy((err) => {

    if (err) {
      console.error("CoreVester logout error:", err);

      return res.status(500).send("Unable to logout");
    }

    res.clearCookie("connect.sid");

    return res.redirect("/auth/login");
  });
};