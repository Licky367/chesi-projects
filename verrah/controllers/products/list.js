// ==========================================================
// controllers/products/list.js
// PRODUCT LIST CONTROLLER
// ==========================================================

const productService =
    require("../../services/productService");


// ==========================================================
// GET /products
// ==========================================================

exports.list = async (req, res) => {

    try {

        /*
         * STAFF USERS
         *
         * Staff are restricted to their assigned substation.
         *
         * Redirect:
         *
         *     /products
         *          ↓
         *     /branch/:assignedSubstation
         */

        if (
            req.user &&
            req.user.role === "staff" &&
            req.user.assignedSubstation
        ) {

            const assignedSubstation =
                typeof req.user.assignedSubstation === "object" &&
                req.user.assignedSubstation._id
                    ? req.user.assignedSubstation._id
                    : req.user.assignedSubstation;


            return res.redirect(
                `/branch/${assignedSubstation}`
            );

        }


        /*
         * NON-STAFF USERS
         *
         * Keep the existing global products page.
         */

        const categories =
            await productService.getProductsByCategory();


        return res.render(
            "products/products",
            {
                title:
                    "Products | Verrah Cosmetics",

                categories,

                error: null
            }
        );

    } catch (err) {

        console.error(
            "================================================"
        );

        console.error(
            "PRODUCT LIST ERROR"
        );

        console.error(
            "================================================"
        );

        console.error(err);


        return res
            .status(500)
            .render(
                "products/products",
                {
                    title:
                        "Products | Verrah Cosmetics",

                    categories: [],

                    error:
                        "Unable to load products."
                }
            );

    }

};