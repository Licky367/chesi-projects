// ==========================================================
// verrah/controllers/substations/detail.js
// SUBSTATION DETAIL
// ==========================================================

const service =
    require("../../services/substationService");

exports.detail = async (
    req,
    res
) => {
    try {
        const substation =
            await service.getWithProducts(
                req.params.id
            );

        if (!substation) {
            return res.redirect(
                "/substations?error=Substation+not+found"
            );
        }

        return res.render(
            "substations/detail",
            {
                title:
                    substation.name,

                substation,

                user:
                    req.user
            }
        );

    } catch (e) {
        console.error(
            "SUBSTATION DETAIL ERROR:",
            e
        );

        return res.redirect(
            `/substations?error=${encodeURIComponent(
                e.message
            )}`
        );
    }
};
