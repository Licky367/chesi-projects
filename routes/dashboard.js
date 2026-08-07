const express = require("express");
const router = express.Router();

const dashboardController = require("../controllers/dashboardController");

// ================================
// MIDDLEWARE: ADMIN ONLY
// ================================
const ensureAdmin = (req, res, next) => {
  const currentUser = req.user || req.session?.user;

  if (!currentUser) {
    return res.redirect("/login");
  }

  if (currentUser.role !== "admin") {
    return res.status(403).send("Access Denied: Admins only.");
  }

  req.user = currentUser;
  next();
};

// ================================
// DASHBOARD ROUTES
// ================================
router.get("/dairy", ensureAdmin, dashboardController.getDairyDashboard);

router.get("/poultry", ensureAdmin, dashboardController.getPoultryDashboard);

router.get("/agriculture", ensureAdmin, dashboardController.getAgricultureDashboard);

module.exports = router;