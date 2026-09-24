// ==========================================================
// verrah/controllers/substations/productDetail.js
// PRODUCT DETAIL
// ==========================================================

const service =
    require("../../services/substationService");

const {
    getRole
} = require("./helpers");


// ==========================================================
// PRODUCT DETAIL
// ==========================================================
//
// GET /substations/product/:id
//
// :id = PRODUCT ID
// ==========================================================

exports.productDetail =
async (
    req,
    res
) => {

    try {

        // ----------------------------------------------------
        // PRODUCT ID
        // ----------------------------------------------------

        const productId =
            req.params.id;


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
                "/substations?error=Product+not+found"
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
            `/substations?error=${encodeURIComponent(
                e.message
            )}`
        );
    }
};