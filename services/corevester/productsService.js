// =========================================================
// services/corevester/productsService.js
// ALIGNED WITH Cart Model - Stock reduces on addToCart
// =========================================================
const Product = require("../../models/corevester/products");
const Cart = require("../../models/corevester/carts");

function normalizeString(v){ return String(v==null?"":v).trim(); }
function normalizeCategory(v){ return normalizeString(v); }
function normalizeImage(v){ return normalizeString(v)||""; }
function getNumeric(v,f=0){ const n=Number(v); return Number.isFinite(n)?n:f; }

async function getOrCreateCart(sessionId){
  const key = normalizeString(sessionId)||"anonymous";
  let cart = await Cart.findOne({ sessionId: key });
  if(!cart) cart = await Cart.create({ sessionId: key, items: [] });
  return cart;
}

function cloneCart(cartDoc){
  const items = cartDoc?.items || [];
  return items.map(i=>({
    productId: String(i.productId),
    name: i.name,
    price: Number(i.price||0),
    qty: Number(i.qty||0)
  }));
}

exports.getCategories = async ()=>{
  const cats = await Product.distinct("category");
  return cats.map(c=>normalizeCategory(c)).filter(Boolean).sort((a,b)=>a.localeCompare(b,undefined,{sensitivity:"base"}));
};

exports.getStats = async ()=>{
  const r = await Product.aggregate([{ $group:{ _id:null, totalProducts:{ $sum:1 }, availableProducts:{ $sum:{ $cond:[{ $gt:[{ $ifNull:["$units",0] },0] },1,0] } }, totalUnits:{ $sum:{ $ifNull:["$units",0] } } } }]);
  if(!r.length) return { totalProducts:0, availableProducts:0, totalUnits:0 };
  return { totalProducts:Number(r[0].totalProducts||0), availableProducts:Number(r[0].availableProducts||0), totalUnits:Number(r[0].totalUnits||0) };
};

exports.getProducts = async ()=> Product.find({}).sort({ category:1, name:1 }).lean();
exports.getProductsWithCartAdjustment = async ()=> Product.find({}).sort({ category:1, name:1 }).lean();

exports.getCart = async (sessionId)=>{
  const cart = await Cart.findOne({ sessionId: normalizeString(sessionId)||"anonymous" });
  return cloneCart(cart);
};

// ADD TO CART - reduces Product.units, increases Cart.items
exports.addToCart = async (sessionId, productId, quantity=1)=>{
  const id = normalizeString(productId);
  if(!id) throw new Error("Product ID is required.");
  const qty = parseInt(quantity,10);
  if(!Number.isInteger(qty)||qty<1) throw new Error("Quantity must be at least 1.");

  const product = await Product.findById(id);
  if(!product) throw new Error("Product not found.");
  const stock = Math.max(0, getNumeric(product.units));
  if(stock<=0) throw new Error("This product is out of stock.");
  if(qty>stock) throw new Error(`Only ${stock} unit${stock===1?"":"s"} available.`);

  // 1. REDUCE PRODUCT
  product.units = stock - qty;
  await product.save();

  // 2. INCREASE CART MODEL
  const cart = await getOrCreateCart(sessionId);
  const existing = cart.items.find(i=>String(i.productId)===id);
  if(existing){
    existing.qty += qty;
    existing.name = product.name;
    existing.price = getNumeric(product.unitSellPrice);
  } else {
    cart.items.push({ product: product._id, productId: String(product._id), name: product.name, price: getNumeric(product.unitSellPrice), qty });
  }
  await cart.save();
  return cloneCart(cart);
};

exports.updateCartQty = async (sessionId, productId, quantity)=>{
  const id = normalizeString(productId);
  const qty = parseInt(quantity,10);
  if(!id) throw new Error("Product ID is required.");
  if(!Number.isInteger(qty)||qty<1) throw new Error("Quantity must be at least 1.");

  const cart = await Cart.findOne({ sessionId: normalizeString(sessionId)||"anonymous" });
  if(!cart) throw new Error("Cart not found.");
  const item = cart.items.find(i=>String(i.productId)===id);
  if(!item) throw new Error("Item not in cart.");

  const product = await Product.findById(id);
  if(!product) throw new Error("Product not found.");

  const diff = qty - Number(item.qty||0);
  const stock = Math.max(0, getNumeric(product.units));
  if(diff>0 && stock<diff) throw new Error(`Only ${stock + Number(item.qty)} unit${(stock+Number(item.qty))===1?"":"s"} available.`);

  product.units = Math.max(0, stock - diff);
  await product.save();

  item.qty = qty;
  item.name = product.name;
  item.price = getNumeric(product.unitSellPrice);
  await cart.save();
  return cloneCart(cart);
};

exports.removeFromCart = async (sessionId, productId)=>{
  const id = normalizeString(productId);
  if(!id) throw new Error("Product ID is required.");
  const cart = await Cart.findOne({ sessionId: normalizeString(sessionId)||"anonymous" });
  if(!cart) return [];
  const item = cart.items.find(i=>String(i.productId)===id);
  if(item){
    const product = await Product.findById(id);
    if(product){
      product.units = Number(product.units||0) + Number(item.qty||0);
      await product.save();
    }
  }
  cart.items = cart.items.filter(i=>String(i.productId)!==id);
  await cart.save();
  return cloneCart(cart);
};

exports.createProduct = async (data={})=>{
  const name=normalizeString(data.name);
  const category=normalizeCategory(data.category);
  const units=parseInt(data.units,10);
  const unitSellPrice=Number(data.unitSellPrice);
  const image=normalizeImage(data.image);
  const description=normalizeString(data.description);
  const usage=normalizeString(data.usage);
  const precautions=normalizeString(data.precautions);
  const specifications=normalizeString(data.specifications);
  if(!name) throw new Error("Product name is required.");
  if(!category) throw new Error("Product category is required.");
  if(!Number.isInteger(units)||units<1) throw new Error("Units must be at least 1.");
  if(!Number.isFinite(unitSellPrice)||unitSellPrice<0) throw new Error("Selling price must be valid.");
  const existing = await Product.findOne({ name:{ $regex:`^${name.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}$`, $options:"i" }, category:{ $regex:`^${category.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}$`, $options:"i" } }).lean();
  if(existing) throw new Error(`${name} is already listed.`);
  const product = await Product.create({ name, category, units, unitSellPrice, image, description:description||undefined, usage:usage||undefined, precautions:precautions||undefined, specifications:specifications||undefined });
  return product.toObject();
};

exports.deleteProduct = async (productId)=>{
  const id=normalizeString(productId);
  if(!id) throw new Error("Product ID is required.");
  const product=await Product.findById(id);
  if(!product) throw new Error("Product not found.");
  const result=product.toObject();
  await Product.deleteOne({ _id:product._id });
  await Cart.updateMany({}, { $pull:{ items:{ productId: String(product._id) } } });
  return result;
};

console.log("✅ productsService loaded with Cart model - stock reduction enabled");