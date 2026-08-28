// =========================================================
// controllers/corevester/productsController.js
// CONTROLLER - Calls Service Only - Aligned with Cart Model
// =========================================================
console.log("... Loading productsController");
const productsService = require("../../services/corevester/productsService");
const Product = require("../../models/corevester/products");
console.log("✅ productsService loaded");
console.log("✅ Product model loaded");

function getSessionId(req){
  try{
    if(req.user && req.user._id) return String(req.user._id);
    if(req.sessionID) return String(req.sessionID);
    if(req.session){
      if(!req.session.__marketplaceCartId) req.session.__marketplaceCartId="market-"+Date.now()+"-"+Math.random().toString(36).slice(2);
      return String(req.session.__marketplaceCartId);
    }
    return "anonymous-"+String(req.ip||"unknown");
  }catch(e){ return "anonymous"; }
}

function getCartSummary(cart){
  const safeCart = Array.isArray(cart)?cart:[];
  const cartCount = safeCart.reduce((t,i)=>t+Number(i.qty||0),0);
  const cartTotal = safeCart.reduce((t,i)=>t+(Number(i.price||0)*Number(i.qty||0)),0);
  return { cartCount, cartTotal };
}

exports.productsPage = async (req,res)=>{
  try{
    const category=String(req.query.category||"all").trim();
    const search=String(req.query.search||"").trim();
    const sessionId=getSessionId(req);
    const [categories, stats, products] = await Promise.all([
      productsService.getCategories(),
      productsService.getStats(),
      productsService.getProductsWithCartAdjustment(sessionId)
    ]);
    let filtered=Array.isArray(products)?products:[];
    if(category && category.toLowerCase()!=="all"){
      const cl=category.toLowerCase();
      filtered=filtered.filter(p=>String(p.category||"").toLowerCase()===cl);
    }
    if(search){
      const sl=search.toLowerCase();
      filtered=filtered.filter(p=> String(p.name||"").toLowerCase().includes(sl) || String(p.category||"").toLowerCase().includes(sl));
    }
    const cart=await productsService.getCart(sessionId);
    const {cartCount, cartTotal}=getCartSummary(cart);
    return res.render("products",{ title:"Marketplace - COREVESTER", products:filtered, categories:categories||[], activeCategory:category||"all", search, stats:stats||{totalProducts:0,availableProducts:0,totalUnits:0}, cart, cartCount, cartTotal, currentPath:req.path });
  }catch(e){ console.error("❌ productsPage:",e.message); return res.status(500).send("Unable to load marketplace."); }
};

exports.productDetails = async (req,res)=>{
  try{
    const productId=String(req.params.id||"").trim();
    if(!productId) return res.status(404).render("error/404",{ title:"Product Not Found", error:"Product not found.", user:req.user||null });
    const product=await Product.findById(productId).lean();
    if(!product) return res.status(404).render("error/404",{ title:"Product Not Found", error:"Product not found.", user:req.user||null });
    const sessionId=getSessionId(req);
    const cart=await productsService.getCart(sessionId);
    const cartItem=cart.find(i=>String(i.productId)===String(product._id));
    const inCartQty=cartItem?Number(cartItem.qty||0):0;
    const {cartCount, cartTotal}=getCartSummary(cart);
    return res.render("product-details",{ title:`${product.name||"Product"} - COREVESTER`, product, inCartQty, availableUnits:Number(product.units||0), cartCount, cartTotal, cart, currentPath:req.path });
  }catch(e){ console.error("❌ productDetails:",e.message); return res.status(500).send("Unable to load product."); }
};

exports.addToCart = async (req,res)=>{
  try{
    const {productId, qty}=req.body||{};
    if(!productId) return res.status(400).json({ success:false, message:"Product ID is required." });
    const quantity=parseInt(qty,10);
    if(!Number.isInteger(quantity)||quantity<1) return res.status(400).json({ success:false, message:"Quantity must be at least 1." });
    const sessionId=getSessionId(req);
    const cart=await productsService.addToCart(sessionId, productId, quantity);
    const {cartCount, cartTotal}=getCartSummary(cart);
    return res.json({ success:true, cart, cartCount, cartTotal });
  }catch(e){ console.error("❌ addToCart:",e.message); return res.status(400).json({ success:false, message:e.message||"Unable to add product to cart." }); }
};

exports.updateCartQty = async (req,res)=>{
  try{
    const {productId, qty}=req.body||{};
    if(!productId) return res.status(400).json({ success:false, message:"Product ID is required." });
    const quantity=parseInt(qty,10);
    if(!Number.isInteger(quantity)||quantity<1) return res.status(400).json({ success:false, message:"Quantity must be at least 1." });
    const sessionId=getSessionId(req);
    const cart=await productsService.updateCartQty(sessionId, productId, quantity);
    const {cartCount, cartTotal}=getCartSummary(cart);
    return res.json({ success:true, cart, cartCount, cartTotal });
  }catch(e){ console.error("❌ updateCartQty:",e.message); return res.status(400).json({ success:false, message:e.message||"Unable to update cart." }); }
};

exports.removeFromCart = async (req,res)=>{
  try{
    const {productId}=req.body||{};
    if(!productId) return res.status(400).json({ success:false, message:"Product ID is required." });
    const sessionId=getSessionId(req);
    const cart=await productsService.removeFromCart(sessionId, productId);
    const {cartCount, cartTotal}=getCartSummary(cart);
    return res.json({ success:true, cart, cartCount, cartTotal });
  }catch(e){ console.error("❌ removeFromCart:",e.message); return res.status(400).json({ success:false, message:e.message||"Unable to remove product." }); }
};

exports.createProduct = async (req,res)=>{
  try{
    const {name, category, units, unitSellPrice, image, description, usage, precautions, specifications}=req.body||{};
    const product=await productsService.createProduct({ name, category, units, unitSellPrice, image, description, usage, precautions, specifications });
    return res.status(201).json({ success:true, message:"Product added to marketplace.", product });
  }catch(e){ console.error("❌ createProduct:",e.message); return res.status(400).json({ success:false, message:e.message||"Unable to create product." }); }
};

exports.deleteProduct = async (req,res)=>{
  try{
    const productId=String(req.params.id||"").trim();
    if(!productId) return res.status(400).json({ success:false, message:"Product ID is required." });
    const result=await productsService.deleteProduct(productId);
    return res.json({ success:true, message:"Product removed from marketplace.", product:result });
  }catch(e){ console.error("❌ deleteProduct:",e.message); return res.status(400).json({ success:false, message:e.message||"Unable to remove product." }); }
};

console.log("✅ productsController loaded successfully");