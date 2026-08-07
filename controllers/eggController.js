const eggService = require("../services/eggService");

// =========================
// RENDER EGG PAGE (FILTERED)
// =========================
exports.renderEggPage = async (req, res) => {
  try {
    const poultryType = req.query.poultryType || req.query.type || "chicken";

    const stock = await eggService.getEggStock(poultryType);

    res.render("egg/index", {
      stock,
      selectedType: poultryType
    });
  } catch (err) {
    res.status(500).send(err.message);
  }
};

// =========================
// SELL EGGS
// =========================
exports.sellEggs = async (req, res) => {
  try {
    const { poultryType, quantity, amount } = req.body;

    await eggService.sellEggs({
      poultryType,
      quantity,
      amount,
      user: req.user
    });

    res.redirect(`/eggs?poultryType=${poultryType}`);
  } catch (err) {
    res.status(400).send(err.message);
  }
};