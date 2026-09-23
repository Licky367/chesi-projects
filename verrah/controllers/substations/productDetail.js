// ==========================================================
// verrah/controllers/substations/productDetail.js
// PRODUCT DETAIL
// ==========================================================

const service =
    require("../../services/substationService");

const {
    getRole
} = require("./helpers");


exports.productDetail =
async (
    req,
    res
) => {

    try {

        // ----------------------------------------------------
        // SUBSTATION ID
        // ----------------------------------------------------
        //
        // Supports:
        //
        //     /branch/:substationId/products/:id
        //
        // and routes where the substation parameter is named
        // `id`.
        // ----------------------------------------------------

        const substationId =
            req.params.substationId ||
            req.params.substation_id ||
            req.params.substation ||
            req.params.id;


        // ----------------------------------------------------
        // PRODUCT ID
        // ----------------------------------------------------

        const productId =
            req.params.productId ||
            req.params.product;


        // ----------------------------------------------------
        // GET PRODUCT
        // ----------------------------------------------------

        const product =
            await service.getProduct(
                productId
            );


        // ----------------------------------------------------
        // PRODUCT NOT FOUND
        // ----------------------------------------------------

        if (!product) {

            return res.redirect(
                `/branch/${substationId}/products?error=Product+not+found`
            );
        }


        // ----------------------------------------------------
        // GET SUBSTATIONS
        // ----------------------------------------------------

        const substations =
            await service.list();


        // ----------------------------------------------------
        // RENDER PRODUCT DETAIL
        // ----------------------------------------------------

        return res.render(
            "substations/product-detail",
            {
                title:
                    product.name,

                // ------------------------------------------------
                // PRODUCT
                // ------------------------------------------------

                product,

                // ------------------------------------------------
                // ACTIVE SUBSTATION
                // ------------------------------------------------

                substationId,

                // ------------------------------------------------
                // SUBSTATIONS
                // ------------------------------------------------

                substations,

                // ------------------------------------------------
                // ROLE
                // ------------------------------------------------

                role:
                    getRole(req),

                // ------------------------------------------------
                // MESSAGES
                // ------------------------------------------------

                error:
                    req.query.error || null,

                success:
                    req.query.success || null,

                // ------------------------------------------------
                // USER
                // ------------------------------------------------

                user:
                    req.user
            }
        );


    } catch (e) {

        console.error(
            "PRODUCT DETAIL ERROR:",
            e
        );


        return res.redirect(
            `/branch/${substationId || ""}/products?error=${encodeURIComponent(
                e.message
            )}`
        );
    }
};