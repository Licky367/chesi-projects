// ==========================================================
// verrah/services/stockService/category.js
// CATEGORY HELPERS
// ==========================================================

const mongoose = require("mongoose");

const Category =
    require("../../models/category");

const { text } =
    require("./helpers");


// ==========================================================
// GET CATEGORY
// ==========================================================

async function getCategory(
    value,
    session = null
) {

    const raw =
        text(value);

    if (!raw) {

        throw new Error(
            "Select a valid stock category."
        );

    }


    let category;


    // ------------------------------------------------------
    // FIND BY OBJECT ID
    // ------------------------------------------------------

    if (
        mongoose.isValidObjectId(raw)
    ) {

        const query =
            Category
                .findOne({
                    _id: raw,
                    isActive: true
                })
                .select(
                    "_id name subcategory categoryIcon isActive"
                );


        if (session) {

            query.session(session);

        }


        category =
            await query.lean();

    }


    // ------------------------------------------------------
    // FIND BY NAME
    // ------------------------------------------------------

    else {

        const query =
            Category
                .findOne({
                    name: raw.toLowerCase(),
                    isActive: true
                })
                .select(
                    "_id name subcategory categoryIcon isActive"
                );


        if (session) {

            query.session(session);

        }


        category =
            await query.lean();

    }


    // ------------------------------------------------------
    // VALIDATE RESULT
    // ------------------------------------------------------

    if (!category) {

        throw new Error(
            "The selected category was not found or is inactive."
        );

    }


    const categoryName =
        text(category.name)
            .toLowerCase();


    if (!categoryName) {

        throw new Error(
            "The selected category has no valid name."
        );

    }


    // ------------------------------------------------------
    // ALWAYS RETURN SUBCATEGORY AS AN ARRAY
    // ------------------------------------------------------

    if (
        !Array.isArray(
            category.subcategory
        )
    ) {

        category.subcategory = [];

    }


    category.subcategory =
        category.subcategory
            .map(item => text(item))
            .filter(Boolean);


    return category;
}


// ==========================================================
// VALIDATE CATEGORY
// ==========================================================

async function validateCategory(
    value,
    session = null
) {

    const category =
        await getCategory(
            value,
            session
        );


    return text(
        category.name
    ).toLowerCase();
}


// ==========================================================
// GET CATEGORY BY NAME
// ==========================================================

async function getCategoryByName(
    name,
    session = null
) {

    const query =
        Category
            .findOne({
                name:
                    text(name)
                        .toLowerCase(),

                isActive: true
            })
            .select(
                "_id name subcategory categoryIcon isActive"
            );


    if (session) {

        query.session(session);

    }


    const category =
        await query.lean();


    if (
        category &&
        !Array.isArray(
            category.subcategory
        )
    ) {

        category.subcategory = [];

    }


    if (category) {

        category.subcategory =
            category.subcategory
                .map(item => text(item))
                .filter(Boolean);

    }


    return category;
}


// ==========================================================
// GET ALL CATEGORIES
// ==========================================================

async function getCategories() {

    const categories =
        await Category
            .find({
                isActive: true
            })
            .select(
                "_id name subcategory categoryIcon isActive"
            )
            .sort({
                name: 1
            })
            .lean();


    return categories.map(
        category => {

            if (
                !Array.isArray(
                    category.subcategory
                )
            ) {

                category.subcategory = [];

            }


            category.subcategory =
                category.subcategory
                    .map(item => text(item))
                    .filter(Boolean);


            return category;

        }
    );
}


// ==========================================================
// ADD SUBCATEGORY TO CATEGORY
// ==========================================================

async function addSubcategory(
    categoryValue,
    subcategoryValue,
    session = null
) {

    // ------------------------------------------------------
    // VALIDATE CATEGORY
    // ------------------------------------------------------

    const category =
        await getCategory(
            categoryValue,
            session
        );


    // ------------------------------------------------------
    // VALIDATE SUBCATEGORY
    // ------------------------------------------------------

    const subcategory =
        text(
            subcategoryValue
        );


    if (!subcategory) {

        throw new Error(
            "Enter a valid subcategory."
        );

    }


    // ------------------------------------------------------
    // PREVENT DUPLICATES
    //
    // Comparison is case-insensitive.
    // ------------------------------------------------------

    const exists =
        category.subcategory.some(
            item =>
                text(item)
                    .toLowerCase() ===
                subcategory.toLowerCase()
        );


    if (exists) {

        throw new Error(
            "This subcategory already exists in the selected category."
        );

    }


    // ------------------------------------------------------
    // ADD SUBCATEGORY
    // ------------------------------------------------------

    const query =
        Category.findOneAndUpdate(
            {
                _id: category._id,
                isActive: true
            },
            {
                $push: {
                    subcategory
                }
            },
            {
                new: true,
                runValidators: true
            }
        )
        .select(
            "_id name subcategory categoryIcon isActive"
        );


    if (session) {

        query.session(session);

    }


    const updatedCategory =
        await query.lean();


    // ------------------------------------------------------
    // VERIFY UPDATE
    // ------------------------------------------------------

    if (!updatedCategory) {

        throw new Error(
            "The category could not be updated."
        );

    }


    if (
        !Array.isArray(
            updatedCategory.subcategory
        )
    ) {

        updatedCategory.subcategory = [];

    }


    updatedCategory.subcategory =
        updatedCategory.subcategory
            .map(item => text(item))
            .filter(Boolean);


    return updatedCategory;
}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    getCategory,

    validateCategory,

    getCategoryByName,

    getCategories,

    addSubcategory

};