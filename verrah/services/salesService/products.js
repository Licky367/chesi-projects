// ==========================================================
// verrah/services/salesService/products.js
//
// VERRAH COSMETICS
// PRODUCT ANALYTICS SERVICE
//
// MARKET AVAILABILITY + SALES
//
// MARKET AVAILABLE
//
// Staff
//     -> Uses inventory from assigned substation.
//
// Admin + substation filter
//     -> Uses inventory from selected substation.
//
// Admin + no substation filter
//     -> Uses global Product.units.
//
// SALES
//
// Staff
//     -> Sales from delivered packages belonging to the
//        staff member's assigned substation.
//
// Admin + substation filter
//     -> Sales from delivered packages belonging to the
//        selected substation.
//
// Admin + no substation filter
//     -> Sales from all delivered packages.
//
// STOCK AVAILABLE
//
//     -> Remains global and unchanged.
// ==========================================================

const Product =
    require("../../models/products");

const Stock =
    require("../../models/stock");

const Package =
    require("../../models/package");

const Substation =
    require("../../models/substations");

// ==========================================================
// GET EFFECTIVE SUBSTATION
// ==========================================================

function getEffectiveSubstation(filter) {

    if (
        !filter
    ) {

        return null;

    }

    if (
        filter.substation
    ) {

        return filter.substation;

    }

    if (
        filter.role === "staff" &&
        filter.assignedSubstation
    ) {

        return filter.assignedSubstation;

    }

    return null;

}

// ==========================================================
// BUILD SUBSTATION QUERY
// ==========================================================

function getSubstationQuery(
    substation,
    field
) {

    if (
        !substation
    ) {

        return {};

    }

    return {

        [field]:
            substation

    };

}

// ==========================================================
// GET PRODUCT ANALYTICS
// ==========================================================

async function getProductAnalytics(
    filter
) {

    // ======================================================
    // EFFECTIVE SUBSTATION
    //
    // This is used ONLY for:
    //
    //     marketAvailable
    //     sales
    //
    // ======================================================

    const effectiveSubstation =
        getEffectiveSubstation(
            filter
        );


    // ======================================================
    // LOAD ACTIVE PRODUCTS
    //
    // Products are global records and therefore are not
    // filtered by substation.
    //
    // Keep buyPrice and stock selected because other
    // analytics calculations depend on the complete
    // product data.
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
    // Stock remains global.
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


        if (
            !key
        ) {

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
    // MARKET INVENTORY BY PRODUCT
    //
    // Only load substation inventory when an effective
    // substation exists.
    //
    // The inventory is embedded in:
    //
    //     Substation.productInventory[]
    //
    // and matched using productId.
    // ======================================================

    const marketInventoryByProduct =
        new Map();


    if (
        effectiveSubstation
    ) {

        const substation =
            await Substation.findOne({

                name:
                    effectiveSubstation

            })

                .select(
                    "productInventory"
                )

                .lean();


        if (
            substation &&
            Array.isArray(
                substation.productInventory
            )
        ) {

            for (
                const inventory
                of substation.productInventory
            ) {

                if (
                    !inventory.productId
                ) {

                    continue;

                }


                marketInventoryByProduct.set(

                    String(
                        inventory.productId
                    ),

                    Number(
                        inventory.units || 0
                    )

                );

            }

        }

    }


    // ======================================================
    // DELIVERED PACKAGES
    //
    // The date filter remains active.
    //
    // If an effective substation exists:
    //     -> only that substation's packages are included.
    //
    // Otherwise:
    //     -> all delivered packages are included.
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

            effectiveSubstation,

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
    //
    // Sales are calculated from delivered package items.
    //
    // The package query above already limits the sales to
    // the effective substation when one is selected.
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


                const productId =
                    String(
                        product._id
                    );


                // ==================================================
                // MARKET AVAILABLE
                //
                // Admin with NO substation:
                //     Product.units
                //
                // Staff / Admin with substation:
                //     Substation.productInventory.units
                // ==================================================

                const marketAvailable =
                    effectiveSubstation

                        ? (
                            marketInventoryByProduct.get(
                                productId
                            ) || 0
                        )

                        : Number(
                            product.units || 0
                        );


                // ==================================================
                // SALES
                //
                // Uses delivered package quantities for the
                // applicable date/substation scope.
                // ==================================================

                const sales =
                    salesByProduct.get(
                        productId
                    ) || 0;


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
                        marketAvailable,

                    sales:
                        sales

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