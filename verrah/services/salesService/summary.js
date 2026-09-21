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
// Staff Sales
//     -> salesSubstation
//
// Packages
//     -> Staff associated with the package
//     -> User.assignedSubstation determines the sales location
//
// Package staff association:
//     1. confirmedByStaffId
//     2. deliveredByStaffId
//
// packageSubstation is the CUSTOMER PICKUP SUBSTATION.
// It is NOT used as the staff sales-location filter.
//
// When filter.substation is null:
//
//     All substations are included.
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

const User =
    require("../../models/user");


// ==========================================================
// GET STAFF IDS ASSIGNED TO SUBSTATION
// ==========================================================
//
// User.assignedSubstation identifies the substation where
// the staff member operates.
//
// The returned IDs are strings because:
//
//     confirmedByStaffId
//     deliveredByStaffId
//
// are stored as String fields in Package.
//
// ==========================================================

async function getStaffIdsForSubstation(
    substation
) {

    if (!substation) {

        return [];

    }


    const users =
        await User.find({

            assignedSubstation:
                substation

        })

            .select(
                "_id"
            )

            .lean();


    return users.map(
        user =>
            String(
                user._id
            )
    );

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
//     A package belongs to that substation when the staff
//     member associated with the package is assigned to the
//     selected substation.
//
// confirmedByStaffId is preferred because confirmation is
// the staff package workflow event.
//
// deliveredByStaffId is also supported so packages that have
// reached delivery without a matching confirmation record
// can still be attributed to the staff member's substation.
//
// IMPORTANT:
//
// packageSubstation is deliberately NOT used here.
//
// It represents the customer's pickup station, not the
// staff sales location.
// ==========================================================

async function getPackageQuery(
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


    // ------------------------------------------------------
    // NO SUBSTATION FILTER
    // ------------------------------------------------------

    if (
        !filter ||
        !filter.substation
    ) {

        return dateQuery;

    }


    // ------------------------------------------------------
    // FIND STAFF ASSIGNED TO SELECTED SUBSTATION
    // ------------------------------------------------------

    const staffIds =
        await getStaffIdsForSubstation(
            filter.substation
        );


    // ------------------------------------------------------
    // NO STAFF ASSIGNED TO THIS SUBSTATION
    // ------------------------------------------------------
    //
    // Return a query that cannot match a normal package.
    //
    // Using an impossible staff ID avoids accidentally
    // including packages from other substations.
    // ------------------------------------------------------

    if (
        !staffIds.length
    ) {

        return {

            ...dateQuery,

            $or: [

                {
                    confirmedByStaffId:
                        "__NO_MATCHING_STAFF__"
                },

                {
                    deliveredByStaffId:
                        "__NO_MATCHING_STAFF__"
                }

            ]

        };

    }


    // ------------------------------------------------------
    // FILTER PACKAGES BY STAFF'S ASSIGNED SUBSTATION
    // ------------------------------------------------------

    return {

        ...dateQuery,

        $or: [

            {
                confirmedByStaffId: {

                    $in:
                        staffIds

                }

            },

            {
                deliveredByStaffId: {

                    $in:
                        staffIds

                }

            }

        ]

    };

}


// ==========================================================
// BUILD SUBSTATION QUERY
// ==========================================================
//
// Used for models where the actual sales/expense record
// contains the substation directly.
//
// Example:
//
//     StaffSale.salesSubstation
//     Liability.substation
//
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
// GET SUMMARY
// ==========================================================

async function getSummary(
    filter
) {

    // ======================================================
    // PACKAGE QUERY
    // ======================================================

    const packageQuery =
        await getPackageQuery(
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
    // Do NOT use "substation" here.
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
    // LOAD PRODUCTS FOR ASSET COST
    // ======================================================
    //
    // Product asset cost is calculated from active global
    // product inventory.
    //
    // Products remain global product records and therefore
    // are not restricted by substation.
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
    // LOAD STOCK FOR ASSET COST
    // ======================================================
    //
    // Stock is substation-specific when a substation filter
    // is selected.
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
                "buyPrice units substation"
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