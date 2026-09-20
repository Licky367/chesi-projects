// ==========================================================
// verrah/services/salesService/summary.js
//
// VERRAH COSMETICS
// SALES SUMMARY SERVICE
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
// GET SUMMARY
// ==========================================================

async function getSummary(
    filter
) {

    // ======================================================
    // LOAD PACKAGES
    // ======================================================

    const packages =
        await Package.find({

            createdAt: {

                $gte:
                    filter.startDate,

                $lt:
                    filter.endDate

            }

        })

            .select(
                "items totalAmount paidAmount status"
            )

            .lean();


    // ======================================================
    // LOAD STAFF SALES
    // ======================================================

    const staffSales =
        await StaffSale.find({

            createdAt: {

                $gte:
                    filter.startDate,

                $lt:
                    filter.endDate

            }

        })

            .populate({

                path:
                    "soldBy",

                select:
                    "name"

            })

            .sort({

                createdAt:
                    -1

            })

            .lean();


    // ======================================================
    // LOAD LIABILITIES / EXPENSES
    // ======================================================
    //
    // Every liability recorded within the selected period
    // is treated as an expense.
    //
    // Total Expenses:
    //
    //     Sum of liability.amount
    //
    // ======================================================

    const liabilities =
        await Liability.find({

            createdAt: {

                $gte:
                    filter.startDate,

                $lt:
                    filter.endDate

            }

        })

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
    // Product asset cost:
    //
    //     buyPrice × units
    //
    // Stock asset cost:
    //
    //     buyPrice × units
    //
    // Total:
    //
    //     Product asset cost + Stock asset cost
    //
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
    // LOAD ALL PRODUCTS FOR ASSET COST
    // ======================================================
    //
    // Every Product contributes:
    //
    //     buyPrice × units
    //
    // ======================================================

    const allProducts =
        await Product.find({

            isActive:
                true

        })

            .select(
                "buyPrice units"
            )

            .lean();


    // ======================================================
    // CALCULATE PRODUCT ASSET COST
    // ======================================================

    for (
        const product
        of allProducts
    ) {

        const buyPrice =
            Number(
                product.buyPrice || 0
            );


        const units =
            Number(
                product.units || 0
            );


        productAssetCost +=
            buyPrice * units;

    }


    // ======================================================
    // LOAD ALL STOCK FOR ASSET COST
    // ======================================================
    //
    // Every Stock record contributes:
    //
    //     buyPrice × units
    //
    // ======================================================

    const allStock =
        await Stock.find({

            isActive:
                true

        })

            .select(
                "buyPrice units"
            )

            .lean();


    // ======================================================
    // CALCULATE STOCK ASSET COST
    // ======================================================

    for (
        const stock
        of allStock
    ) {

        const buyPrice =
            Number(
                stock.buyPrice || 0
            );


        const units =
            Number(
                stock.units || 0
            );


        stockAssetCost +=
            buyPrice * units;

    }


    // ======================================================
    // TOTAL ASSET COST
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
    //
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


        // ==================================================
        // EXPENSES
        // ==================================================

        expenses,

        netProfit,


        customerArrears,


        // ==================================================
        // ASSET COST
        // ==================================================

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