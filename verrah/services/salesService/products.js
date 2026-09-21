// ==========================================================
// verrah/services/salesService/products.js
//
// VERRAH COSMETICS
// PRODUCT ANALYTICS SERVICE
//
// SUBSTATION-AWARE PRODUCT ANALYTICS
//
// marketAvailable:
//
//     Staff
//         -> Substation.productInventory.units
//            for their assigned substation
//
//     Admin + no substation filter
//         -> Product.units
//
//     Admin + substation filter
//         -> Substation.productInventory.units
//            for the selected substation
//
// sales:
//
//     Delivered packages
//         -> filtered by packageSubstation when a
//            substation is active
//
// stockAvailable:
//
//     Remains GLOBAL and unchanged.
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
// GET SUBSTATION PRODUCT INVENTORY
// ==========================================================
//
// Returns:
//
//     Map {
//         productId -> units
//     }
//
// The inventory belongs to the selected substation.
//
// ==========================================================

async function getSubstationProductInventory(
    substationId
) {

    if (!substationId) {

        return new Map();

    }


    const substation =
        await Substation.findOne({

            _id:
                substationId,

            isActive:
                true

        })

            .select(
                "productInventory"
            )

            .lean();


    const inventoryByProduct =
        new Map();


    if (
        !substation ||
        !Array.isArray(
            substation.productInventory
        )
    ) {

        return inventoryByProduct;

    }


    for (
        const inventory
        of substation.productInventory
    ) {

        if (
            !inventory.productId
        ) {

            continue;

        }


        inventoryByProduct.set(

            String(
                inventory.productId
            ),

            Number(
                inventory.units || 0
            )

        );

    }


    return inventoryByProduct;

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
    // Products remain global records.
    // ======================================================

    const products =
        await Product.find({

            isActive:
                true

        })

            .select(
                "_id name subcategory units stock"
            )

            .lean();


    // ======================================================
    // LOAD ALL ACTIVE STOCK
    //
    // STOCK REMAINS GLOBAL.
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
    // MARKET INVENTORY
    // ======================================================
    //
    // NO SUBSTATION:
    //
    //     Use global Product.units.
    //
    // SUBSTATION SELECTED:
    //
    //     Use Substation.productInventory.units.
    //
    // For staff, filter.substation must contain their
    // assigned substation.
    // ======================================================

    let marketInventoryByProduct =
        new Map();


    if (
        filter &&
        filter.substation
    ) {

        marketInventoryByProduct =
            await getSubstationProductInventory(
                filter.substation
            );

    }


    // ======================================================
    // DELIVERED PACKAGES
    //
    // The existing date filtering remains unchanged.
    //
    // If a substation is active, packages are filtered by
    // packageSubstation.
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


                const productId =
                    String(
                        product._id
                    );


                // ==================================================
                // MARKET AVAILABLE
                // ==================================================
                //
                // With a substation:
                //
                //     Substation.productInventory.units
                //
                // Without a substation:
                //
                //     Product.units
                //
                // Missing substation inventory means 0.
                // ==================================================

                let marketAvailable;


                if (
                    filter &&
                    filter.substation
                ) {

                    marketAvailable =
                        marketInventoryByProduct.get(
                            productId
                        ) || 0;

                } else {

                    marketAvailable =
                        Number(
                            product.units || 0
                        );

                }


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
                        salesByProduct.get(
                            productId
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