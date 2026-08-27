const adminProductsService = require("../../services/corevester/adminProductsService");

exports.entryPage = async (req, res) => {
    try{
        const [stockList, products] = await Promise.all([
            adminProductsService.getAllStock(),
            adminProductsService.getAllProducts()
        ]);
        res.render("corevester/admin/products-entry", {
            title: "Key In Products - COREVESTER",
            stockList,
            products,
            currentPath: req.path
        });
    }catch(err){
        res.status(500).send(err.message);
    }
};

exports.createProduct = async (req, res) => {
    try{
        await adminProductsService.createProduct(req.body);
        res.json({ success: true });
    }catch(err){
        res.status(400).json({ success: false, message: err.message });
    }
};

exports.deleteProduct = async (req, res) => {
    try{
        await adminProductsService.deleteProduct(req.params.id);
        res.json({ success: true });
    }catch(err){
        res.status(400).json({ success: false, message: err.message });
    }
};