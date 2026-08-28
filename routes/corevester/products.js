const express = require('express');
const router = express.Router();
const Product = require('../../models/corevester/products');

function getCart(req){
    if(!req.session.cart) req.session.cart = [];
    return req.session.cart;
}

router.get('/', async (req,res)=>{
    try{
        const category = req.query.category;
        const filter = category && category!=='all' ? {category, isActive:true} : {isActive:true};
        const products = await Product.find(filter).sort({createdAt:-1});
        const categories = await Product.distinct('category', {isActive:true});
        const cart = getCart(req);
        const cartCount = cart.reduce((a,c)=>a+c.qty,0);
        const cartTotal = cart.reduce((a,c)=>a+(c.price*c.qty),0);
        res.render('products', { 
            products, categories, activeCategory: category||'all', 
            cart, cartCount, cartTotal,
            title:"Marketplace", 
            user:req.session?.user||null,
            currentPath:req.path
        });
    }catch(e){ 
        console.error("GET /products error:", e.message, e.stack);
        res.status(500).render('error/500', {error:e.message, statusCode:500, title:"Error", user:req.session?.user||null}); 
    }
});

router.get('/:id', async (req,res)=>{
    try{
        if(!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(404).render('error/404', {title:"Not Found", user:req.session?.user||null, error:"Product not found"});
        }
        const product = await Product.findById(req.params.id);
        if(!product) return res.status(404).render('error/404', {title:"Not Found", user:req.session?.user||null, error:"Product not found"});
        const cart = getCart(req);
        const cartCount = cart.reduce((a,c)=>a+c.qty,0);
        const cartTotal = cart.reduce((a,c)=>a+(c.price*c.qty),0);
        res.render('product-detail', { 
            product, cart, cartCount, cartTotal,
            title: product.name, 
            user:req.session?.user||null,
            currentPath:req.path
        });
    }catch(e){ 
        console.error("GET /products/:id error:", e.message);
        res.status(500).render('error/500', {error:e.message, statusCode:500, title:"Error", user:req.session?.user||null}); 
    }
});

router.post('/add-to-cart', async (req,res)=>{
    try{
        const { productId, qty } = req.body;
        const quantity = Math.max(1, parseInt(qty)||1);
        if(!productId) return res.json({success:false, message:"No product"});
        const product = await Product.findById(productId);
        if(!product) return res.json({success:false, message:"Product not found"});
        if(product.units <=0) return res.json({success:false, message:"Out of stock"});
        const cart = getCart(req);
        const existing = cart.find(c=> c.productId.toString() === productId.toString());
        const inCart = existing?existing.qty:0;
        if(inCart + quantity > product.units){
            return res.json({success:false, message:`Only ${product.units} available. You have ${inCart} in cart. You can add ${product.units - inCart} more.`});
        }
        if(existing) existing.qty += quantity;
        else cart.push({ productId: product._id.toString(), name: product.name, price: product.unitSellPrice, qty: quantity, image: product.image, stock: product.units });
        req.session.cart = cart;
        const cartCount = cart.reduce((a,c)=>a+c.qty,0);
        const cartTotal = cart.reduce((a,c)=>a+(c.price*c.qty),0);
        res.json({success:true, cart, cartCount, cartTotal});
    }catch(e){ console.error(e); res.json({success:false, message:e.message}); }
});

router.post('/update-cart-qty', async (req,res)=>{
    try{
        const { productId, qty } = req.body;
        const newQty = parseInt(qty);
        if(!productId || isNaN(newQty)) return res.json({success:false, message:"Invalid qty"});
        const product = await Product.findById(productId);
        if(!product) return res.json({success:false, message:"Product not found"});
        if(newQty > product.units) return res.json({success:false, message:`Only ${product.units} available`});
        let cart = getCart(req);
        if(newQty<=0) cart = cart.filter(c=> c.productId.toString() !== productId.toString());
        else { const it = cart.find(c=> c.productId.toString()===productId.toString()); if(it) it.qty=newQty; }
        req.session.cart = cart;
        res.json({success:true});
    }catch(e){ res.json({success:false, message:e.message}); }
});

router.post('/remove-from-cart', (req,res)=>{
    try{
        const { productId } = req.body;
        req.session.cart = getCart(req).filter(c=> c.productId.toString() !== productId.toString());
        res.json({success:true});
    }catch(e){ res.json({success:false, message:e.message}); }
});

module.exports = router;