// models/corevester/package.js
const mongoose = require("mongoose");

const packageItemSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    qty: { type: Number, required: true },
    image: { type: String }
}, { _id: false });

const packageSchema = new mongoose.Schema({
    clientId: { type: String, required: true, index: true },
    items: [packageItemSchema],
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: ["pending","confirmed","delivered"], default: "pending" }
}, { timestamps: true });

module.exports = mongoose.model("Package", packageSchema);