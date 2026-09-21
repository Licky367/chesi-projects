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
    // ======================================================

    const products =
        await Product.find({

            isActive:
                true

        })

            .select(
                "_id name subcategory units buyPrice stock"
            )

            .lean();


    // ======================================================
    // LOAD ALL ACTIVE STOCK
    //
    // Stock is global.
    //
    // DO NOT filter stock by substation because there is
    // no substation-specific stock inventory model.
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
    // Packages are filtered by their packageSubstation.
    //
    // The date filter remains active exactly as before.
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


                return {

                    _id:
                        product._id,

                    name:
                        product.name,

                    stockAvailable:
                        stockBySubcategory.get(
                            subcategory
                        ) || 0,

                    marketAvailable:
                        Number(
                            product.units || 0
                        ),

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