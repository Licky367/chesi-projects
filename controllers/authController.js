// ==========================================================
// controllers/authController.js
// ==========================================================

const authService =
  require("../services/authService");


// ==========================================================
// RENDER SIGNUP PAGE
// ==========================================================

exports.renderSignup = (req, res) => {

  res.render(
    "signup",
    {
      title: "Sign Up",
      error: null
    }
  );

};


// ==========================================================
// RENDER LOGIN PAGE
// ==========================================================

exports.renderLogin = (req, res) => {

  res.render(
    "login",
    {
      title: "Login",
      error: null
    }
  );

};


// ==========================================================
// RENDER FORGOT PASSWORD PAGE
// ==========================================================

exports.renderForgot = (req, res) => {

  res.render(
    "forgot-password",
    {
      title: "Forgot Password",
      error: null,
      success: null
    }
  );

};


// ==========================================================
// RENDER RESET PASSWORD PAGE
// ==========================================================

exports.renderReset = (req, res) => {

  res.render(
    "reset-password",
    {
      title: "Reset Password",
      token: req.params.token,
      error: null
    }
  );

};


// ==========================================================
// SIGNUP
// ==========================================================

exports.signup = async (req, res) => {

  try {

    let {
      name,
      email,
      password,
      phone
    } = req.body;


    // ======================================================
    // NORMALIZE EMAIL
    // ======================================================

    email =
      email
        .toLowerCase()
        .trim();


    // ======================================================
    // PROFILE IMAGE
    // ======================================================

    const profileImage =
      req.file
        ? req.file.filename
        : "";


    // ======================================================
    // BASIC VALIDATION
    // ======================================================

    if (
      !name ||
      !email ||
      !password
    ) {

      return res.render(
        "signup",
        {
          title: "Sign Up",
          error:
            "All required fields must be filled"
        }
      );

    }


    // ======================================================
    // PASSWORD VALIDATION
    // ======================================================

    if (
      password.length < 6
    ) {

      return res.render(
        "signup",
        {
          title: "Sign Up",
          error:
            "Password must be at least 6 characters"
        }
      );

    }


    // ======================================================
    // CREATE USER
    //
    // authService handles:
    //
    // - invitation validation
    // - role assignment
    // - user creation
    //
    // ======================================================

    await authService.signup({

      name,

      email,

      password,

      phone,

      profileImage

    });


    // ======================================================
    // AFTER SIGNUP
    // ======================================================

    return res.redirect(
      "/login"
    );

  } catch (err) {

    console.error(
      "Signup error:",
      err
    );


    return res.render(
      "signup",
      {
        title: "Sign Up",
        error: err.message
      }
    );

  }

};


// ==========================================================
// LOGIN
// ==========================================================

exports.login = async (req, res) => {

  try {

    let {
      email,
      password
    } = req.body;


    // ======================================================
    // NORMALIZE EMAIL
    // ======================================================

    email =
      email
        .toLowerCase()
        .trim();


    // ======================================================
    // AUTHENTICATE USER
    // ======================================================

    const user =
      await authService.login({

        email,

        password

      });


    // ======================================================
    // STORE USER IN SESSION
    //
    // assignedFarm contains the Dairy Farm IDs assigned
    // to this dairyWorker.
    //
    // The first assigned farm is used for the login
    // redirect.
    // ======================================================

    req.session.user = {

      _id:
        user._id,

      id:
        user._id,

      name:
        user.name,

      role:
        user.role,

      profileImage:
        user.profileImage || "",

      assignedFarm:
        user.assignedFarm || []

    };


    // ======================================================
    // SAVE SESSION BEFORE REDIRECT
    //
    // This is especially important when using a persistent
    // session store such as MongoDB.
    // ======================================================

    req.session.save(
      (sessionError) => {

        if (sessionError) {

          console.error(
            "Session save error:",
            sessionError
          );


          return res.status(500).render(
            "login",
            {
              title: "Login",

              error:
                "Login succeeded, but your session could not be saved. Please try again."
            }
          );

        }


        // ==================================================
        // DAIRY WORKER
        // ==================================================

        if (
          user.role === "dairyWorker"
        ) {

          const assignedFarms =
            user.assignedFarm || [];


          // =================================================
          // FIRST ASSIGNED FARM
          // =================================================

          if (
            assignedFarms.length > 0
          ) {

            const firstFarm =
              assignedFarms[0];


            return res.redirect(
              `/dairy/${firstFarm}`
            );

          }

        }


        // ==================================================
        // DEFAULT REDIRECT
        //
        // Used for:
        //
        // - Dairy worker without assigned farms
        // - Poultry worker
        // - Administrator
        //
        // ==================================================

        return res.redirect(
          "/"
        );

      }
    );

  } catch (err) {

    console.error(
      "Login error:",
      err
    );


    return res.render(
      "login",
      {
        title: "Login",

        error:
          err.message
      }
    );

  }

};


// ==========================================================
// LOGOUT
// ==========================================================

exports.logout = (req, res) => {

  req.session.destroy(
    (err) => {

      if (err) {

        console.error(
          "Logout session destruction error:",
          err
        );

      }


      // ----------------------------------------------------
      // Remove session cookie
      // ----------------------------------------------------

      res.clearCookie(
        "connect.sid"
      );


      // ----------------------------------------------------
      // Return to login
      // ----------------------------------------------------

      return res.redirect(
        "/login"
      );

    }
  );

};


// ==========================================================
// FORGOT PASSWORD
// ==========================================================

exports.forgotPassword =
async (req, res) => {

  try {

    let {
      email
    } = req.body;


    // ======================================================
    // NORMALIZE EMAIL
    // ======================================================

    email =
      email
        .toLowerCase()
        .trim();


    // ======================================================
    // REQUEST ORIGIN
    // ======================================================

    const requestOrigin =
      process.env.FRONTEND_URL ||
      `${req.protocol}://${req.get("host")}`;


    // ======================================================
    // SEND RESET EMAIL
    // ======================================================

    await authService.forgotPassword(

      email,

      requestOrigin

    );


    // ======================================================
    // SUCCESS
    // ======================================================

    return res.render(
      "forgot-password",
      {
        title: "Forgot Password",

        success:
          "Reset link sent successfully.",

        error:
          null
      }
    );

  } catch (err) {

    console.error(
      "Forgot password error:",
      err
    );


    return res.render(
      "forgot-password",
      {
        title: "Forgot Password",

        error:
          err.message,

        success:
          null
      }
    );

  }

};


// ==========================================================
// RESET PASSWORD
// ==========================================================

exports.resetPassword =
async (req, res) => {

  try {

    const {
      password
    } = req.body;


    const token =
      req.params.token;


    // ======================================================
    // PASSWORD VALIDATION
    // ======================================================

    if (
      !password ||
      password.length < 6
    ) {

      return res.render(
        "reset-password",
        {
          title: "Reset Password",

          token,

          error:
            "Password must be at least 6 characters"
        }
      );

    }


    // ======================================================
    // RESET PASSWORD
    // ======================================================

    await authService.resetPassword(

      token,

      password

    );


    // ======================================================
    // RETURN TO LOGIN
    // ======================================================

    return res.redirect(
      "/login"
    );

  } catch (err) {

    console.error(
      "Reset password error:",
      err
    );


    return res.render(
      "reset-password",
      {
        title: "Reset Password",

        token:
          req.params.token,

        error:
          err.message
      }
    );

  }

};