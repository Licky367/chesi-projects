exports.productDetails = async (req, res) => {
    try{
        const Product = require("../../models/corevester/products");
        const product = await Product.findById(req.params.id).lean();
        if(!product) return res.status(404).send("Product not found");

        const sessionId = getSessionId(req);
        const cart = productsService.getCart(sessionId);
        const inCart = cart.find(c=> c.productId.toString()=== product._id.toString());
        const cartCount = cart.reduce((s,i)=> s+i.qty, 0);
        const cartTotal = cart.reduce((s,i)=> s + (i.price * i.qty), 0);

        res.render("product-details", {
            title: product.name + " - COREVESTER",
            product,
            inCartQty: inCart? inCart.qty : 0,
            availableUnits: product.units - (inCart? inCart.qty : 0),
            cartCount,
            cartTotal,
            cart,
            currentPath: req.path
        });
    }catch(err){
        res.status(500).send(err.message);
    }
};