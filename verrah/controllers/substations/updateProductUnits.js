// ==========================================================
// verrah/controllers/substations/updateProductUnits.js
// UPDATE PRODUCT UNITS
// ==========================================================

const service =
    require("../../services/substationService");

const {
    getRole
} = require("./helpers");

exports.updateProductUnits =
async (
    req,
    res
) => {
    try {
        if (
            getRole(req) !== "admin"
        ) {
            throw new Error(
                "Admin access required."
            );
        }

        await service.updateProductUnits(
            req.params.id,
            req.body
        );

        return res.redirect(
            `/substations/product/${req.params.id}?success=${encodeURIComponent(
                "Product units updated successfully."
            )}`
        );

    } catch (e) {
        console.error(
            "UPDATE PRODUCT UNITS ERROR:",
            e
        );

        return res.redirect(
            `/substations/product/${req.params.id}?error=${encodeURIComponent(
                e.message
            )}`
        );
    }
};
