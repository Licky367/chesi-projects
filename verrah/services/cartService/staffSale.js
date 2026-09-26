const mongoose = require("mongoose");
const Product = require("../../models/products");
const Cart = require("../../models/carts");
const StaffSale = require("../../models/staff-sales");
const Substation = require("../../models/substations");
const User = require("../../models/user");
const { getLoggedInUserId, normalizeRequestedQuantity } = require("./helpers");

async function createStaffSale(req, saleData = {}) {
    const userId = getLoggedInUserId(req);
    if (!userId) throw new Error("User is not authenticated.");

    const salesName = String(saleData.salesName || "").trim();
    if (!salesName) throw new Error("Sales name is required.");
    if (salesName.length > 150) throw new Error("Sales name cannot exceed 150 characters.");

    let requestedSubstation = saleData.salesSubstation;
    const session = await mongoose.startSession();
    let sale;

    try {
        await session.withTransaction(async () => {
            const user = await User.findById(userId).session(session);
            if (!user) throw new Error("User not found.");

            const role = String(user.role || "").toLowerCase();
            if (role !== "staff" && role !== "admin") {
                throw new Error("Only admin or staff can complete cash sales.");
            }

            let salesSubstation = role === "staff"
                ? user.assignedSubstation
                : requestedSubstation;

            if (salesSubstation && typeof salesSubstation === "object" && salesSubstation._id) {
                salesSubstation = salesSubstation._id;
            }

            if (!salesSubstation || !mongoose.Types.ObjectId.isValid(salesSubstation)) {
                if (role === "staff") {
                    throw new Error("Your account does not have an assigned substation.");
                }
                throw new Error("A valid sales substation is required.");
            }

            salesSubstation = new mongoose.Types.ObjectId(salesSubstation);

            const substation = await Substation.findById(salesSubstation).session(session);
            if (!substation) throw new Error("Selected sales substation was not found.");

            const cart = await Cart.findOne({ user: userId }).session(session);
            if (!cart) throw new Error("Cart not found.");
            if (!Array.isArray(cart.items) || cart.items.length === 0) {
                throw new Error("Your cart is empty.");
            }

            const productIds = cart.items.map(item => item.productId || item.product);
            const products = await Product.find({ _id: { $in: productIds } }).session(session);
            const productMap = new Map(products.map(product => [String(product._id), product]));
            const saleProducts = [];
            let totalAmount = 0;

            for (const cartItem of cart.items) {
                const productId = cartItem.productId || cartItem.product;
                const product = productMap.get(String(productId));
                if (!product) throw new Error(`Product ${productId} was not found.`);
                if (product.isActive === false) throw new Error(`${product.name} is no longer available.`);

                const qty = normalizeRequestedQuantity(cartItem.qty);
                if (!qty) throw new Error(`Invalid quantity for ${product.name}.`);
                if (product.units !== undefined && Number(product.units) < qty) {
                    throw new Error(`Insufficient stock for ${product.name}. Available: ${product.units}.`);
                }

                if (Array.isArray(product.substationUnits)) {
                    const substationStock = product.substationUnits.find(entry =>
                        String(entry.substation) === String(salesSubstation)
                    );
                    const availableUnits = substationStock ? Number(substationStock.units || 0) : 0;
                    if (availableUnits < qty) {
                        throw new Error(`Insufficient ${product.name} stock at ${substation.name}. Available: ${availableUnits}.`);
                    }
                }

                let price = Number(cartItem.price);
                if (!Number.isFinite(price) || price < 0) price = Number(product.unitSellPrice || 0);
                if (!Number.isFinite(price) || price < 0) {
                    throw new Error(`Invalid selling price for ${product.name}.`);
                }

                const itemTotal = price * qty;
                saleProducts.push({
                    productId: product._id,
                    name: product.name || "",
                    image: product.image || "",
                    category: product.category || "",
                    subcategory: product.subcategory || "",
                    qty,
                    price,
                    total: itemTotal
                });
                totalAmount += itemTotal;
            }

            for (const cartItem of cart.items) {
                const productId = cartItem.productId || cartItem.product;
                const product = productMap.get(String(productId));
                const qty = normalizeRequestedQuantity(cartItem.qty);
                if (product.units !== undefined) {
                    const updatedProduct = await Product.findOneAndUpdate(
                        { _id: product._id, isActive: true, units: { $gte: qty } },
                        { $inc: { units: -qty } },
                        { new: true, session }
                    );
                    if (!updatedProduct) {
                        throw new Error(`Stock changed while processing ${product.name}. Please try again.`);
                    }
                }
            }

            if (!Array.isArray(substation.productInventory)) {
                throw new Error(`${substation.name} has no product inventory.`);
            }

            for (const cartItem of cart.items) {
                const productId = cartItem.productId || cartItem.product;
                const product = productMap.get(String(productId));
                const qty = normalizeRequestedQuantity(cartItem.qty);
                const inventoryItem = substation.productInventory.find(item =>
                    String(item.productId) === String(productId)
                );

                if (!inventoryItem) {
                    throw new Error(`${product?.name || "Product"} is not available in ${substation.name} inventory.`);
                }

                const currentUnits = Number(inventoryItem.units || 0);
                if (currentUnits < qty) {
                    throw new Error(`Insufficient ${inventoryItem.productName || product?.name || "product"} stock at ${substation.name}. Available: ${currentUnits}.`);
                }

                inventoryItem.units = currentUnits - qty;
                inventoryItem.productName = product?.name || inventoryItem.productName || "";
                inventoryItem.category = product?.category || inventoryItem.category || "";
                inventoryItem.subcategory = product?.subcategory || inventoryItem.subcategory || "";
                inventoryItem.updatedAt = new Date();
            }

            if (!Array.isArray(substation.productReductions)) substation.productReductions = [];

            for (const cartItem of cart.items) {
                const productId = cartItem.productId || cartItem.product;
                const product = productMap.get(String(productId));
                const qty = normalizeRequestedQuantity(cartItem.qty);
                const reduction = substation.productReductions.find(item =>
                    String(item.productId) === String(productId)
                );

                if (reduction) {
                    reduction.unitsReduced = Number(reduction.unitsReduced || 0) + qty;
                    reduction.productName = product?.name || reduction.productName || "";
                    reduction.category = product?.category || reduction.category || "";
                    reduction.lastReducedAt = new Date();
                } else {
                    substation.productReductions.push({
                        productId,
                        productName: product?.name || "",
                        category: product?.category || "",
                        unitsReduced: qty,
                        lastReducedAt: new Date()
                    });
                }
            }

            await substation.save({ session });

            sale = new StaffSale({
                salesName,
                salesSubstation,
                products: saleProducts,
                totalAmount,
                soldBy: user._id
            });

            await sale.save({ session });
            
            cart.items = [];
            cart.cartSubstation = "";
            await cart.save({ session });
        });

        return sale;
    } finally {
        await session.endSession();
    }
}

module.exports = { createStaffSale };
