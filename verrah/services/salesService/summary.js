// ==========================================================
// verrah/services/salesService/summary.js
//
// VERRAH COSMETICS
// SALES SUMMARY SERVICE
//
// GLOBAL SUBSTATION FILTER
//
// SALES LOCATION RULES:
//
// Packages
//     -> packageSubstation
//
// Staff Sales
//     -> salesSubstation
//
// Liabilities
//     -> substation
//
// Stock
//     -> substation
//
// IMPORTANT:
//
// Package substation is now the authoritative substation
// for package sales.
//
// User.assignedSubstation is NOT used.
//
// confirmedByStaffId and deliveredByStaffId are NOT used
// for substation filtering.
//
// When filter.substation is null:
//
//     All substations are included.
//
// ASSET VALUE:
//
// Product asset value
//     -> Sum of remaining Product.fifoBatches
//        (units × buyPrice)
//
// Stock asset value
//     -> Sum of remaining Stock.purchaseBatches
//        (units × buyPrice)
//
// Total asset value
//     -> Product asset value + Stock asset value
//
// Legacy Product.buyPrice and Stock.buyPrice are NOT used
// for FIFO asset valuation.
// ==========================================================


const Package =
    require("../../models/package");

const StaffSale =
    require("../../models/staff-sales");

const Product =
    require("../../models/products");

const Stock =
    require("../../models/stock");

const Liability =
    require("../../models/liability");


// ==========================================================
// BUILD SUBSTATION QUERY
// ==========================================================
//
// Used for models where the actual sales/expense record
// contains the substation directly.
//
// Examples:
//
//     Package.packageSubstation
//     StaffSale.salesSubstation
//     Liability.substation
//     Stock.substation
//
// When no substation is selected:
//
//     {}
//
// When a substation is selected:
//
//     { [field]: filter.substation }
// ==========================================================

function getSubstationQuery(
    filter,
    field
) {

    if (
        !filter ||
        !filter.substation
    ) {

        return {};

    }


    return {

        [field]:
            filter.substation

    };

}


// ==========================================================
// BUILD PACKAGE QUERY
// ==========================================================
//
// When no substation is selected:
//
//     All packages in the date range are included.
//
// When a substation is selected:
//
//     Package.packageSubstation must match the selected
//     substation.
//
// User.assignedSubstation is NOT checked.
//
// confirmedByStaffId is NOT checked.
//
// deliveredByStaffId is NOT checked.
// ==========================================================

function getPackageQuery(
    filter
) {

    const dateQuery = {

        createdAt: {

            $gte:
                filter.startDate,

            $lt:
                filter.endDate

        }

    };


    return {

        ...dateQuery,

        ...getSubstationQuery(
            filter,
            "packageSubstation"
        )

    };

}


// ==========================================================
// GET SUMMARY
// ==========================================================

async function getSummary(
    filter
) {

    // ======================================================
    // PACKAGE QUERY
    // ======================================================

    const packageQuery =
        getPackageQuery(
            filter
        );


    // ======================================================
    // LOAD PACKAGES
    // ======================================================

    const packages =
        await Package.find(
            packageQuery
        )

            .select(
                [
                    "items",
                    "totalAmount",
                    "paidAmount",
                    "status",
                    "packageSubstation",
                    "confirmedByStaffId",
                    "deliveredByStaffId",
                    "confirmedSubstationId",
                    "deliveredSubstationId"
                ].join(" ")
            )

            .lean();


    // ======================================================
    // STAFF SALES QUERY
    // ======================================================
    //
    // Staff sales use salesSubstation as the authoritative
    // sales location.
    //
    // Do NOT use:
    //
    //     substation
    //
    // Do NOT use:
    //
    //     soldBy.assignedSubstation
    // ======================================================

    const staffSalesQuery = {

        createdAt: {

            $gte:
                filter.startDate,

            $lt:
                filter.endDate

        },

        ...getSubstationQuery(
            filter,
            "salesSubstation"
        )

    };


    // ======================================================
    // LOAD STAFF SALES
    // ======================================================

    const staffSales =
        await StaffSale.find(
            staffSalesQuery
        )

            .populate({

                path:
                    "soldBy",

                select:
                    "name assignedSubstation"

            })

            .sort({

                createdAt:
                    -1

            })

            .lean();


    // ======================================================
    // LIABILITY / EXPENSE QUERY
    // ======================================================

    const liabilityQuery = {

        createdAt: {

            $gte:
                filter.startDate,

            $lt:
                filter.endDate

        },

        ...getSubstationQuery(
            filter,
            "substation"
        )

    };


    // ======================================================
    // LOAD LIABILITIES / EXPENSES
    // ======================================================

    const liabilities =
        await Liability.find(
            liabilityQuery
        )

            .select(
                "name amount recordedBy substation createdAt"
            )

            .lean();


    // ======================================================
    // VARIABLES
    // ======================================================

    let packageRevenue =
        0;


    let customerArrears =
        0;


    let packageBuyingCost =
        0;


    let staffSalesRevenue =
        0;


    let staffSalesBuyingCost =
        0;


    let expenses =
        0;


    // ======================================================
    // ASSET COST
    // ======================================================
    //
    // Asset value is calculated independently of the
    // selected sales date range.
    //
    // Product:
    //     fifoBatches
    //
    // Stock:
    //     purchaseBatches
    //
    // Each remaining batch contributes:
    //
    //     units × buyPrice
    // ======================================================

    let productAssetCost =
        0;


    let stockAssetCost =
        0;


    const productIds =
        new Set();


    // ======================================================
    // PROCESS LIABILITIES / EXPENSES
    // ======================================================

    for (
        const liability
        of liabilities
    ) {

        expenses +=
            Number(
                liability.amount || 0
            );

    }


    // ======================================================
    // PROCESS PACKAGES
    // ======================================================

    for (
        const pkg
        of packages
    ) {

        const paidAmount =
            Number(
                pkg.paidAmount || 0
            );


        const totalAmount =
            Number(
                pkg.totalAmount || 0
            );


        packageRevenue +=
            paidAmount;


        if (
            pkg.status ===
            "delivered"
        ) {

            customerArrears +=
                Math.max(

                    0,

                    totalAmount -
                    paidAmount

                );

        }


        for (
            const item
            of pkg.items || []
        ) {

            if (
                item.productId
            ) {

                productIds.add(

                    String(
                        item.productId
                    )

                );

            }

        }

    }


    // ======================================================
    // PROCESS STAFF SALES
    // ======================================================

    for (
        const sale
        of staffSales
    ) {

        staffSalesRevenue +=
            Number(
                sale.totalAmount || 0
            );


        for (
            const item
            of sale.products || []
        ) {

            if (
                item.productId
            ) {

                productIds.add(

                    String(
                        item.productId
                    )

                );

            }

        }

    }


    // ======================================================
    // LOAD BUYING PRICES FOR SOLD PRODUCTS
    // ======================================================
    //
    // NOTE:
    //
    // This is separate from ASSET VALUE.
    //
    // Existing sales buying-cost logic continues to use
    // Product.buyPrice exactly as before.
    // ======================================================

    const productMap =
        new Map();


    if (
        productIds.size
    ) {

        const products =
            await Product.find({

                _id: {

                    $in:
                        Array.from(
                            productIds
                        )

                }

            })

                .select(
                    "_id buyPrice"
                )

                .lean();


        for (
            const product
            of products
        ) {

            productMap.set(

                String(
                    product._id
                ),

                Number(
                    product.buyPrice || 0
                )

            );

        }

    }


    // ======================================================
    // PACKAGE BUYING COST
    // ======================================================

    for (
        const pkg
        of packages
    ) {

        for (
            const item
            of pkg.items || []
        ) {

            if (
                !item.productId
            ) {

                continue;

            }


            const buyPrice =
                productMap.get(

                    String(
                        item.productId
                    )

                ) || 0;


            const qty =
                Number(
                    item.qty || 0
                );


            packageBuyingCost +=
                buyPrice * qty;

        }

    }


    // ======================================================
    // STAFF SALES BUYING COST
    // ======================================================

    for (
        const sale
        of staffSales
    ) {

        for (
            const item
            of sale.products || []
        ) {

            if (
                !item.productId
            ) {

                continue;

            }


            const buyPrice =
                productMap.get(

                    String(
                        item.productId
                    )

                ) || 0;


            const qty =
                Number(
                    item.qty || 0
                );


            staffSalesBuyingCost +=
                buyPrice * qty;

        }

    }


    // ======================================================
    // LOAD PRODUCTS FOR ASSET VALUE
    // ======================================================
    //
    // Product inventory is global.
    //
    // Therefore Product asset value is NOT restricted by
    // the selected substation.
    //
    // IMPORTANT:
    //
    // Do NOT use:
    //
    //     Product.buyPrice
    //     Product.units
    //
    // for FIFO asset valuation.
    //
    // Use:
    //
    //     Product.fifoBatches
    // ==========================================================

    const allProducts =
        await Product.find({

            isActive:
                true

        })

            .select(
                "fifoBatches"
            )

            .lean();


    // ======================================================
    // CALCULATE PRODUCT ASSET VALUE
    // ======================================================
    //
    // Every remaining FIFO batch contributes:
    //
    //     batch.units × batch.buyPrice
    //
    // Example:
    //
    // fifoBatches:
    //
    //     100 × 50 = 5,000
    //      50 × 60 = 3,000
    //
    // Product asset value = 8,000
    // ======================================================

    for (
        const product
        of allProducts
    ) {

        if (
            !Array.isArray(
                product.fifoBatches
            )
        ) {

            continue;

        }


        for (
            const batch
            of product.fifoBatches
        ) {

            const units =
                Number(
                    batch.units || 0
                );


            const buyPrice =
                Number(
                    batch.buyPrice || 0
                );


            productAssetCost +=
                units *
                buyPrice;

        }

    }


    // ======================================================
    // LOAD STOCK FOR ASSET VALUE
    // ======================================================
    //
    // Stock is substation-specific when a substation filter
    // is selected.
    //
    // When no substation is selected:
    //
    //     All active stock is included.
    //
    // IMPORTANT:
    //
    // Do NOT use:
    //
    //     Stock.buyPrice
    //     Stock.units
    //
    // for FIFO asset valuation.
    //
    // Use:
    //
    //     Stock.purchaseBatches
    // ======================================================

    const stockQuery = {

        isActive:
            true,

        ...getSubstationQuery(
            filter,
            "substation"
        )

    };


    const allStock =
        await Stock.find(
            stockQuery
        )

            .select(
                "purchaseBatches substation"
            )

            .lean();


    // ======================================================
    // CALCULATE STOCK ASSET VALUE
    // ======================================================
    //
    // Every remaining purchase batch contributes:
    //
    //     batch.units × batch.buyPrice
    //
    // Example:
    //
    // purchaseBatches:
    //
    //     100 × 50 = 5,000
    //      50 × 60 = 3,000
    //
    // Stock asset value = 8,000
    // ======================================================

    for (
        const stock
        of allStock
    ) {

        if (
            !Array.isArray(
                stock.purchaseBatches
            )
        ) {

            continue;

        }


        for (
            const batch
            of stock.purchaseBatches
        ) {

            const units =
                Number(
                    batch.units || 0
                );


            const buyPrice =
                Number(
                    batch.buyPrice || 0
                );


            stockAssetCost +=
                units *
                buyPrice;

        }

    }


    // ======================================================
    // TOTAL ASSET VALUE
    // ======================================================
    //
    // Product FIFO asset value
    //     +
    //
    // Stock FIFO asset value
    //
    //     =
    //
    // Total asset value
    // ======================================================

    const assetCost =
        productAssetCost +
        stockAssetCost;


    // ======================================================
    // PROFITS
    // ======================================================

    const packageProfit =
        packageRevenue -
        packageBuyingCost;


    const staffSalesProfit =
        staffSalesRevenue -
        staffSalesBuyingCost;


    const totalRevenue =
        packageRevenue +
        staffSalesRevenue;


    const profit =
        packageProfit +
        staffSalesProfit;


    // ======================================================
    // NET PROFIT
    // ======================================================
    //
    // Net Profit:
    //
    //     Profit - Total Expenses
    // ======================================================

    const netProfit =
        profit -
        expenses;


    // ======================================================
    // RETURN
    // ======================================================

    return {

        packageRevenue,

        packageBuyingCost,

        packageProfit,


        staffSalesRevenue,

        staffSalesBuyingCost,

        staffSalesProfit,


        totalRevenue,

        profit,


        expenses,

        netProfit,


        customerArrears,


        assetCost,

        productAssetCost,

        stockAssetCost,


        staffSales

    };

}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    getSummary

};