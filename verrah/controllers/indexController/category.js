// ==========================================================
// verrah/controllers/indexController/category.js
// CATEGORY CONTROLLER
// ==========================================================

const categoryService =
    require("../../services/indexService");


// ==========================================================
// GET CATEGORIES / HOME PAGE
// ==========================================================
//
// Used when the home page needs category cards.
//
// Passes:
// - categories
// - currentUser
// - title
// - error
//
// to:
// views/index.ejs
//
// ==========================================================

exports.list = async (req, res) => {

    try {

        const categories =
            await categoryService
                .getActiveCategories();


        return res.render(
            "index",
            {
                title:
                    "Verrah Cosmetics",

                categories,

                currentUser:
                    req.session?.user || null,

                error: null
            }
        );

    } catch (err) {

        console.error(
            "CATEGORY LIST ERROR:",
            err
        );


        return res
            .status(500)
            .render(
                "index",
                {
                    title:
                        "Verrah Cosmetics",

                    categories: [],

                    currentUser:
                        req.session?.user || null,

                    error:
                        "Unable to load categories."
                }
            );

    }

};


// ==========================================================
// GET SINGLE CATEGORY
// ==========================================================
//
// GET /products/category/:id
//
// ==========================================================

exports.details = async (req, res) => {

    try {

        const category =
            await categoryService
                .getCategoryById(
                    req.params.id
                );


        if (!category) {

            return res
                .status(404)
                .render(
                    "products/category-details",
                    {
                        title:
                            "Category not found | Verrah Cosmetics",

                        category: null,

                        error:
                            "Category not found."
                    }
                );

        }


        return res.render(
            "products/category-details",
            {
                title:
                    `${category.name} | Verrah Cosmetics`,

                category,

                error: null
            }
        );

    } catch (err) {

        console.error(
            "CATEGORY DETAILS ERROR:",
            err
        );


        return res
            .status(404)
            .render(
                "products/category-details",
                {
                    title:
                        "Category | Verrah Cosmetics",

                    category: null,

                    error:
                        "Category not found."
                }
            );

    }

};


// ==========================================================
// ADD CATEGORY PAGE
// ==========================================================
//
// GET /products/category/add
//
// ==========================================================

exports.addPage = async (req, res) => {

    return res.render(
        "products/category-add",
        {
            title:
                "Add Category | Verrah Cosmetics",

            error: null,

            success: null
        }
    );

};


// ==========================================================
// CREATE CATEGORY
// ==========================================================
//
// POST /products/category/add
//
// ==========================================================

exports.create = async (req, res) => {

    try {

        await categoryService.createCategory(
            req.body
        );


        return res.redirect(
            "/"
        );

    } catch (err) {

        console.error(
            "CREATE CATEGORY ERROR:",
            err
        );


        return res
            .status(400)
            .render(
                "products/category-add",
                {
                    title:
                        "Add Category | Verrah Cosmetics",

                    error:
                        err.message ||
                        "Unable to create category.",

                    success: null
                }
            );

    }

};