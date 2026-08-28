const express = require('express');
const router = express.Router();
const Product = require('../../models/products'); // adjust path if needed

// Helper to get cart from session
function getCart(req){
    if(!req.session.cart) req.session.cart = [];
    return req.session.cart;
}

// GET /products
router.get('/', async (req,res)=>{
    try{
        const category = req.query.category;
        const filter = category && category!=='all' ? {category} : {};
        const products = await Product.find(filter).sort({createdAt:-1});
        const categories = await Product.distinct('category');
        const cart = getCart(req);
        const cartCount = cart.reduce((a,c)=>a+c.qty,0);
        const cartTotal = cart.reduce((a,c)=>a+(c.price*c.qty),0);
        res.render('products', { products, categories, activeCategory: category||'all', cart, cartCount, cartTotal });
    }catch(e){ console.error(e); res.status(500).render('error/500', {error:e.message}); }
});

// POST /products/add-to-cart - REAL STOCK CHECK
router.post('/add-to-cart', async (req,res)=>{
    try{
        const { productId, qty } = req.body;
        const quantity = parseInt(qty) || 1;
        if(!productId) return res.json({success:false, message:'No product'});
        
        const product = await Product.findById(productId);
        if(!product) return res.json({success:false, message:'Product not found'});
        if(product.units <=0) return res.json({success:false, message:'Out of stock'});

        const cart = getCart(req);
        const existing = cart.find(c=> c.productId.toString() === productId.toString());
        const currentInCart = existing ? existing.qty : 0;
        const totalRequested = currentInCart + quantity;

        if(totalRequested > product.units){
            return res.json({success:false, message:`Only ${product.units} available. You already have ${currentInCart} in cart. You can add ${product.units - currentInCart} more.`});
        }

        if(existing){
            existing.qty = totalRequested;
        }else{
            cart.push({
                productId: product._id,
                name: product.name,
                price: product.unitSellPrice,
                qty: quantity,
                image: product.image,
                stock: product.units
            });
        }
        req.session.cart = cart;
        res.json({success:true, cart});
    }catch(e){ console.error(e); res.json({success:false, message:e.message}); }
});

// POST /products/update-cart-qty
router.post('/update-cart-qty', async (req,res)=>{
    try{
        const { productId, qty } = req.body;
        const newQty = parseInt(qty);
        if(!productId || isNaN(newQty)) return res.json({success:false, message:'Invalid'});
        
        const product = await Product.findById(productId);
        if(!product) return res.json({success:false, message:'Product not found'});
        if(newQty > product.units) return res.json({success:false, message:`Only ${product.units} available`});
        if(newQty <=0){
            req.session.cart = getCart(req).filter(c=> c.productId.toString() !== productId.toString());
            return res.json({success:true});
        }
        const cart = getCart(req);
        const item = cart.find(c=> c.productId.toString() === productId.toString());
        if(item) item.qty = newQty;
        req.session.cart = cart;
        res.json({success:true});
    }catch(e){ res.json({success:false, message:e.message}); }
});

// POST /products/remove-from-cart
router.post('/remove-from-cart', (req,res)=>{
    try{
        const { productId } = req.body;
        req.session.cart = getCart(req).filter(c=> c.productId.toString() !== productId.toString());
        res.json({success:true});
    }catch(e){ res.json({success:false, message:e.message}); }
});

module.exports = router;