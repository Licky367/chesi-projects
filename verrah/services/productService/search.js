// ==========================================================
// verrah/services/products/search.js
// PRODUCT SEARCH SERVICE
// ==========================================================
//
// PURPOSE:
// ----------------------------------------------------------
// Search products using text entered by the user.
//
// The search checks:
//
//     Product.name
//     Category.name
//
// The search is intentionally flexible so that a user can
// enter:
//
//     • part of a product name
//     • part of a category
//     • a word resembling a product name
//     • a word resembling a category
//
// Example:
//
//     "lip"       → Lip Gloss, Lip Balm, Lipstick...
//     "hair"      → Hair products / Hair Care category...
//     "serum"     → Serum products...
//
// The frontend never receives the Category ObjectId.
// ==========================================================

const mongoose =
    require("mongoose");


const Product =
    require("../../models/products");


const {
    prepareProduct
} =
    require("./helpers");


// ==========================================================
// ESCAPE REGEX
// ==========================================================
//
// Prevent user-entered characters from being interpreted as
// unintended regular-expression commands.
//
// ==========================================================

function escapeRegex(value) {

    return value.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );

}


// ==========================================================
// SEARCH PRODUCTS
// ==========================================================
//
// Accepts a search term and searches:
//
//     Product.name
//     Category.name
//
// ==========================================================

async function searchProducts(searchTerm) {

    // ========================================================
    // NORMALIZE SEARCH TERM
    // ========================================================

    const term =
        String(
            searchTerm || ""
        )
            .trim();


    // ========================================================
    // EMPTY SEARCH
    // ========================================================

    if (!term) {

        return [];

    }


    // ========================================================
    // CREATE FLEXIBLE SEARCH REGEX
    // ========================================================

    const regex =
        new RegExp(
            escapeRegex(term),
            "i"
        );


    // ========================================================
    // SEARCH PRODUCTS
    // ========================================================
    //
    // First resolve the category, then search both:
    //
    //     Product.name
    //     Category.name
    //
    // ========================================================

    const products =
        await Product.aggregate([

            // =================================================
            // ACTIVE PRODUCTS ONLY
            // =================================================

            {
                $match: {

                    isActive:
                        true

                }
            },


            // =================================================
            // RESOLVE CATEGORY
            // =================================================

            {
                $lookup: {

                    from:
                        "categories",

                    localField:
                        "category",

                    foreignField:
                        "_id",

                    as:
                        "categoryData"

                }
            },


            // =================================================
            // CATEGORY OBJECT
            // =================================================

            {
                $unwind: {

                    path:
                        "$categoryData",

                    preserveNullAndEmptyArrays:
                        true

                }
            },


            // =================================================
            // SEARCH NAME OR CATEGORY
            // =================================================

            {
                $match: {

                    $or: [

                        {
                            name:
                                regex
                        },

                        {
                            "categoryData.name":
                                regex
                        }

                    ]

                }

            },


            // =================================================
            // SORT
            // =================================================
            //
            // Product-name matches naturally appear first,
            // followed by category matches.
            //
            // =================================================

            {
                $addFields: {

                    searchPriority: {

                        $cond: [

                            {
                                $regexMatch: {

                                    input:
                                        "$name",

                                    regex:
                                        regex

                                }
                            },

                            0,

                            1

                        ]

                    }

                }

            },


            {
                $sort: {

                    searchPriority:
                        1,

                    name:
                        1,

                    createdAt:
                        1

                }

            }

        ]);


    // ========================================================
    // PREPARE RESULTS FOR FRONTEND
    // ========================================================

    return products.map(
        (product) => {

            const categoryName =

                product.categoryData &&

                typeof product.categoryData.name === "string" &&

                product.categoryData.name.trim()

                    ? product.categoryData.name.trim()

                    : "Other";


            const preparedProduct =
                prepareProduct(
                    product,
                    categoryName
                );


            // -----------------------------------------------
            // Backend-only field
            // -----------------------------------------------

            delete preparedProduct.categoryData;


            delete preparedProduct.searchPriority;


            return preparedProduct;

        }
    );

}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    searchProducts

};