// ==========================================================
// services/productService.js
// PRODUCT SERVICE
// VERRAH COSMETICS
// ==========================================================

const Product = require("../models/products");
const Stock = require("../models/stock");


// ==========================================================
// CHUNK PRODUCTS
// ==========================================================
//
// Used to create rows of six products.
//
// Example:
//
// 14 products
//
// Row 1 = 6
// Row 2 = 6
// Row 3 = 2
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


    const items = Array.isArray(directions.items)

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
// PREPARE PRODUCT FOR FRONTEND
// ==========================================================
//
// This function deliberately removes the need for the
// frontend to understand Category._id.
//
// Internally:
//
//     product.category
//
// may be:
//
//     {
//         _id: "...",
//         name: "Skin Care"
//     }
//
// But the frontend receives:
//
//     categoryName: "Skin Care"
//     label: "Skin Care"
//
// The category ObjectId is not needed by the listing view.
//
// ==========================================================

function prepareProduct(product) {

    if (!product) {
        return null;
    }


    const prepared = {
        ...product
    };


    // ------------------------------------------------------
    // RESOLVE CATEGORY NAME
    // ------------------------------------------------------

    if (
        prepared.category &&
        typeof prepared.category === "object"
    ) {

        prepared.categoryName =
            String(
                prepared.category.name || "Other"
            ).trim() || "Other";

    } else {

        prepared.categoryName = "Other";

    }


    // ------------------------------------------------------
    // REMOVE CATEGORY OBJECT FROM FRONTEND DATA
    // ------------------------------------------------------
    //
    // The products listing does not need the Category
    // ObjectId at all.
    //
    // ------------------------------------------------------

    delete prepared.category;


    return prepared;
}


// ==========================================================
// GET PRODUCTS BY CATEGORY
// ==========================================================
//
// Returns:
//
// [
//     {
//         label: "Skin Care",
//         categoryName: "Skin Care",
//         rows: [
//             {
//                 products: [ ...6 products... ]
//             },
//             {
//                 products: [ ...6 products... ]
//             }
//         ]
//     }
// ]
//
// IMPORTANT:
//
// No category ObjectId is exposed to the frontend.
//
// ==========================================================

async function getProductsByCategory() {

    const products = await Product.find({
        isActive: true
    })

        // --------------------------------------------------
        // RESOLVE CATEGORY ID -> CATEGORY NAME
        // --------------------------------------------------

        .populate({
            path: "category",
            select: "name"
        })

        // --------------------------------------------------
        // SORT
        // --------------------------------------------------

        .sort({
            category: 1,
            name: 1,
            createdAt: 1
        })

        .lean();


    // ======================================================
    // GROUP PRODUCTS BY CATEGORY NAME
    // ======================================================

    const categoryMap = new Map();


    for (const rawProduct of products) {

        const product = prepareProduct(
            rawProduct
        );


        if (!product) {
            continue;
        }


        // --------------------------------------------------
        // CATEGORY NAME
        // --------------------------------------------------
        //
        // This comes from Category.name.
        //
        // We never convert the ObjectId into a label.
        //
        // --------------------------------------------------

        const categoryName =
            product.categoryName ||
            "Other";


        // --------------------------------------------------
        // CREATE CATEGORY GROUP
        // --------------------------------------------------

        if (!categoryMap.has(categoryName)) {

            categoryMap.set(
                categoryName,
                {
                    categoryName,
                    label: categoryName,
                    products: []
                }
            );

        }


        // --------------------------------------------------
        // ADD PRODUCT TO CATEGORY
        // --------------------------------------------------

        const group =
            categoryMap.get(categoryName);

        group.products.push(product);

    }


    // ======================================================
    // BUILD FRONTEND GROUPS
    // ======================================================

    return Array.from(
        categoryMap.values()
    ).map((group) => {

        return {

            // Human-readable category name.
            label: group.label,

            // Explicit category name for any future
            // frontend component that prefers this field.
            categoryName: group.categoryName,

            // Six products per row.
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

    const product = await Product.findOne({
        _id: id,
        isActive: true
    })

        .populate({
            path: "category",
            select: "name"
        })

        .lean();


    if (!product) {
        return null;
    }


    // ======================================================
    // CATEGORY NAME
    // ======================================================

    if (
        product.category &&
        typeof product.category === "object"
    ) {

        product.categoryName =
            String(
                product.category.name || "Other"
            ).trim() || "Other";

    } else {

        product.categoryName = "Other";

    }


    // ======================================================
    // REMOVE CATEGORY OBJECT
    // ======================================================
    //
    // Product details can use:
    //
    //     product.categoryName
    //
    // instead of:
    //
    //     product.category._id
    //
    // ======================================================

    delete product.category;


    // ======================================================
    // DIRECTIONS OF USE
    // ======================================================

    const productDirections =
        normalizeDirections(
            product.directionsOfUse
        );


    // ======================================================
    // FALLBACK TO STOCK DIRECTIONS
    // ======================================================
    //
    // Older Product documents may not have their own
    // directionsOfUse.
    //
    // In that case use the Stock directions.
    //
    // ======================================================

    if (
        !productDirections &&
        product.stock
    ) {

        const stock =
            await Stock.findById(
                product.stock
            )
                .select("directionsOfUse")
                .lean();


        product.directionsOfUse =
            normalizeDirections(
                stock?.directionsOfUse
            );

    } else {

        product.directionsOfUse =
            productDirections;

    }


    return product;
}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    getProductsByCategory,

    getProduct

};