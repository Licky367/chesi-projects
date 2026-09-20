const service = require("../../services/stockService");

async function list(req, res) {
    try {
        const stocks = await service.listStock();
        return res.render("stock/stock", {title: "Stock Management", stocks, error: req.query.error || null, saved: req.query.saved || ""});
    } catch (error) {
        console.error("Stock list error:", error);
        return res.status(500).render("stock/stock", {title: "Stock Management", stocks: [], error: error.message, saved: ""});
    }
}
module.exports = {list};
