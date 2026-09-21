// ==========================================================
// verrah/services/salesService/products.js
//
// VERRAH COSMETICS
// PRODUCT ANALYTICS SERVICE
//
// GLOBAL SUBSTATION FILTER
//
// When filter.substation is provided:
//
//     Stock
//         -> NOT filtered by substation
//
//     Delivered Packages
//         -> filtered by packageSubstation
//
// Products themselves remain global product records.
//
// IMPORTANT:
//
//     product
//         -> passed through to the result
//
//     product.units
//         -> passed through as units
//         -> NOT filtered
//
//     stock.units
//         -> aggregated and passed as stockUnits
//         -> NOT filtered
//
//     stockAvailable
//         -> displayed stock quantity
//         -> NOT filtered
//
//     marketAvailable
//         -> displayed product market quantity
//         -> product.units
//
//     sales
//         -> delivered package quantities
//         -> filtered by packageSubstation
// ==========================================================


const Product =
    require("../../models/products");


const Stock =
    require("../../models/stock");


const Package =
    require("../../models/package");


// ==========================================================
// BUILD SUBSTATION QUERY
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
// GET PRODUCT ANALYTICS
// ==========================================================

async function getProductAnalytics(
    filter
) {

    // ======================================================
    // LOAD ACTIVE PRODUCTS
    //
    // Products are global records and therefore are not
    // filtered by substation.
    //
    // The complete product object is retained so that
    // product and product.units can be passed forward.
    // ======================================================

    const products =
        await Product.find({

            isActive:
                true

        })

            .select(
                "_id name subcategory units buyPrice stock unitSellPrice"
            )

            .lean();


    // ======================================================
    // LOAD ALL ACTIVE STOCK
    //
    // Stock is global.
    //
    // DO NOT filter stock by substation.
    // ======================================================

    const stockRecords =
        await Stock.find({

            isActive:
                true

        })

            .select(
                "subcategory units substation"
            )

            .lean();


    // ======================================================
    // STOCK BY SUBCATEGORY
    //
    // This remains GLOBAL.
    //
    // Every active stock record contributes to the
    // subcategory total regardless of substation.
    // ======================================================

    const stockBySubcategory =
        new Map();


    for (
        const stock
        of stockRecords
    ) {

        const key =
            String(
                stock.subcategory || ""
            )
                .trim()
                .toLowerCase();


        if (!key) {

            continue;

        }


        const existing =
            stockBySubcategory.get(
                key
            ) || 0;


        stockBySubcategory.set(

            key,

            existing +
            Number(
                stock.units || 0
            )

        );

    }


    // ======================================================
    // DELIVERED PACKAGES
    //
    // Packages ARE filtered by packageSubstation.
    //
    // The date filter remains exactly as before.
    // ======================================================

    const deliveredPackageQuery = {

        status:
            "delivered",

        createdAt: {

            $gte:
                filter.startDate,

            $lt:
                filter.endDate

        },

        ...getSubstationQuery(
            filter,
            "packageSubstation"
        )

    };


    const deliveredPackages =
        await Package.find(
            deliveredPackageQuery
        )

            .select(
                "items packageSubstation"
            )

            .lean();


    // ======================================================
    // SALES BY PRODUCT
    // ======================================================

    const salesByProduct =
        new Map();


    for (
        const pkg
        of deliveredPackages
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


            const key =
                String(
                    item.productId
                );


            salesByProduct.set(

                key,

                (

                    salesByProduct.get(
                        key
                    ) || 0

                ) +

                Number(
                    item.qty || 0
                )

            );

        }

    }


    // ======================================================
    // RETURN PRODUCT ANALYTICS
    // ======================================================

    return products

        .map(

            product => {

                const subcategory =
                    String(
                        product.subcategory || ""
                    )
                        .trim()
                        .toLowerCase();


                // ==========================================
                // RAW PRODUCT UNITS
                //
                // Passed through unchanged.
                // ==========================================

                const units =
                    Number(
                        product.units || 0
                    );


                // ==========================================
                // GLOBAL STOCK UNITS
                //
                // Passed through unchanged.
                // ==========================================

                const stockUnits =
                    stockBySubcategory.get(
                        subcategory
                    ) || 0;


                return {

                    // ======================================
                    // COMPLETE PRODUCT
                    // ======================================

                    product:


                        product,


                    // ======================================
                    // PRODUCT IDENTIFICATION
                    // ======================================

                    _id:
                        product._id,

                    name:
                        product.name,


                    // ======================================
                    // RAW PRODUCT UNITS
                    //
                    // Passed, not displayed directly.
                    // ======================================

                    units:
                        units,


                    // ======================================
                    // RAW STOCK UNITS
                    //
                    // Passed, not displayed directly.
                    // NOT filtered by substation.
                    // ======================================

                    stockUnits:
                        stockUnits,


                    // ======================================
                    // DISPLAYED STOCK
                    //
                    // Global stock.
                    // ======================================

                    stockAvailable:
                        stockUnits,


                    // ======================================
                    // DISPLAYED MARKET
                    //
                    // Product.units.
                    // ======================================

                    marketAvailable:
                        units,


                    // ======================================
                    // DISPLAYED SALES
                    //
                    // Filtered through packageSubstation
                    // above.
                    // ======================================

                    sales:
                        salesByProduct.get(

                            String(
                                product._id
                            )

                        ) || 0

                };

            }

        )

        .sort(

            (a, b) =>
                String(
                    a.name
                ).localeCompare(

                    String(
                        b.name
                    )

                )

        );

}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    getProductAnalytics

};