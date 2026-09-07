// =========================================================
// models/corevester/carts.js
// =========================================================
const mongoose = require("mongoose");

const CartItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  productId: { type: String, required: true },
  name: String,
  price: { type: Number, default: 0 },
  qty: { type: Number, default: 1, min: 1 }
}, { _id: false });

const CartSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  items: { type: [CartItemSchema], default: [] }
}, { timestamps: true });

module.exports = mongoose.model("Cart", CartSchema);