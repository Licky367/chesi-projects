const express = require("express");
const router = express.Router();
const profileController = require("../controllers/profileController");

const requireLogin = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  next();
};

router.get("/profile", requireLogin, profileController.profilePage);
router.post("/profile/update", requireLogin, profileController.updateProfile);

module.exports = router;