console.log("... Loading routes/corevester/packages.js");
const express = require("express");
const router = express.Router();

let Product, Package;
try {
    Product = require("../../models/corevester/products");
    Package = require("../../models/corevester/packages");
    console.log("✅ Product & Package models loaded");
} catch (err) {
    console.error("❌ FAILED to load models in packages.js", err.message, err.stack);
    router.get("/", (req,res)=> res.status(500).send("Model load failed: "+err.message));
    module.exports = router;
    return;
}

const getSessionId = (req) => {
    try {
        if (req.user && req.user._id) return req.user._id.toString();
        if (req.session && req.session.user && req.session.user._id) return req.session.user._id.toString();
        if (req.sessionID) return req.sessionID;
        return req.ip || "anon";
    } catch(e){ return "anon"; }
};

function getCart(req){
    if(!req.session.cart) req.session.cart = [];
    return req.session.cart;
}

// ==========================================================
// POST /packages/create-from-cart - WITH STOCK MATH
// ==========================================================
router.post("/create-from-cart", async (req,res)=>{
    try{
        console.log("[POST /packages/create-from-cart] session:", getSessionId(req));
        const cart = getCart(req);

        if(!cart.length){
            return res.status(400).json({ success:false, message: "Cart is empty" });
        }

        // 1. Validate stock for all items first
        for(let item of cart){
            const product = await Product.findById(item.productId);
            if(!product){
                return res.status(400).json({ success:false, message: `${item.name} no longer exists` });
            }
            if(product.units < item.qty){
                return res.status(400).json({ success:false, message: `${product.name} only ${product.units} left. You requested ${item.qty}` });
            }
        }

        // 2. Deduct stock
        let total = 0;
        let packageItems = [];
        for(let item of cart){
            const product = await Product.findById(item.productId);
            product.units -= item.qty;
            await product.save();
            console.log(`✅ Deducted ${item.qty} from ${product.name} - remaining ${product.units}`);
            
            const itemTotal = product.unitSellPrice * item.qty;
            total += itemTotal;
            packageItems.push({
                product: product._id,
                name: product.name,
                category: product.category,
                image: product.image,
                unitPrice: product.unitSellPrice,
                qty: item.qty,
                total: itemTotal,
                buyPrice: product.buyPrice || 0
            });
        }

        // 3. Create Package
        const sessionId = getSessionId(req);
        const pkg = await Package.create({
            sessionId: sessionId,
            user: req.session?.user?._id || req.user?._id || null,
            items: packageItems,
            totalAmount: total,
            total: total,
            status: "pending",
            itemCount: packageItems.reduce((a,c)=>a+c.qty,0)
        });

        console.log("✅ Package created:", pkg._id);

        // 4. Clear cart
        req.session.cart = [];
        
        res.json({ success: true, packageId: pkg._id });

    }catch(err){
        console.error("❌ create-from-cart error:", err.message, err.stack);
        res.status(400).json({ success:false, message: err.message });
    }
});

// ==========================================================
// GET /packages - MY PACKAGES
// ==========================================================
router.get("/", async (req,res)=>{
    try{
        const sessionId = getSessionId(req);
        console.log("[GET /packages] session:", sessionId);
        
        // Find by sessionId or user
        let query = { sessionId };
        if(req.session?.user?._id || req.user?._id){
            const userId = req.session?.user?._id || req.user?._id;
            query = { $or: [ {sessionId}, {user: userId} ] };
        }

        const packages = await Package.find(query).sort({ createdAt: -1 }).populate('items.product');
        
        res.render("packages", { 
            packages, 
            title: "My Packages", 
            currentPath: req.path,
            user: req.session?.user || req.user || null
        });
    }catch(err){
        console.error("GET /packages error:", err.message, err.stack);
        res.status(500).render("error/500", { 
            title: "Error", 
            error: err.message,
            statusCode: 500,
            user: req.session?.user || null
        });
    }
});

// ==========================================================
// GET /packages/:id - PACKAGE DETAILS
// ==========================================================
router.get("/:id", async (req,res)=>{
    try{
        const pkg = await Package.findById(req.params.id).populate('items.product');
        if(!pkg){
            return res.status(404).render("error/404", {
                title: "404 - Not Found",
                error: "Package not found",
                user: req.session?.user || null
            });
        }

        // Security: only owner can view (optional - remove if you want public)
        const sessionId = getSessionId(req);
        if(pkg.sessionId !== sessionId && pkg.user?.toString() !== (req.session?.user?._id?.toString() || req.user?._id?.toString())){
            // Allow anyway if you want - comment out next lines if packages should be public
            // return res.status(403).render("error/403", {
            //     title: "403 - Forbidden",
            //     error: "You cannot view this package",
            //     user: req.session?.user || null
            // });
        }

        res.render("package-details", { 
            pkg, 
            title: "Package #"+pkg._id.toString().slice(-6), 
            currentPath: req.path,
            user: req.session?.user || null
        });
    }catch(err){
        console.error("GET /packages/:id error:", err.message, err.stack);
        res.status(500).render("error/500", {
            title: "Error",
            error: err.message,
            statusCode: 500,
            user: req.session?.user || null
        });
    }
});

console.log("✅ routes/corevester/packages.js loaded with stock deduction logic");
module.exports = router;