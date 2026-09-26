// ==========================================================
// verrah/services/categoryService.js
//
// CATEGORY SERVICE
// ==========================================================

const mongoose =
    require("mongoose");

const Category =
    require("../models/category");

const Product =
    require("../models/products");

const Substation =
    require("../models/substations");


// ==========================================================
// HELPERS
// ==========================================================

function text(value) {

    return String(value || "").trim();

}


// ==========================================================
// BUSINESS TYPES
// ==========================================================

async function getBusinessTypes() {

    const substations =
        await Substation.find({
            isActive: true,
            "businessType.id": {
                $ne: null
            }
        })
        .select("businessType")
        .lean();

    const map =
        new Map();

    for (const substation of substations) {

        const businessType =
            substation.businessType || {};

        const id =
            businessType.id;

        const name =
            text(businessType.name);

        if (!id) {
            continue;
        }

        const key =
            String(id);

        if (!map.has(key)) {

            map.set(
                key,
                {
                    _id: id,
                    name
                }
            );

        }

    }

    return Array
        .from(map.values())
        .sort(
            (a, b) =>
                String(a.name)
                    .localeCompare(
                        String(b.name)
                    )
        );

}


// ==========================================================
// GET BUSINESS TYPE BY ID
// ==========================================================

async function getBusinessTypeById(
    businessTypeId
) {

    const id =
        text(businessTypeId);

    if (!id) {

        throw new Error(
            "Business type is required."
        );

    }

    if (
        !mongoose.Types.ObjectId.isValid(id)
    ) {

        throw new Error(
            "Invalid business type."
        );

    }

    const substation =
        await Substation.findOne({
            isActive: true,
            "businessType.id": id
        })
        .select("businessType")
        .lean();

    if (
        !substation ||
        !substation.businessType ||
        !substation.businessType.id
    ) {

        throw new Error(
            "Selected business type is not available."
        );

    }

    return {
        id:
            substation.businessType.id,

        name:
            text(
                substation.businessType.name
            )
    };

}


// ==========================================================
// CREATE CATEGORY
// ==========================================================

async function createCategory(
    body = {},
    file = null
) {

    const name =
        text(body.name);

    if (!name) {

        throw new Error(
            "Category name is required."
        );

    }

    const businessType =
        await getBusinessTypeById(
            body.businessTypeId
        );


    // ------------------------------------------------------
    // IMAGE
    // ------------------------------------------------------

    let categoryIcon =
        text(body.categoryIconUrl);

    if (file) {

        categoryIcon =
            file.path ||
            file.secure_url ||
            file.url ||
            "";

    }

    if (!categoryIcon) {

        throw new Error(
            "Category image is required."
        );

    }


    // ------------------------------------------------------
    // DUPLICATE CATEGORY
    // ------------------------------------------------------

    const existing =
        await Category.findOne({
            name: name.toLowerCase()
        });

    if (existing) {

        throw new Error(
            "A category with this name already exists."
        );

    }


    // ------------------------------------------------------
    // CREATE
    // ------------------------------------------------------

    return Category.create({

        name:
            name.toLowerCase(),

        businessType: {
            id:
                businessType.id,

            name:
                businessType.name
        },

        categoryIcon,

        description:
            text(body.description),

        isActive: true

    });

}


// ==========================================================
// GET CATEGORY BY ID
// ==========================================================

async function getCategoryById(id) {

    if (
        !id ||
        !mongoose.Types.ObjectId.isValid(id)
    ) {

        return null;

    }

    return Category.findById(id);

}


// ==========================================================
// UPDATE CATEGORY
// ==========================================================

async function updateCategory(
    id,
    body = {},
    file = null
) {

    if (
        !id ||
        !mongoose.Types.ObjectId.isValid(id)
    ) {

        throw new Error(
            "Invalid category ID."
        );

    }

    const category =
        await Category.findById(id);

    if (!category) {

        throw new Error(
            "Category not found."
        );

    }


    const name =
        text(body.name);

    if (!name) {

        throw new Error(
            "Category name is required."
        );

    }


    const businessType =
        await getBusinessTypeById(
            body.businessTypeId
        );


    // ------------------------------------------------------
    // DUPLICATE CATEGORY
    // ------------------------------------------------------

    const existing =
        await Category.findOne({
            name: name.toLowerCase(),
            _id: {
                $ne: category._id
            }
        });

    if (existing) {

        throw new Error(
            "A category with this name already exists."
        );

    }


    // ------------------------------------------------------
    // UPDATE BASIC DETAILS
    // ------------------------------------------------------

    category.name =
        name.toLowerCase();

    category.businessType = {
        id:
            businessType.id,

        name:
            businessType.name
    };

    category.description =
        text(body.description);


    // ------------------------------------------------------
    // IMAGE
    // ------------------------------------------------------

    if (file) {

        category.categoryIcon =
            file.path ||
            file.secure_url ||
            file.url ||
            category.categoryIcon;

    } else if (
        text(body.categoryIconUrl)
    ) {

        category.categoryIcon =
            text(body.categoryIconUrl);

    }


    if (!category.categoryIcon) {

        throw new Error(
            "Category image is required."
        );

    }


    await category.save();

    return category;

}


// ==========================================================
// GET CATEGORY
// ==========================================================

async function getCategory(
    query = {}
) {

    return Category.findOne(query);

}


// ==========================================================
// GET CATEGORY PRODUCTS
// ==========================================================

async function getCategoryProducts(
    categoryId
) {

    if (
        !categoryId ||
        !mongoose.Types.ObjectId.isValid(
            categoryId
        )
    ) {

        return [];

    }

    return Product.find({
        category: categoryId
    });

}


// ==========================================================
// GET CATEGORIES
// ==========================================================

async function getCategories(
    query = {}
) {

    return Category.find(query)
        .sort({
            name: 1
        });

}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    getBusinessTypes,

    getBusinessTypeById,

    createCategory,

    getCategoryById,

    updateCategory,

    getCategory,

    getCategoryProducts,

    getCategories

};