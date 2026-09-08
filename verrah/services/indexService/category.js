// ==========================================================
// verrah/services/indexService/category.js
// CATEGORY SERVICE
// ==========================================================

const Category = require("../../models/category");


// ==========================================================
// GET ACTIVE CATEGORIES
// ==========================================================
//
// Used by the home category cards.
//
// Returns:
//
//     _id
//     name
//     categoryIcon
//     description
//
// ==========================================================

async function getActiveCategories() {

    const categories = await Category.find({
        isActive: true
    })
        .select(
            "_id name categoryIcon description"
        )
        .sort({
            name: 1
        })
        .lean();


    return categories;
}


// ==========================================================
// GET CATEGORY BY ID
// ==========================================================
//
// Used by:
//
//     /products/category/:id
//
// ==========================================================

async function getCategoryById(id) {

    const category =
        await Category.findOne({
            _id: id,
            isActive: true
        })
            .select(
                "_id name categoryIcon description"
            )
            .lean();


    return category || null;
}


// ==========================================================
// CREATE CATEGORY
// ==========================================================
//
// Used by the admin category creation page.
//
// ==========================================================

async function createCategory(data) {

    const name =
        String(
            data.name || ""
        ).trim().toLowerCase();


    const categoryIcon =
        String(
            data.categoryIcon || ""
        ).trim();


    const description =
        String(
            data.description || ""
        ).trim();


    if (!name) {

        throw new Error(
            "Category name is required."
        );

    }


    // ------------------------------------------------------
    // CHECK DUPLICATE
    // ------------------------------------------------------

    const existing =
        await Category.findOne({
            name
        });


    if (existing) {

        throw new Error(
            "A category with this name already exists."
        );

    }


    // ------------------------------------------------------
    // CREATE
    // ------------------------------------------------------

    const category =
        await Category.create({

            name,

            categoryIcon,

            description,

            isActive: true

        });


    return category;
}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    getActiveCategories,

    getCategoryById,

    createCategory

};