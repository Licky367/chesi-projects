const express = require("express");
const router = express.Router();

// =========================
// AUTH MIDDLEWARE
// =========================
const requireLogin = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect("/auth/login");
  }
  next();
};

// =========================
// CONTROLLER
// =========================
const indexController = {
  home: (req, res) => {
    try {
      // No need to pass 'user' because server.js already sets:
      // res.locals.user = req.session.user;
      // res.locals.currentPath = req.path;

      res.render("index");
    } catch (error) {
      console.error("Index Error:", error);

      res.status(500).render("index", {
        error: "An unexpected error occurred."
      });
    }
  }
};

// =========================
// ROUTES
// =========================
router.get("/", requireLogin, indexController.home);

module.exports = router;