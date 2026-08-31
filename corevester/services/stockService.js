const mongoose = require("mongoose");

const Stock = require("../models/stock");
const Product = require("../models/products");
const Substation = require("../models/substations");

const text = (value) => String(value ?? "").trim();
const cleanCategory = (value) => text(value).toLowerCase();

function number(value, label, required = false) {
    if (value === "" || value == null) {
        if (!required) return 0;
        throw new Error(`${label} is required.`);
    }

    const result = Number(value);

    if (!Number.isFinite(result) || result < 0) {
        throw new Error(`${label} must be zero or greater.`);
    }

    return result;
}

function wholeNumber(value, label, required = false) {
    const result = number(value, label, required);

    if (!Number.isInteger(result)) {
        throw new Error(`${label} must be a whole number.`);
    }

    return result;
}

exports.listStock = () =>
    Stock.find({ isActive: true })
        .sort({ category: 1, name: 1 })
        .lean();

exports.getStock = (id) => {
    if (!mongoose.isValidObjectId(id)) return null;
    return Stock.findOne({ _id: id, isActive: true }).lean();
};

/**
 * Returns the existing stock catalogue used by /stock/new.
 * Each option represents an existing Stock record. The option label
 * contains the category, while the value is the Stock _id so that an
 * administrator can update the exact record safely.
 */
exports.getStockCategories = () =>
    Stock.find({ isActive: true })
        .select("name category image units buyPrice description")
        .sort({ category: 1, name: 1 })
        .lean();

exports.getSubstations = () =>
    Substation.find({ isActive: true })
        .sort({ name: 1 })
        .lean();

/**
 * Create a completely new Stock category.
 * Existing categories are updated through updateStockEntry instead of
 * creating a second stock record with the same category.
 */
exports.createStock = async (body) => {
    const name = text(body.name);
    const category = cleanCategory(body.category);
    const units = wholeNumber(body.units, "Warehouse units", true);
    const buyPrice = number(body.buyPrice, "Buy price");

    if (!name || !category) {
        throw new Error("Stock name and category are required.");
    }

    const existing = await Stock.findOne({
        category,
        isActive: true
    });

    if (existing) {
        throw new Error(
            `The category "${category}" already exists. Select it from the existing category list to update it.`
        );
    }

    return Stock.create({
        name,
        category,
        image: text(body.image),
        units,
        buyPrice,
        description: text(body.description)
    });
};

/**
 * Update any Stock category at any time.
 *
 * additionalUnits is the ONLY quantity entered for an existing category;
 * it is added to the current Stock.units.
 *
 * Image is optional. A blank image leaves the current image unchanged.
 * All other metadata can be edited whenever needed.
 */
exports.updateStockEntry = async (stockId, body) => {
    if (!mongoose.isValidObjectId(stockId)) {
        throw new Error("Invalid stock category.");
    }

    const name = text(body.name);
    const category = cleanCategory(body.category);
    const additionalUnits = wholeNumber(
        body.additionalUnits,
        "Additional units"
    );
    const buyPrice = number(body.buyPrice, "Buy price");

    if (!name || !category) {
        throw new Error("Stock name and category are required.");
    }

    const stock = await Stock.findOne({
        _id: stockId,
        isActive: true
    });

    if (!stock) {
        throw new Error("Stock category not found.");
    }

    const duplicate = await Stock.findOne({
        _id: { $ne: stock._id },
        category,
        isActive: true
    });

    if (duplicate) {
        throw new Error(
            `The category "${category}" already belongs to another stock record.`
        );
    }

    stock.name = name;
    stock.category = category;
    stock.buyPrice = buyPrice;
    stock.description = text(body.description);

    const image = text(body.image);
    if (image) {
        stock.image = image;
    }

    stock.units += additionalUnits;

    await stock.save();

    // A Stock record is the source profile for all marketplace Products
    // created from it. Keep those product profiles synchronized.
    await Product.updateMany(
        { stock: stock._id, isActive: true },
        {
            $set: {
                name: stock.name,
                category: stock.category,
                image: stock.image || "",
                buyPrice: Number(stock.buyPrice || 0),
                description: stock.description || ""
            }
        }
    );

    return stock;
};

/**
 * Allocate warehouse units into a marketplace Product.
 *
 * Product profile fields are inherited from Stock; the form only supplies:
 *     - units
 *     - selling price
 *     - substation
 *
 * Product identity is Stock + Substation. If that Product already exists,
 * its units increase instead of creating a duplicate Product document.
 * Stock.units is reduced by exactly the units allocated.
 */
exports.createProductFromStock = async (stockId, body) => {
    if (!mongoose.isValidObjectId(stockId)) {
        throw new Error("Invalid stock.");
    }

    const units = wholeNumber(body.units, "Product units", true);
    const substationId = text(body.substation);
    const unitSellPrice = number(
        body.unitSellPrice,
        "Selling price",
        true
    );

    if (units <= 0) {
        throw new Error("Product units must be greater than zero.");
    }

    if (!substationId) {
        throw new Error("Substation selection is required.");
    }

    if (!mongoose.isValidObjectId(substationId)) {
        throw new Error("Invalid substation.");
    }

    const session = await mongoose.startSession();

    try {
        let product;

        await session.withTransaction(async () => {
            const stock = await Stock.findOne({
                _id: stockId,
                isActive: true
            }).session(session);

            if (!stock) {
                throw new Error("Stock not found.");
            }

            if (units > stock.units) {
                throw new Error(
                    `Only ${stock.units} units are available in stock.`
                );
            }

            const substation = await Substation.findOne({
                _id: substationId,
                isActive: true
            }).session(session);

            if (!substation) {
                throw new Error("Selected substation was not found.");
            }

            const existingProduct = await Product.findOne({
                stock: stock._id,
                substation: substation._id,
                isActive: true
            }).session(session);

            if (existingProduct) {
                existingProduct.units += units;
                existingProduct.unitSellPrice = unitSellPrice;

                // Always take profile information from Stock.
                existingProduct.name = stock.name;
                existingProduct.category = stock.category;
                existingProduct.image = stock.image || "";
                existingProduct.buyPrice = Number(stock.buyPrice || 0);
                existingProduct.description = stock.description || "";

                await existingProduct.save({ session });
                product = existingProduct;
            } else {
                [product] = await Product.create(
                    [
                        {
                            stock: stock._id,
                            name: stock.name,
                            category: stock.category,
                            image: stock.image || "",
                            units,
                            buyPrice: Number(stock.buyPrice || 0),
                            unitSellPrice,
                            description: stock.description || "",
                            substation: substation._id
                        }
                    ],
                    { session }
                );
            }

            // Existing business rule: allocating to a Product consumes the
            // corresponding warehouse Stock. Do NOT change Product.units here
            // after this point; it already contains the allocated quantity.
            stock.units -= units;

            await stock.save({ session });
        });

        return product;
    } finally {
        await session.endSession();
    }
};
