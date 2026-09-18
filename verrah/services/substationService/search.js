// ==========================================================
// verrah/services/substationService/search.js
// SUBSTATION PRODUCT SEARCH SERVICE
// ==========================================================

const mongoose =
    require("mongoose");

const Substation =
    require("../models/substations");

const Product =
    require("../models/products");

const Category =
    require("../models/category");


// ==========================================================
// SEARCH PRODUCTS WITHIN SUBSTATION
// ==========================================================
//
// Searches products allocated to a specific substation.
//
// Supported search fields:
//
//     Product name
//     Category name
//
// Example:
//
//     await substationService.search(
//         substationId,
//         "lotion"
//     );
//
// ==========================================================

exports.search = async (
    substationId,
    query
) => {

    // --------------------------------------------------------
    // VALIDATE SUBSTATION ID
    // --------------------------------------------------------

    if (
        !mongoose.isValidObjectId(
            substationId
        )
    ) {
        return [];
    }


    // --------------------------------------------------------
    // NORMALIZE SEARCH QUERY
    // --------------------------------------------------------

    const search =
        String(
            query ?? ""
        ).trim();


    // --------------------------------------------------------
    // EMPTY SEARCH
    // --------------------------------------------------------
    //
    // Do not perform a broad product search when
    // no search term was supplied.
    //
    // --------------------------------------------------------

    if (!search) {
        return [];
    }


    // --------------------------------------------------------
    // GET SUBSTATION INVENTORY
    // --------------------------------------------------------

    const substation =
        await Substation
            .findOne({
                _id:
                    substationId,

                isActive:
                    true
            })
            .select(
                "productInventory"
            )
            .lean();


    if (!substation) {
        return [];
    }


    // --------------------------------------------------------
    // PRODUCT IDS ALLOCATED TO SUBSTATION
    // --------------------------------------------------------

    const inventory =
        Array.isArray(
            substation.productInventory
        )
            ? substation.productInventory
            : [];


    const productIds =
        inventory
            .map(
                item =>
                    item.productId
            )
            .filter(
                Boolean
            );


    if (!productIds.length) {
        return [];
    }


    // --------------------------------------------------------
    // SEARCH PRODUCTS BY NAME
    // --------------------------------------------------------
    //
    // Category IDs are handled separately below because
    // Product.category may contain an ObjectId.
    //
    // --------------------------------------------------------

    const nameRegex =
        new RegExp(
            escapeRegex(search),
            "i"
        );


    const productsByName =
        await Product
            .find({
                _id: {
                    $in:
                        productIds
                },

                isActive:
                    true,

                name:
                    nameRegex
            })
            .sort({
                name:
                    1
            })
            .lean();


    // --------------------------------------------------------
    // FIND CATEGORIES MATCHING SEARCH
    // --------------------------------------------------------

    const categories =
        await Category
            .find({
                name:
                    nameRegex
            })
            .select(
                "_id name"
            )
            .lean();


    const categoryIds =
        categories.map(
            category =>
                category._id
        );


    // --------------------------------------------------------
    // SEARCH PRODUCTS BY CATEGORY
    // --------------------------------------------------------

    const productsByCategory =
        categoryIds.length
            ? await Product
                .find({
                    _id: {
                        $in:
                            productIds
                    },

                    isActive:
                        true,

                    category: {
                        $in:
                            categoryIds
                    }
                })
                .sort({
                    name:
                        1
                })
                .lean()
            : [];


    // --------------------------------------------------------
    // COMBINE RESULTS
    // --------------------------------------------------------
    //
    // A product can match both name and category.
    // Use a Map to prevent duplicates.
    //
    // --------------------------------------------------------

    const productMap =
        new Map();


    for (
        const product
        of [
            ...productsByName,
            ...productsByCategory
        ]
    ) {

        productMap.set(
            String(
                product._id
            ),

            product
        );
    }


    // --------------------------------------------------------
    // CATEGORY MAP
    // --------------------------------------------------------

    const categoryMap =
        new Map(
            categories.map(
                category => [
                    String(
                        category._id
                    ),

                    category.name
                ]
            )
        );


    // --------------------------------------------------------
    // PREPARE RESULTS
    // --------------------------------------------------------

    const results =
        Array.from(
            productMap.values()
        )
        .map(
            product => {

                const inventoryEntry =
                    inventory.find(
                        item =>
                            String(
                                item.productId
                            ) ===
                            String(
                                product._id
                            )
                    );


                const categoryId =
                    product.category;


                const categoryName =
                    categoryId &&
                    categoryMap.has(
                        String(
                            categoryId
                        )
                    )
                        ? categoryMap.get(
                            String(
                                categoryId
                            )
                        )
                        : "";


                return {

                    ...product,

                    // ------------------------------------------------
                    // CATEGORY NAME FOR VIEW
                    // ------------------------------------------------

                    category:
                        categoryName ||
                        (
                            typeof categoryId ===
                            "string"
                                ? categoryId
                                : ""
                        ),

                    // ------------------------------------------------
                    // SUBSTATION UNITS
                    // ------------------------------------------------

                    substationUnits:
                        Number(
                            inventoryEntry?.units ||
                            0
                        ),

                    // ------------------------------------------------
                    // SUBSTATION INVENTORY PRODUCT ID
                    // ------------------------------------------------

                    substationInventoryId:
                        inventoryEntry?.productId ||
                        product._id
                };
            }
        );


    // --------------------------------------------------------
    // FINAL SORT
    // --------------------------------------------------------

    results.sort(
        (a, b) =>
            String(
                a.name || ""
            ).localeCompare(
                String(
                    b.name || ""
                )
            )
    );


    return results;
};


// ==========================================================
// ESCAPE REGEX
// ==========================================================

function escapeRegex(
    value
) {

    return String(
        value
    ).replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );
}