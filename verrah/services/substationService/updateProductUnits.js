// ==========================================================
// verrah/services/substationService/updateProductUnits.js
// UPDATE PRODUCT UNITS AT SUBSTATION
// ==========================================================

const mongoose = require("mongoose");

const Substation = require("../models/substations");
const Product = require("../models/products");
const Stock = require("../models/stock");

exports.updateProductUnits = async (
    productId,
    body
) => {
    body = body || {};

    if (!mongoose.isValidObjectId(productId)) {
        throw new Error("Invalid product.");
    }

    if (!mongoose.isValidObjectId(body.substationId)) {
        throw new Error("Invalid substation.");
    }

    const newUnits =
        Number(body.units);

    if (
        !Number.isInteger(newUnits) ||
        newUnits < 0
    ) {
        throw new Error(
            "Units must be a whole number greater than or equal to zero."
        );
    }

    const session =
        await mongoose.startSession();

    try {
        let result;

        await session.withTransaction(
            async () => {

                // ==================================================
                // PRODUCT
                // ==================================================

                const product =
                    await Product
                        .findOne({
                            _id: productId,
                            isActive: true
                        })
                        .session(session);

                if (!product) {
                    throw new Error(
                        "Product not found."
                    );
                }

                // ==================================================
                // SOURCE STOCK
                // ==================================================

                const stock =
                    await Stock
                        .findOne({
                            _id: product.stock,
                            isActive: true
                        })
                        .session(session);

                if (!stock) {
                    throw new Error(
                        "The source stock subcategory was not found."
                    );
                }

                // ==================================================
                // SUBSTATION
                // ==================================================

                const substation =
                    await Substation
                        .findOne({
                            _id: body.substationId,
                            isActive: true
                        })
                        .session(session);

                if (!substation) {
                    throw new Error(
                        "Substation not found or inactive."
                    );
                }

                // ==================================================
                // SUBSTATION INVENTORY ENTRY
                // ==================================================

                const inventory =
                    substation.productInventory.find(
                        entry =>
                            String(entry.productId) ===
                            String(product._id)
                    );

                if (!inventory) {
                    throw new Error(
                        "This product is not allocated to the selected substation."
                    );
                }

                // ==================================================
                // OLD UNITS
                // ==================================================

                const oldUnits =
                    Number(inventory.units || 0);

                // ==================================================
                // DELTA
                // ==================================================

                const delta =
                    newUnits - oldUnits;

                // ==================================================
                // CHECK SOURCE STOCK
                // ==================================================

                if (
                    delta > 0 &&
                    Number(stock.units || 0) < delta
                ) {
                    throw new Error(
                        `Only ${Number(
                            stock.units || 0
                        )} units remain in the source stock. You need ${delta} additional units.`
                    );
                }

                // ==================================================
                // UPDATE SUBSTATION INVENTORY
                // ==================================================

                inventory.units = newUnits;
                inventory.updatedAt = new Date();
                inventory.productName = product.name;
                inventory.category = product.category;
                inventory.subcategory = product.subcategory;
                inventory.days =
                    Number(product.days || 0);

                await substation.save({
                    session
                });

                // ==================================================
                // UPDATE PRODUCT TOTAL UNITS
                // ==================================================

                product.units =
                    Math.max(
                        0,
                        Number(product.units || 0) +
                        delta
                    );

                product.updatedAt =
                    new Date();

                await product.save({
                    session
                });

                // ==================================================
                // UPDATE SOURCE STOCK
                // ==================================================

                stock.units =
                    Math.max(
                        0,
                        Number(stock.units || 0) -
                        delta
                    );

                stock.totalsUpdatedAt =
                    new Date();

                await stock.save({
                    session
                });

                // ==================================================
                // LOAD ACTIVE STOCK
                // ==================================================

                const allStocks =
                    await Stock
                        .find({
                            isActive: true
                        })
                        .select(
                            "_id category units buyPrice"
                        )
                        .session(session)
                        .lean();

                // ==================================================
                // CATEGORY TOTALS
                // ==================================================

                const categoryTotals =
                    new Map();

                let overall = 0;

                for (
                    const item of allStocks
                ) {
                    const value =
                        Number(item.units || 0) *
                        Number(item.buyPrice || 0);

                    categoryTotals.set(
                        item.category,
                        (
                            categoryTotals.get(
                                item.category
                            ) || 0
                        ) + value
                    );

                    overall += value;
                }

                // ==================================================
                // CURRENT TIME
                // ==================================================

                const now = new Date();

                // ==================================================
                // UPDATE STOCK TOTAL FIELDS
                // ==================================================

                for (
                    const item of allStocks
                ) {
                    const value =
                        Number(item.units || 0) *
                        Number(item.buyPrice || 0);

                    await Stock.updateOne(
                        {
                            _id: item._id
                        },
                        {
                            $set: {
                                cashOutflow: value,

                                categoryOveral:
                                    categoryTotals.get(
                                        item.category
                                    ) || 0,

                                overal:
                                    overall,

                                totalsUpdatedAt:
                                    now
                            }
                        },
                        {
                            session,
                            timestamps: true
                        }
                    );
                }

                // ==================================================
                // RESULT
                // ==================================================

                result = {
                    productId:
                        product._id,

                    substationId:
                        substation._id,

                    units:
                        newUnits,

                    delta
                };
            }
        );

        return result;

    } finally {
        await session.endSession();
    }
};
