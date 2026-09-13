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


    const productIds =
        new Set();


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
    // LOAD BUYING PRICES
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


        customerArrears,

        staffSales

    };

}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    getSummary

};