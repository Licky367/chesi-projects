// ==========================================================
// verrah/services/products/list.js
// PRODUCT LIST SERVICE
// ==========================================================

const Product =
    require("../../models/products");


const {
    chunk,
    prepareProduct
} =
    require("./helpers");


// ==========================================================
// GET PRODUCTS BY CATEGORY
// ==========================================================
//
// Product.category
//       ↓
// Category._id
//       ↓
// Category.name
//
// Frontend receives categoryName, never the ObjectId.
//
// ==========================================================

async function getProductsByCategory() {

    const products =
        await Product.aggregate([

            // =================================================
            // ACTIVE PRODUCTS ONLY
            // =================================================

            {
                $match: {
                    isActive: true
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
            // GET SINGLE CATEGORY
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
            // SORT
            // =================================================

            {
                $sort: {

                    "categoryData.name": 1,

                    subcategory: 1,

                    name: 1,

                    createdAt: 1

                }
            }

        ]);


    // ========================================================
    // GROUP PRODUCTS BY CATEGORY NAME
    // ========================================================

    const categoryMap =
        new Map();


    for (const product of products) {

        const categoryName =

            product.categoryData &&

            typeof product.categoryData.name === "string" &&

            product.categoryData.name.trim()

                ? product.categoryData.name.trim()

                : "Other";


        // ====================================================
        // PREPARE PRODUCT
        // ====================================================

        const preparedProduct =
            prepareProduct(
                product,
                categoryName
            );


        // ====================================================
        // CREATE CATEGORY GROUP
        // ====================================================

        if (!categoryMap.has(categoryName)) {

            categoryMap.set(
                categoryName,
                {

                    label:
                        categoryName,

                    categoryName,

                    products: []

                }
            );

        }


        // ====================================================
        // ADD PRODUCT
        // ====================================================

        categoryMap
            .get(categoryName)
            .products
            .push(preparedProduct);

    }


    // ========================================================
    // CREATE FRONTEND STRUCTURE
    // ========================================================

    return Array.from(
        categoryMap.values()
    )
        .map((group) => {

            return {

                label:
                    group.label,

                categoryName:
                    group.categoryName,

                rows:
                    chunk(
                        group.products,
                        6
                    )

            };

        });

}


// ==========================================================
// EXPORT
// ==========================================================

module.exports = {

    getProductsByCategory

};