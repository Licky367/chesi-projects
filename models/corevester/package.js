const mongoose = require("mongoose");

const packageSchema = new mongoose.Schema({
    clientId: { type: String, required: true }, // req.ip or user._id
    items: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        name: String,
        price: Number,
        qty: Number,
        image: String
    }],
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: ["pending","confirmed","delivered"], default: "pending" }
}, { timestamps: true }); 

module.exports = mongoose.model("Package", packageSchema);