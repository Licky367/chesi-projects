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
        const product =
            await service.getProduct(
                req.params.id
            );

        if (!product) {
            return res.redirect(
                "/substations?error=Product+not+found"
            );
        }

        return res.render(
            "substations/product-detail",
            {
                title:
                    product.name,

                product,

                role:
                    getRole(req),

                error:
                    req.query.error || null,

                success:
                    req.query.success || null,

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
