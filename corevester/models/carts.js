// =========================================================
// models/carts.js
// SHOPPING CART MODEL
// =========================================================
const mongoose = require("mongoose");

const CartItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    productId: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, default: 0 },
    image: { type: String, default: "" },
    qty: { type: Number, default: 1, min: 1 }
  },
  { _id: false }
);

const CartSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    items: { type: [CartItemSchema], default: [] }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Cart", CartSchema);
