const service = require("../../services/stockService");
const {getProductSellPrice} = require("./helpers");

async function renderForm(res, data = {}, status = 200) {
    const [categories, stockCatalog] = await Promise.all([
        service.getCategories().catch(() => []),
        service.getStockCategories().catch(() => [])
    ]);
    return res.status(status).render("stock/product-entry", {
        title: data.title || "Add Stock Subcategory", error: data.error || null,
        saved: data.saved || "", old: data.old || {}, stockCatalog, categories,
        selectedStockId: data.selectedStockId || ""
    });
}

async function newStockForm(req, res) {
    try {
        const stockId = String(req.query.stockId || "").trim();
        if (!stockId) return renderForm(res, {title: "Add Stock Subcategory", old: {}, selectedStockId: ""});
        const selectedStock = await service.getStock(stockId);
        if (!selectedStock) return renderForm(res, {title: "Update Stock Subcategory", error: "Stock entry not found.", old: {}, selectedStockId: ""}, 404);
        const unitSellPrice = await getProductSellPrice(selectedStock._id);
        const old = {...selectedStock, category: selectedStock.category || "", units: 0, unitSellPrice: unitSellPrice ?? ""};
        return renderForm(res, {title: "Update Stock Subcategory", old, selectedStockId: selectedStock._id?.toString() || ""});
    } catch (error) {
        console.error("Stock form error:", error);
        return renderForm(res, {
            title: req.query.stockId ? "Update Stock Subcategory" : "Add Stock Subcategory",
            error: error.message, old: {}, selectedStockId: req.query.stockId || ""
        }, 500);
    }
}
module.exports = {renderForm, newStockForm};
