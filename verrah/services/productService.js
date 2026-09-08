// ==========================================================
// verrah/services/productService.js
// PRODUCT SERVICE
// ==========================================================
//
// PRODUCT CATEGORY RELATION:
//
// Product.category
//       ↓
// Category._id
//       ↓
// Category.name
//
// IMPORTANT:
// ----------------------------------------------------------
// The database continues storing Category._id in Product.
//
// The frontend NEVER receives the category ObjectId.
//
// Frontend receives:
//
//     group.label
//
//     group.categoryName
//
// ==========================================================

const mongoose = require("mongoose");

const Product = require("../models/products");
const Stock = require("../models/stock");


// ==========================================================
// CHUNK PRODUCTS
// ==========================================================
//
// Maximum six products in one row.
//
// The EJS can flatten the rows when necessary.
// CSS controls the actual responsive presentation.
//
// ==========================================================

function chunk(items, size = 6) {

    const rows = [];

    for (
        let i = 0;
        i < items.length;
        i += size
    ) {

        rows.push({
            products: items.slice(i, i + size)
        });

    }

    return rows;
}


// ==========================================================
// NORMALIZE DIRECTIONS OF USE
// ==========================================================

function normalizeDirections(directions) {

    if (!directions) {
        return undefined;
    }


    const items = Array.isArray(
        directions.items
    )

        ? directions.items
            .map((item) => {

                return {
                    subtitle: String(
                        item?.subtitle || ""
                    ).trim(),

                    content: String(
                        item?.content || ""
                    ).trim()
                };

            })
            .filter((item) => {

                return (
                    item.subtitle &&
                    item.content
                );

            })

        : [];


    const title = String(
        directions.title || ""
    ).trim();


    if (
        !title &&
        items.length === 0
    ) {

        return undefined;

    }


    return {
        title,
        items
    };
}


// ==========================================================
// REMOVE CATEGORY DATABASE FIELD
// ==========================================================
//
// The frontend does not need Product.category.
//
// It receives categoryName separately.
//
// ==========================================================

function prepareProduct(product, categoryName) {

    const prepared = {
        ...product,

        categoryName:
            categoryName || "Other"
    };


    delete prepared.category;


    return prepared;
}


// ==========================================================
// GET PRODUCTS BY CATEGORY
// ==========================================================
//
// THIS IS THE MAIN PRODUCT LISTING SERVICE.
//
// The aggregation performs:
//
// Product
//    ↓
// $lookup
//    ↓
// Category
//    ↓
// Category.name
//
// Then the service groups products using the actual
// category name.
//
// ==========================================================

async function getProductsByCategory() {

    const products = await Product.aggregate([

        // ====================================================
        // ACTIVE PRODUCTS ONLY
        // ====================================================

        {
            $match: {
                isActive: true
            }
        },


        // ====================================================
        // RESOLVE CATEGORY
        // ====================================================
        //
        // Product.category = Category._id
        //
        // ====================================================

        {
            $lookup: {
                from: "categories",

                localField: "category",

                foreignField: "_id",

                as: "categoryData"
            }
        },


        // ====================================================
        // GET SINGLE CATEGORY
        // ====================================================

        {
            $unwind: {
                path: "$categoryData",

                preserveNullAndEmptyArrays: true
            }
        },


        // ====================================================
        // SORT
        // ====================================================

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
    // GROUP BY CATEGORY NAME
    // ========================================================

    const categoryMap = new Map();


    for (const product of products) {

        // ----------------------------------------------------
        // ACTUAL CATEGORY NAME
        // ----------------------------------------------------
        //
        // This is Category.name.
        //
        // NOT Category._id.
        //
        // ----------------------------------------------------

        const categoryName =
            product.categoryData &&
            typeof product.categoryData.name === "string" &&
            product.categoryData.name.trim()

                ? product.categoryData.name.trim()

                : "Other";


        // ----------------------------------------------------
        // PREPARE PRODUCT FOR FRONTEND
        // ----------------------------------------------------

        const preparedProduct =
            prepareProduct(
                product,
                categoryName
            );


        // ----------------------------------------------------
        // CREATE CATEGORY GROUP
        // ----------------------------------------------------

        if (!categoryMap.has(categoryName)) {

            categoryMap.set(
                categoryName,
                {
                    label: categoryName,

                    categoryName,

                    products: []
                }
            );

        }


        // ----------------------------------------------------
        // ADD PRODUCT
        // ----------------------------------------------------

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
    ).map((group) => {

        return {

            // ------------------------------------------------
            // HUMAN-READABLE CATEGORY NAME
            // ------------------------------------------------

            label: group.label,

            categoryName:
                group.categoryName,


            // ------------------------------------------------
            // PRODUCTS IN ROWS OF SIX
            // ------------------------------------------------

            rows: chunk(
                group.products,
                6
            )

        };

    });
}


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

            // ------------------------------------------------
            // PRODUCT
            // ------------------------------------------------

            {
                $match: {
                    _id:
                        new mongoose.Types.ObjectId(id),

                    isActive: true
                }
            },


            // ------------------------------------------------
            // CATEGORY
            // ------------------------------------------------

            {
                $lookup: {
                    from: "categories",

                    localField: "category",

                    foreignField: "_id",

                    as: "categoryData"
                }
            },


            // ------------------------------------------------
            // CATEGORY OBJECT
            // ------------------------------------------------

            {
                $unwind: {
                    path: "$categoryData",

                    preserveNullAndEmptyArrays: true
                }
            },


            // ------------------------------------------------
            // ONE PRODUCT
            // ------------------------------------------------

            {
                $limit: 1
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
    // REMOVE CATEGORY DATA
    // ========================================================
    //
    // categoryData contains the MongoDB category document.
    //
    // It is backend-only.
    //
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
// EXPORTS
// ==========================================================

module.exports = {

    getProductsByCategory,

    getProduct

};