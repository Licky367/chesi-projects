const express = require("express");
const router = express.Router();

const controller = require("../controllers/financialsController");


/* =========================
   DASHBOARD
========================= */
router.get("/dashboard", controller.getDashboard);


/* =========================
   DAILY CUSTOMERS (BY DATE)
========================= */
router.get("/daily-customers", controller.getDailyCustomers);


/* =========================
   FINANCIAL SUMMARY (MONTH + YEAR)
========================= */
router.get("/summary", controller.getFinancialSummary);


/* =========================
   MONTHLY EXPENSES (MONTH + YEAR)
========================= */
router.get("/expenses", controller.getMonthlyExpenses);


/* =========================
   OPTIONAL: RAW RECORD ACCESS (ADMIN / DEBUG)
========================= */
router.get("/record", controller.getFinancialRecord);


module.exports = router;