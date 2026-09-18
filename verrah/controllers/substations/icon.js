// ==========================================================
// verrah/controllers/substations/icon.js
// SUBSTATION ICON CONTROLLER
// ==========================================================

const service =
    require("../../services/substationService");

const {
    getRole
} = require("./helpers");


// ==========================================================
// EDIT ICON FORM
// ==========================================================

exports.editIconForm =
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
            "branch-partials/icon",
            {
                title:
                    `Edit Icon - ${substation.name}`,

                substation,

                editMode:
                    true,

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
            "EDIT ICON FORM ERROR:",
            e
        );

        return res.redirect(
            `/substations?error=${encodeURIComponent(
                e.message
            )}`
        );
    }
};


// ==========================================================
// UPDATE ICON
// ==========================================================

exports.updateIcon =
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

        const substation =
            await service.getById(
                req.params.id
            );

        if (!substation) {
            throw new Error(
                "Substation not found."
            );
        }

        if (!req.file) {
            return res.redirect(
                `/substations/branch/icon/${req.params.id}?error=${encodeURIComponent(
                    "Please select an icon image."
                )}`
            );
        }

        const imagePath =
            `/uploads/substations/${req.file.filename}`;

        await service.updateIcon(
            req.params.id,
            imagePath
        );

        return res.redirect(
            `/substations/branch/icon/${req.params.id}?success=${encodeURIComponent(
                "Substation icon updated successfully."
            )}`
        );

    } catch (e) {
        console.error(
            "UPDATE ICON ERROR:",
            e
        );

        return res.redirect(
            `/substations/branch/icon/${req.params.id}?error=${encodeURIComponent(
                e.message
            )}`
        );
    }
};
