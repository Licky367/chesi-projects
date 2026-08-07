const financialsService = require("../services/financialsService");


/* =========================
   DASHBOARD PAGE
========================= */
exports.getDashboard = async (req, res) => {
  try {
    return res.render("financial-dashboard");
  } catch (err) {
    console.error(err);
    return res.status(500).send("Error loading dashboard");
  }
};


/* =========================
   DAILY CUSTOMERS
========================= */
exports.getDailyCustomers = async (req, res) => {
  try {
    const { day } = req.query;

    const result = await financialsService.getDailyCustomers(day);

    return res.render("daily-customers", {
      day,
      sales: result.sales,
      totalSalesCash: result.totalSalesCash
    });

  } catch (err) {
    console.error(err);
    return res.status(500).send("Error loading daily customers");
  }
};


/* =========================
   FINANCIAL SUMMARY (MONTH + YEAR)
========================= */
exports.getFinancialSummary = async (req, res) => {
  try {
    const { month, year } = req.query;

    const result = await financialsService.getFinancialSummary(month, year);

    return res.render("financial-summary", {
      month,
      year,
      financial: result
    });

  } catch (err) {
    console.error(err);
    return res.status(500).send("Error loading financial summary");
  }
};


/* =========================
   MONTHLY EXPENSES
========================= */
exports.getMonthlyExpenses = async (req, res) => {
  try {
    const { month, year } = req.query;

    const result = await financialsService.getMonthlyExpenses(month, year);

    return res.render("monthly-expenses", {
      month,
      year,
      expenses: result.expenses,
      totalExpenses: result.totalExpenses
    });

  } catch (err) {
    console.error(err);
    return res.status(500).send("Error loading expenses");
  }
};


/* =========================
   RAW RECORD (DEBUG / ADMIN ONLY)
========================= */
exports.getFinancialRecord = async (req, res) => {
  try {
    const record = await financialsService.getRawRecord(req.query);
    return res.json(record);
  } catch (err) {
    console.error(err);
    return res.status(500).send("Error fetching record");
  }
};