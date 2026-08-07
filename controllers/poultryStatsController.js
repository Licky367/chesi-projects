const service = require("../services/poultryStatsService");

const VALID_TYPES = [
  "eggs",
  "egg_sales",
  "poultry_sales",
  "total_revenue",
  "profit"
];

exports.renderStats = async (req, res) => {
  try {
    const { date, type } = req.query;

    const selectedType = VALID_TYPES.includes(type) ? type : "eggs";

    const data = await service.getStats({
      date,
      type: selectedType
    });

    res.render("poultryStats", {
      rows: data.rows || [],
      grandTotal: data.grandTotal || { day: 0, month: 0, year: 0 },
      selectedDate: date || "",
      selectedType
    });

  } catch (err) {
    res.status(500).send(err.message);
  }
};