// ==========================================================
// verrah/controllers/substations/updateMultipleProductUnits.js
//
// UPDATE MULTIPLE PRODUCTS AT ONE SUBSTATION
//
// Route:
//
// POST /substations/productsUpdate/:id
//
// :id = ACTIVE SUBSTATION ID
//
// The substation ID comes from req.params.id.
//
// After updating, the user is returned to the sales
// analytics page with the same substation selected.
// ==========================================================

const service =
    require("../../services/substationService");

const {
    getRole
} = require("./helpers");


// ==========================================================
// UPDATE MULTIPLE PRODUCT UNITS
// ==========================================================

exports.updateMultipleProductUnits =
async (
    req,
    res
) => {

    /*
     * ======================================================
     * ADMIN ACCESS
     * ======================================================
     */

    try {

        if (
            getRole(req) !== "admin"
        ) {

            throw new Error(
                "Admin access required."
            );

        }


        /*
         * ==================================================
         * SUBSTATION ID
         *
         * The route is:
         *
         * POST /substations/productsUpdate/:id
         *
         * Therefore the selected substation comes from:
         *
         * req.params.id
         * ==================================================
         */

        const substationId =
            req.params.id;


        if (!substationId) {

            throw new Error(
                "Substation is required."
            );

        }


        /*
         * ==================================================
         * PRODUCTS
         * ==================================================
         */

        const products =
            Array.isArray(
                req.body.products
            )
                ? req.body.products
                : [];


        if (!products.length) {

            throw new Error(
                "No products were provided."
            );

        }


        /*
         * ==================================================
         * UPDATE
         * ==================================================
         */

        await service.updateMultipleProductUnits(
            substationId,
            products
        );


        /*
         * ==================================================
         * SUCCESS
         *
         * Return to the sales analytics page while
         * preserving the selected substation.
         *
         * The exact filter can continue to be supplied
         * through the query string if your sales page
         * already uses these parameters.
         * ==================================================
         */

        return res.redirect(
            `/sales?substation=${encodeURIComponent(
                substationId
            )}&success=${encodeURIComponent(
                "Market units updated successfully."
            )}`
        );


    } catch (e) {

        console.error(
            "UPDATE MULTIPLE PRODUCT UNITS ERROR:",
            e
        );


        /*
         * ==================================================
         * PRESERVE ACTIVE SUBSTATION
         *
         * Always use req.params.id.
         *
         * Do NOT fall back to req.body.substationId.
         * ==================================================
         */

        const substationId =
            req.params.id ||
            "";


        /*
         * ==================================================
         * ERROR REDIRECT
         *
         * Return to the sales analytics page instead of
         * sending the user to /substations.
         * ==================================================
         */

        return res.redirect(
            `/sales?substation=${encodeURIComponent(
                substationId
            )}&error=${encodeURIComponent(
                e.message
            )}`
        );

    }

};