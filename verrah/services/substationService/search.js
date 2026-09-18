// ==========================================================
// verrah/services/substationService/search.js
// SUBSTATION PRODUCT SEARCH SERVICE
// ==========================================================

const mongoose =
    require("mongoose");

const Substation =
    require("../../models/substations");

const Product =
    require("../../models/products");

const Category =
    require("../../models/category");


// ==========================================================
// SEARCH PRODUCTS WITHIN SUBSTATION
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
    // SEARCH REGEX
    // --------------------------------------------------------

    const searchRegex =
        new RegExp(
            escapeRegex(search),
            "i"
        );


    // --------------------------------------------------------
    // SEARCH PRODUCTS BY NAME
    // --------------------------------------------------------

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
                    searchRegex
            })
            .sort({
                name:
                    1
            })
            .lean();


    // --------------------------------------------------------
    // FIND CATEGORIES MATCHING SEARCH
    // --------------------------------------------------------

    const matchingCategories =
        await Category
            .find({
                name:
                    searchRegex
            })
            .select(
                "_id name"
            )
            .lean();


    const matchingCategoryIds =
        matchingCategories.map(
            category =>
                category._id
        );


    // --------------------------------------------------------
    // SEARCH PRODUCTS BY CATEGORY
    // --------------------------------------------------------

    const productsByCategory =
        matchingCategoryIds.length
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
                            matchingCategoryIds
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
    // A product may match by both name and category.
    // Map prevents duplicate products.
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
    // NO RESULTS
    // --------------------------------------------------------

    if (!productMap.size) {
        return [];
    }


    // --------------------------------------------------------
    // GET CATEGORY IDS FROM RETURNED PRODUCTS
    // --------------------------------------------------------
    //
    // IMPORTANT:
    // Do NOT only use matchingCategoryIds here.
    //
    // A product can match the search by NAME while its
    // category does not match the search term.
    //
    // Therefore we must load the categories belonging to
    // every product that will actually reach the view.
    //
    // --------------------------------------------------------

    const returnedProducts =
        Array.from(
            productMap.values()
        );


    const returnedCategoryIds =
        returnedProducts
            .map(
                product =>
                    product.category
            )
            .filter(
                Boolean
            );


    // --------------------------------------------------------
    // GET CATEGORY NAMES FOR ALL RETURNED PRODUCTS
    // --------------------------------------------------------

    const categories =
        returnedCategoryIds.length
            ? await Category
                .find({
                    _id: {
                        $in:
                            returnedCategoryIds
                    }
                })
                .select(
                    "_id name"
                )
                .lean()
            : [];


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
        returnedProducts
            .map(
                product => {

                    // --------------------------------------------
                    // FIND SUBSTATION INVENTORY ENTRY
                    // --------------------------------------------

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


                    // --------------------------------------------
                    // PRODUCT CATEGORY
                    // --------------------------------------------

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
                            : (
                                typeof categoryId ===
                                "string"
                                    ? categoryId
                                    : ""
                            );


                    // --------------------------------------------
                    // RETURN PRODUCT
                    // --------------------------------------------

                    return {

                        ...product,


                        // ------------------------------------------------
                        // CATEGORY NAME
                        // ------------------------------------------------
                        //
                        // `category` now reaches the EJS view as the
                        // actual category name.
                        //
                        // Example:
                        //
                        // category: "Body Lotions"
                        //
                        // ------------------------------------------------

                        category:
                            categoryName,


                        // ------------------------------------------------
                        // EXPLICIT CATEGORY NAME
                        // ------------------------------------------------
                        //
                        // Also expose categoryName directly so the view
                        // can use either:
                        //
                        // product.category
                        //
                        // or:
                        //
                        // product.categoryName
                        //
                        // ------------------------------------------------

                        categoryName:
                            categoryName,


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


    // --------------------------------------------------------
    // RETURN
    // --------------------------------------------------------

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