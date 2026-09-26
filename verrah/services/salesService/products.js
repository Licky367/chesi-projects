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
//         -> global products
//
// PRODUCT RELATION:
//
//     Product.category
//          ↓
//     Category.businessType.id
//
// STOCK:
//
//     Always GLOBAL.
//
// MARKET:
//
//     Staff
//         -> assigned substation.productInventory
//
//     Admin + selected substation
//         -> selected substation.productInventory
//
//     Admin + no selected substation
//         -> Product.units
//
// SALES:
//
//     Delivered packages.
//     When a substation is active, sales are restricted to
//     that substation's packageSubstation.
//
// ==========================================================


const mongoose =
    require("mongoose");

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
    user = {}
) {

    return String(
        user.role || ""
    ).toLowerCase();

}


// ==========================================================
// GET EFFECTIVE SUBSTATION ID
// ==========================================================
//
// STAFF:
//
//     Always use assignedSubstation.
//
// ADMIN:
//
//     Use selected products-filter substation.
//
// ADMIN WITHOUT SUBSTATION:
//
//     null.
//
// ==========================================================

function getEffectiveSubstationId(
    filter = {},
    user = {}
) {

    const role =
        getUserRole(
            user
        );


    if (
        role === "staff"
    ) {

        return getIdValue(
            user.assignedSubstation
        );

    }


    if (
        role === "admin" &&
        filter.substation
    ) {

        return getIdValue(
            filter.substation
        );

    }


    return null;

}


// ==========================================================
// GET EFFECTIVE BUSINESS TYPE
// ==========================================================

async function getEffectiveBusinessType(
    filter = {},
    user = {}
) {

    const substationId =
        getEffectiveSubstationId(
            filter,
            user
        );


    if (
        !substationId
    ) {

        return null;

    }


    if (
        !mongoose.Types.ObjectId.isValid(
            substationId
        )
    ) {

        return null;

    }


    const substation =
        await Substation.findOne({

            _id:
                substationId,

            isActive:
                true

        })
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
            String(
                substation.businessType.id
            ),

        name:
            substation.businessType.name || ""

    };

}


// ==========================================================
// GET SUBSTATION QUERY
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
        !substationId ||
        !mongoose.Types.ObjectId.isValid(
            substationId
        )
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
            !inventory ||
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
    filter = {},
    user = {}
) {

    const role =
        getUserRole(
            user
        );


    // ======================================================
    // EFFECTIVE SUBSTATION
    // ======================================================

    const effectiveSubstationId =
        getEffectiveSubstationId(
            filter,
            user
        );


    // ======================================================
    // DETERMINE WHETHER THIS REQUEST IS RESTRICTED
    // ======================================================

    const isStaff =
        role === "staff";

    const isAdminWithSubstation =
        role === "admin" &&
        Boolean(
            effectiveSubstationId
        );

    const isBusinessTypeRestricted =
        isStaff ||
        isAdminWithSubstation;


    // ======================================================
    // EFFECTIVE BUSINESS TYPE
    // ======================================================

    const businessType =
        await getEffectiveBusinessType(
            filter,
            user
        );


    // ======================================================
    // LOAD ACTIVE CATEGORIES
    // ======================================================
    //
    // ADMIN WITHOUT SUBSTATION:
    //
    //     All active categories.
    //
    // STAFF / ADMIN WITH SUBSTATION:
    //
    //     Only categories belonging to the
    //     effective substation business type.
    //
    // ======================================================

    let categories;


    if (
        businessType
    ) {

        categories =
            await Category.find({

                isActive:
                    true,

                "businessType.id":
                    businessType.id

            })
            .select(
                "_id name categoryIcon isActive businessType"
            )
            .lean();

    } else if (
        isBusinessTypeRestricted
    ) {

        // --------------------------------------------------
        // A restricted user MUST NOT fall back to the
        // global product list when the business type cannot
        // be resolved.
        // --------------------------------------------------

        return [];

    } else {

        categories =
            await Category.find({

                isActive:
                    true

            })
            .select(
                "_id name categoryIcon isActive businessType"
            )
            .lean();

    }


    // ======================================================
    // CATEGORY IDS
    // ======================================================

    const categoryIds =
        categories.map(
            category =>
                category._id
        );


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
    // Product.category
    //      ↓
    // Category._id
    //
    // Only categories belonging to the effective
    // business type are allowed.
    //
    // ======================================================

    if (
        isBusinessTypeRestricted
    ) {

        productQuery.category = {

            $in:
                categoryIds

        };

    }


    // ======================================================
    // CATEGORY FILTER
    // ======================================================

    if (
        filter.category
    ) {

        const selectedCategoryId =
            getIdValue(
                filter.category
            );


        if (
            !isBusinessTypeRestricted
        ) {

            productQuery.category =
                filter.category;

        } else {

            const selectedCategoryBelongs =
                categories.some(

                    category =>

                        String(
                            category._id
                        ) ===
                        selectedCategoryId

                );


            if (
                selectedCategoryBelongs
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


                const category =
                    product.category

                        ? categoryById.get(
                            String(
                                product.category
                            )
                        ) || null

                        : null;


                // ==========================================
                // MARKET AVAILABLE
                // ==========================================

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
// EXPORT
// ==========================================================

module.exports = {

    getProductAnalytics

};