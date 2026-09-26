// ==========================================================
// verrah/controllers/categoryController.js
//
// CATEGORY CONTROLLER
// ==========================================================

const categoryService =
    require("../services/categoryService");


// ==========================================================
// ADMIN CHECK
// ==========================================================

function getIsAdmin(req) {

    return (
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

        const products =
            await categoryService.getCategoryProducts(
                req.params.id
            );

        return res.render(
            "products/category/products",
            {
                category,
                products,
                user:
                    req.user
            }
        );

    } catch (error) {

        console.error(
            "Category products error:",
            error
        );

        return res.status(500).render(
            "error",
            {
                message:
                    error.message ||
                    "Unable to load category products."
            }
        );

    }

};


// ==========================================================
// EXPORTS
// ==========================================================