const stockService = require("../../services/corevester/stockService");

exports.stockPage = async (req, res) => {
    try{
        const [stockList, stats] = await Promise.all([
            stockService.getAllStock(),
            stockService.getStats()
        ]);
        res.render("stock-entry", {
            title: "Stock Warehouse - COREVESTER",
            stockList,
            stats,
            currentPath: req.path
        });
    }catch(err){
        res.status(500).send(err.message);
    }
};

exports.createStock = async (req, res) => {
    try{
        await stockService.createOrUpdateStock(req.body);
        res.json({ success: true });
    }catch(err){
        res.status(400).json({ success: false, message: err.message });
    }
};

exports.updateStock = async (req, res) => {
    try{
        await stockService.updateStock(req.params.id, req.body);
        res.json({ success: true });
    }catch(err){
        res.status(400).json({ success: false, message: err.message });
    }
};

exports.deleteStock = async (req, res) => {
    try{
        await stockService.deleteStock(req.params.id);
        res.json({ success: true });
    }catch(err){
        res.status(400).json({ success: false, message: err.message });
    }
};