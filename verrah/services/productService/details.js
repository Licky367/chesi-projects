// ==========================================================
// verrah/services/products/details.js
// PRODUCT DETAILS SERVICE
// ==========================================================

const mongoose =
    require("mongoose");


const Product =
    require("../../models/products");


const Stock =
    require("../../models/stock");


const {
    normalizeDirections,
    prepareProduct
} =
    require("./helpers");


// ==========================================================
// GET SINGLE PRODUCT
// ==========================================================
//
// Used by:
//
//     /products/:id
//
// ==========================================================

async function getProduct(id) {

    // ========================================================
    // VALIDATE ID
    // ========================================================

    if (
        !mongoose.Types.ObjectId.isValid(id)
    ) {

        return null;

    }


    // ========================================================
    // GET PRODUCT
    // ========================================================

    const results =
        await Product.aggregate([

            // =================================================
            // PRODUCT
            // =================================================

            {
                $match: {

                    _id:
                        new mongoose.Types.ObjectId(id),

                    isActive:
                        true

                }
            },


            // =================================================
            // CATEGORY
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
            // ONE PRODUCT
            // =================================================

            {
                $limit:
                    1
            }

        ]);


    // ========================================================
    // NOT FOUND
    // ========================================================

    if (!results.length) {

        return null;

    }


    const rawProduct =
        results[0];


    // ========================================================
    // CATEGORY NAME
    // ========================================================

    const categoryName =

        rawProduct.categoryData &&

        typeof rawProduct.categoryData.name === "string" &&

        rawProduct.categoryData.name.trim()

            ? rawProduct.categoryData.name.trim()

            : "Other";


    // ========================================================
    // PREPARE PRODUCT
    // ========================================================

    const product =
        prepareProduct(
            rawProduct,
            categoryName
        );


    // ========================================================
    // REMOVE BACKEND CATEGORY DATA
    // ========================================================

    delete product.categoryData;


    // ========================================================
    // DIRECTIONS OF USE
    // ========================================================

    const productDirections =
        normalizeDirections(
            product.directionsOfUse
        );


    // ========================================================
    // STOCK FALLBACK
    // ========================================================

    if (
        !productDirections &&

        product.stock &&

        mongoose.Types.ObjectId.isValid(
            product.stock
        )
    ) {

        const stock =
            await Stock.findById(
                product.stock
            )
                .select(
                    "directionsOfUse"
                )
                .lean();


        product.directionsOfUse =
            normalizeDirections(
                stock?.directionsOfUse
            );

    } else {

        product.directionsOfUse =
            productDirections;

    }


    // ========================================================
    // RETURN
    // ========================================================

    return product;

}


// ==========================================================
// EXPORT
// ==========================================================

module.exports = {

    getProduct

};