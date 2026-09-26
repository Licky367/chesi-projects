// ==========================================================
// verrah/controllers/categoryController.js
//
// CATEGORY CONTROLLER
// ==========================================================

const categoryService =
    require("../services/categoryService");

const stockService =
    require("../services/stockService");


// ==========================================================
// ADMIN CHECK
// ==========================================================

function getIsAdmin(req) {

    return !!(
        req.user &&
        req.user.role === "admin"
    );

}


// ==========================================================
// ADD CATEGORY FORM
// ==========================================================

exports.addForm = async (req, res) => {

    try {

        if (!getIsAdmin(req)) {
            return res.redirect("/");
        }

        const businessTypes =
            await categoryService.getBusinessTypes();

        return res.render(
            "products/category/add",
            {
                category: null,

                formData: {
                    name: "",
                    description: "",
                    categoryIconUrl: "",
                    businessTypeId: ""
                },

                businessTypes
            }
        );

    } catch (error) {

        console.error(
            "Category add form error:",
            error
        );

        return res.status(500).render(
            "error",
            {
                message:
                    error.message ||
                    "Unable to load category form."
            }
        );

    }

};


// ==========================================================
// CREATE CATEGORY
// ==========================================================

exports.create = async (req, res) => {

    try {

        if (!getIsAdmin(req)) {
            return res.redirect("/");
        }

        const category =
            await categoryService.createCategory(
                req.body,
                req.file
            );

        return res.redirect(
            `/products/category/${category._id}`
        );

    } catch (error) {

        console.error(
            "Create category error:",
            error
        );

        let businessTypes = [];

        try {

            businessTypes =
                await categoryService.getBusinessTypes();

        } catch (businessTypeError) {

            console.error(
                "Business type loading error:",
                businessTypeError
            );

        }

        return res.status(400).render(
            "products/category/add",
            {
                category: null,

                formData: {
                    name:
                        req.body?.name || "",

                    description:
                        req.body?.description || "",

                    categoryIconUrl:
                        req.body?.categoryIconUrl || "",

                    businessTypeId:
                        req.body?.businessTypeId || ""
                },

                businessTypes,

                error:
                    error.message ||
                    "Unable to create category."
            }
        );

    }

};


// ==========================================================
// EDIT CATEGORY FORM
// ==========================================================

exports.editForm = async (req, res) => {

    try {

        if (!getIsAdmin(req)) {
            return res.redirect("/");
        }

        const category =
            await categoryService.getCategoryById(
                req.params.id
            );

        if (!category) {

            return res.status(404).render(
                "error",
                {
                    message:
                        "Category not found."
                }
            );

        }

        const businessTypes =
            await categoryService.getBusinessTypes();

        return res.render(
            "products/category/add",
            {
                category,

                formData: {
                    name:
                        category.name || "",

                    description:
                        category.description || "",

                    categoryIconUrl:
                        "",

                    businessTypeId:
                        category.businessType?.id
                            ? String(
                                category.businessType.id
                            )
                            : ""
                },

                businessTypes
            }
        );

    } catch (error) {

        console.error(
            "Category edit form error:",
            error
        );

        return res.status(500).render(
            "error",
            {
                message:
                    error.message ||
                    "Unable to load category."
            }
        );

    }

};


// ==========================================================
// UPDATE CATEGORY
// ==========================================================

exports.update = async (req, res) => {

    try {

        if (!getIsAdmin(req)) {
            return res.redirect("/");
        }

        const category =
            await categoryService.updateCategory(
                req.params.id,
                req.body,
                req.file
            );

        return res.redirect(
            `/products/category/${category._id}`
        );

    } catch (error) {

        console.error(
            "Update category error:",
            error
        );

        let category = null;
        let businessTypes = [];

        try {

            category =
                await categoryService.getCategoryById(
                    req.params.id
                );

        } catch (categoryError) {

            console.error(
                "Category reload error:",
                categoryError
            );

        }

        try {

            businessTypes =
                await categoryService.getBusinessTypes();

        } catch (businessTypeError) {

            console.error(
                "Business type loading error:",
                businessTypeError
            );

        }

        return res.status(400).render(
            "products/category/add",
            {
                category,

                formData: {
                    name:
                        req.body?.name ||
                        category?.name ||
                        "",

                    description:
                        req.body?.description ||
                        category?.description ||
                        "",

                    categoryIconUrl:
                        req.body?.categoryIconUrl ||
                        "",

                    businessTypeId:
                        req.body?.businessTypeId ||
                        (
                            category?.businessType?.id
                                ? String(
                                    category.businessType.id
                                )
                                : ""
                        )
                },

                businessTypes,

                error:
                    error.message ||
                    "Unable to update category."
            }
        );

    }

};


// ==========================================================
// CATEGORY PRODUCTS
//
// GET /products/category/:id
// ==========================================================

exports.products = async (
    req,
    res
) => {

    try {

        // ======================================================
        // GET CATEGORY
        // ======================================================

        const category =
            await categoryService.getCategoryById(
                req.params.id
            );


        // ======================================================
        // CATEGORY NOT FOUND
        // ======================================================

        if (!category) {

            return res.status(404).render(
                "error",
                {
                    message:
                        "Category not found."
                }
            );

        }


        // ======================================================
        // GET PRODUCTS
        // ======================================================

        const products =
            await categoryService.getCategoryProducts(
                req.params.id
            );


        // ======================================================
        // ADMIN STATUS
        // ======================================================

        const isAdmin =
            getIsAdmin(req);


        // ======================================================
        // RENDER CATEGORY PRODUCTS
        // ======================================================

        return res.render(
            "products/category",
            {
                category,

                products:
                    Array.isArray(products)
                        ? products
                        : [],

                isAdmin,

                error: null
            }
        );

    } catch (error) {

        console.error(
            "Category products error:",
            error
        );


        return res.status(500).render(
            "products/category",
            {
                category: null,

                products: [],

                isAdmin:
                    getIsAdmin(req),

                error:
                    error.message ||
                    "Unable to load category products."
            }
        );

    }

};


// ==========================================================
// ADD SUBCATEGORY
//
// POST /products/category/:id/subcategory
// ==========================================================

exports.addSubcategory = async (
    req,
    res
) => {

    try {

        // ------------------------------------------------------
        // ADMIN ONLY
        // ------------------------------------------------------

        if (!getIsAdmin(req)) {
            return res.redirect("/");
        }


        // ------------------------------------------------------
        // CATEGORY ID
        // ------------------------------------------------------

        const categoryId =
            String(
                req.params.id || ""
            ).trim();


        // ------------------------------------------------------
        // SUBCATEGORY
        // ------------------------------------------------------

        const subcategory =
            String(
                req.body?.subcategory || ""
            ).trim();


        // ------------------------------------------------------
        // ADD SUBCATEGORY
        // ------------------------------------------------------

        await stockService.addSubcategory(
            categoryId,
            subcategory
        );


        // ------------------------------------------------------
        // RETURN TO CATEGORY SUBCATEGORIES
        // ------------------------------------------------------

        return res.redirect(
            `/products/category/${categoryId}/categories`
        );

    } catch (error) {

        console.error(
            "Add subcategory error:",
            error
        );


        // ------------------------------------------------------
        // RELOAD CATEGORY
        // ------------------------------------------------------

        let category = null;

        try {

            category =
                await stockService.getCategory(
                    req.params.id
                );

        } catch (categoryError) {

            console.error(
                "Category reload error:",
                categoryError
            );

        }


        return res.status(400).render(
            "products/category-subcategories",
            {
                title:
                    category
                        ? `${category.name} Subcategories`
                        : "Category Subcategories",

                category,

                subcategories:
                    Array.isArray(
                        category?.subcategory
                    )
                        ? category.subcategory
                        : [],

                error:
                    error.message ||
                    "Unable to add subcategory.",

                saved: "",

                old: {
                    subcategory:
                        req.body?.subcategory || ""
                }
            }
        );

    }

};


// ==========================================================
// CATEGORY SUBCATEGORIES
//
// GET /products/category/:id/categories
//
// Displays the selected category and ALL of its
// subcategories.
// ==========================================================

exports.subcategories = async (
    req,
    res
) => {

    try {

        // ------------------------------------------------------
        // ADMIN ONLY
        // ------------------------------------------------------

        if (!getIsAdmin(req)) {
            return res.redirect("/");
        }


        // ------------------------------------------------------
        // GET CATEGORY
        // ------------------------------------------------------

        const category =
            await stockService.getCategory(
                req.params.id
            );


        // ------------------------------------------------------
        // GET SUBCATEGORIES
        // ------------------------------------------------------

        const subcategories =
            Array.isArray(
                category.subcategory
            )
                ? category.subcategory
                : [];


        // ------------------------------------------------------
        // RENDER
        // ------------------------------------------------------

        return res.render(
            "products/category-subcategories",
            {
                title:
                    `${category.name} Subcategories`,

                category,

                subcategories,

                error: null,

                saved: "",

                old: {}
            }
        );

    } catch (error) {

        console.error(
            "Category subcategories error:",
            error
        );


        return res.status(
            error.message ===
            "The selected category was not found or is inactive."
                ? 404
                : 500
        ).render(
            "products/category-subcategories",
            {
                title:
                    "Category Subcategories",

                category: null,

                subcategories: [],

                error:
                    error.message ||
                    "Unable to load category subcategories.",

                saved: "",

                old: {}
            }
        );

    }

};


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    addForm,

    create,

    editForm,

    update,

    products,

    addSubcategory,

    subcategories

};