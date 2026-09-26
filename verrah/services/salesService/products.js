// ==========================================================
// verrah/services/salesService/products.js
//
// VERRAH COSMETICS
// PRODUCT ANALYTICS SERVICE
//
// SUBSTATION-AWARE PRODUCT ANALYTICS
//
// BUSINESS TYPE:
//
//     Staff
//         -> user.assignedSubstation
//         -> assigned substation.businessType
//
//     Admin + selected substation
//         -> selected substation.businessType
//
//     Admin + no selected substation
//         -> existing global logic
//
// CATEGORIES:
//
//     Staff / Admin + selected substation
//         -> categories whose businessType.id matches
//            the substation businessType.id
//
// PRODUCTS:
//
//     Staff / Admin + selected substation
//         -> products whose category belongs to the
//            matching business type
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
//
// stockProductId:
//
//     Product.stock
//         -> ID of the Stock record related to the Product
//
// category:
//
//     Product.category
//         -> Category document from models/category.js
//
// category filter:
//
//     filter.category
//         -> Product.category
//            when a category is selected
//
// ==========================================================


const Product =
    require("../../models/products");


const Stock =
    require("../../models/stock");


const Package =
    require("../../models/package");


const Substation =
    require("../../models/substations");


const Category =
    require("../../models/category");


// ==========================================================
// GET ID VALUE
// ==========================================================

function getIdValue(
    value
) {

    if (
        !value
    ) {

        return null;

    }


    if (
        typeof value === "object" &&
        value._id
    ) {

        return String(
            value._id
        );

    }


    return String(
        value
    );

}


// ==========================================================
// GET USER ROLE
// ==========================================================

function getUserRole(
    user
) {

    if (
        !user
    ) {

        return "";

    }


    return String(
        user.role || ""
    ).toLowerCase();

}


// ==========================================================
// GET EFFECTIVE SUBSTATION ID
// ==========================================================

function getEffectiveSubstationId(
    filter,
    user
) {

    const role =
        getUserRole(
            user
        );


    // ======================================================
    // STAFF
    // ======================================================

    if (
        role === "staff"
    ) {

        return getIdValue(
            user.assignedSubstation
        );

    }


    // ======================================================
    // ADMIN + SELECTED SUBSTATION
    // ======================================================

    if (
        role === "admin" &&
        filter &&
        filter.substation
    ) {

        return getIdValue(
            filter.substation
        );

    }


    // ======================================================
    // ADMIN WITHOUT SELECTED SUBSTATION
    // ======================================================

    return null;

}


// ==========================================================
// GET EFFECTIVE BUSINESS TYPE
// ==========================================================

async function getEffectiveBusinessType(
    filter,
    user
) {

    const substationId =
        getEffectiveSubstationId(
            filter,
            user
        );


    // ======================================================
    // NO SUBSTATION
    // ======================================================

    if (
        !substationId
    ) {

        return null;

    }


    const substation =
        await Substation.findById(
            substationId
        )
            .select(
                "businessType"
            )
            .lean();


    if (
        !substation ||
        !substation.businessType ||
        !substation.businessType.id
    ) {

        return null;

    }


    return {

        id:
            substation.businessType.id,

        name:
            substation.businessType.name || ""

    };

}


// ==========================================================
// BUILD SUBSTATION QUERY
// ==========================================================

function getSubstationQuery(
    substationId,
    field
) {

    if (
        !substationId
    ) {

        return {};

    }


    return {

        [field]:
            substationId

    };

}


// ==========================================================
// GET SUBSTATION PRODUCT INVENTORY
// ==========================================================

async function getSubstationProductInventory(
    substationId
) {

    if (
        !substationId
    ) {

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
    filter,
    user = {}
) {

    // ======================================================
    // EFFECTIVE SUBSTATION
    // ======================================================

    const effectiveSubstationId =
        getEffectiveSubstationId(
            filter,
            user
        );


    // ======================================================
    // EFFECTIVE BUSINESS TYPE
    // ======================================================

    const businessType =
        await getEffectiveBusinessType(
            filter,
            user
        );


    // ======================================================
    // LOAD ALL ACTIVE CATEGORIES
    // ======================================================

    const categories =
        await Category.find({

            isActive:
                true

        })
            .select(
                "_id name categoryIcon isActive businessType"
            )
            .lean();


    // ======================================================
    // FILTER CATEGORIES BY BUSINESS TYPE
    // ======================================================
    //
    // ADMIN WITHOUT SUBSTATION:
    //     ALL active categories.
    //
    // STAFF:
    //     Only categories belonging to the assigned
    //     substation business type.
    //
    // ADMIN + SELECTED SUBSTATION:
    //     Only categories belonging to the selected
    //     substation business type.
    //
    // ======================================================

    const filteredCategories =
        businessType
            ? categories.filter(

                category => {

                    if (
                        !category.businessType ||
                        !category.businessType.id
                    ) {

                        return false;

                    }


                    return (

                        String(
                            category.businessType.id
                        ) ===

                        String(
                            businessType.id
                        )

                    );

                }

            )
            : categories;


    // ======================================================
    // CATEGORY BY ID
    // ======================================================

    const categoryById =
        new Map();


    for (
        const category
        of categories
    ) {

        categoryById.set(

            String(
                category._id
            ),

            category

        );

    }


    // ======================================================
    // PRODUCT QUERY
    // ======================================================

    const productQuery = {

        isActive:
            true

    };


    // ======================================================
    // BUSINESS TYPE PRODUCT FILTER
    // ======================================================
    //
    // Product does not contain businessType directly.
    //
    // Product.category
    //       ↓
    // Category.businessType.id
    //
    // ======================================================

    if (
        businessType
    ) {

        const businessTypeCategoryIds =
            filteredCategories.map(

                category =>
                    category._id

            );


        productQuery.category = {

            $in:
                businessTypeCategoryIds

        };

    }


    // ======================================================
    // CATEGORY FILTER
    // ======================================================
    //
    // If a category is selected:
    //
    //     ADMIN WITHOUT SUBSTATION
    //         -> use selected category.
    //
    //     STAFF / ADMIN + SUBSTATION
    //         -> use selected category only when it
    //            belongs to the active business type.
    //
    // A stale category from another business type is
    // ignored rather than turning the entire query into
    // category: { $in: [] }.
    //
    // ======================================================

    if (
        filter &&
        filter.category
    ) {

        const selectedCategoryId =
            String(
                filter.category
            );


        if (
            !businessType
        ) {

            productQuery.category =
                filter.category;

        } else {

            const categoryBelongsToBusinessType =
                filteredCategories.some(

                    category =>

                        String(
                            category._id
                        ) ===
                        selectedCategoryId

                );


            if (
                categoryBelongsToBusinessType
            ) {

                productQuery.category =
                    filter.category;

            }

        }

    }


    // ======================================================
    // LOAD ACTIVE PRODUCTS
    // ======================================================

    const products =
        await Product.find(
            productQuery
        )
            .select(
                "_id name category subcategory units stock"
            )
            .lean();


    // ======================================================
    // LOAD ALL ACTIVE STOCK
    //
    // STOCK REMAINS GLOBAL.
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
    // MARKET INVENTORY
    // ======================================================

    let marketInventoryByProduct =
        new Map();


    if (
        effectiveSubstationId
    ) {

        marketInventoryByProduct =
            await getSubstationProductInventory(
                effectiveSubstationId
            );

    }


    // ======================================================
    // DELIVERED PACKAGES
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

            effectiveSubstationId,

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
    // ==========================================================

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


                const category =
                    product.category

                        ? categoryById.get(
                            String(
                                product.category
                            )
                        ) || null

                        : null;


                // ==================================================
                // MARKET AVAILABLE
                // ==================================================

                let marketAvailable;


                if (
                    effectiveSubstationId
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

                    category:
                        category,

                    stockProductId:
                        product.stock
                            ? String(
                                product.stock
                            )
                            : null,

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