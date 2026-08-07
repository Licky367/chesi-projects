const nursingService = require("../services/nursingService");

// =========================
// LIST BATCHES
// =========================
exports.renderNursingList = async (req, res) => {
  const batches = await nursingService.getActiveBatches();
  res.render("nursing/list", { batches });
};

// =========================
// CREATE PURCHASE BATCH
// =========================
exports.createPurchase = async (req, res) => {
  try {
    await nursingService.createFromPurchase(req.body);
    res.redirect("/nursing");
  } catch (err) {
    res.status(400).send(err.message);
  }
};

// =========================
// VIEW BATCH DETAILS
// =========================
exports.renderBatchDetails = async (req, res) => {
  const batch = await nursingService.getBatchById(req.params.id);
  res.render("nursing/details", { batch, user: req.user });
};

// =========================
// RECORD DEATH
// =========================
exports.recordDeath = async (req, res) => {
  try {
    const { count, cause } = req.body;

    await nursingService.recordDeath({
      batchId: req.params.id,
      count,
      cause,
      user: req.user
    });

    res.redirect(`/nursing/${req.params.id}`);
  } catch (err) {
    res.status(400).send(err.message);
  }
};

// =========================
// SELL POULTRY
// =========================
exports.sellPoultry = async (req, res) => {
  try {
    const { count, amount } = req.body;

    await nursingService.sellPoultry({
      batchId: req.params.id,
      count,
      amount,
      user: req.user
    });

    res.redirect(`/nursing/${req.params.id}`);
  } catch (err) {
    res.status(400).send(err.message);
  }
};

// =========================
// CAGE BATCH
// =========================
exports.cageBatch = async (req, res) => {
  try {
    const { perCage } = req.body;

    await nursingService.cageBatch({
      batchId: req.params.id,
      perCage
    });

    res.redirect("/nursing");
  } catch (err) {
    res.status(400).send(err.message);
  }
};

// =========================
// COLLECT EGGS (NEW)
// =========================
exports.collectEggs = async (req, res) => {
  try {
    const { eggs, poultryType } = req.body;

    await nursingService.collectEggs({
      batchId: req.params.id,
      eggs,
      poultryType
    });

    res.redirect(`/nursing/${req.params.id}`);
  } catch (err) {
    res.status(400).send(err.message);
  }
};