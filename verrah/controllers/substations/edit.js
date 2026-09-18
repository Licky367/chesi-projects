// ==========================================================
// verrah/controllers/substations/edit.js
// EDIT SUBSTATION FORM
// ==========================================================

const service =
    require("../../services/substationService");

exports.editForm =
async (
    req,
    res
) => {
    try {
        const substation =
            await service.getById(
                req.params.id
            );

        if (!substation) {
            return res.redirect(
                "/substations?error=Substation+not+found"
            );
        }

        return res.render(
            "substations/new",
            {
                title:
                    "Edit Substation",

                substation,

                error:
                    null,

                old: {},

                user:
                    req.user
            }
        );

    } catch (e) {
        console.error(
            "EDIT SUBSTATION ERROR:",
            e
        );

        return res.redirect(
            `/substations?error=${encodeURIComponent(
                e.message
            )}`
        );
    }
};
