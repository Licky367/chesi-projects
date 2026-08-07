const financeService = require("../services/financeService");

// =========================
// RENDER FINANCE PAGE
// =========================
exports.renderFinancePage = async (req, res) => {
  try {
    const stats = await financeService.getLifetimeStats();

    const records = await financeService.getMonthlyStats(
      new Date().getFullYear(),
      new Date().getMonth()
    );

    const profitByType = await financeService.getProfitByType();

    res.render("finance/index", {
      stats,
      records,
      profitByType
    });

  } catch (err) {
    console.error("Finance page error:", err);
    res.status(500).send(err.message);
  }
};


// =========================
// ADD INVESTMENT
// =========================
exports.addInvestment = async (req, res) => {
  try {
    const { amount, poultryType, description } = req.body;

    await financeService.recordInvestment({
      amount,
      poultryType,
      description,
      userId: req.user._id
    });

    res.redirect("/finance");

  } catch (err) {
    console.error("Add investment error:", err);
    res.status(400).send(err.message);
  }
};


// =========================
// REINVEST PROFIT
// =========================
exports.reinvest = async (req, res) => {
  try {
    const { amount, poultryType, description } = req.body;

    await financeService.reinvestProfit({
      amount,
      poultryType,
      description,
      userId: req.user._id
    });

    res.redirect("/finance");

  } catch (err) {
    console.error("Reinvest error:", err);
    res.status(400).send(err.message);
  }
};


// =========================
// PAY WORKERS
// =========================
exports.payWorkers = async (req, res) => {
  try {
    const { amount, poultryType, description } = req.body;

    await financeService.payWorkers({
      amount,
      poultryType,
      description,
      userId: req.user._id
    });

    res.redirect("/finance");

  } catch (err) {
    console.error("Pay workers error:", err);
    res.status(400).send(err.message);
  }
};


// =========================
// CONSUMPTION / EXPENSES
// =========================
exports.consumption = async (req, res) => {
  try {
    const { amount, poultryType, description } = req.body;

    await financeService.addConsumption({
      amount,
      poultryType,
      description,
      userId: req.user._id
    });

    res.redirect("/finance");

  } catch (err) {
    console.error("Consumption error:", err);
    res.status(400).send(err.message);
  }
};