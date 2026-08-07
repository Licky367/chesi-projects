const express = require("express");
const router = express.Router();
const financeController = require("../controllers/financeController");

const requireLogin = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  req.user = req.session.user;
  next();
};

// =========================
// VIEW FINANCE DASHBOARD
// =========================
router.get("/", requireLogin, financeController.renderFinancePage);

// =========================
// INVESTMENT
// =========================
router.post("/add", requireLogin, financeController.addInvestment);

// =========================
// REINVEST PROFIT
// =========================
router.post("/reinvest", requireLogin, financeController.reinvest);

// =========================
// PAY WORKERS
// =========================
router.post("/pay-workers", requireLogin, financeController.payWorkers);

// =========================
// CONSUMPTION / EXPENSES
// =========================
router.post("/consumption", requireLogin, financeController.consumption);

module.exports = router;