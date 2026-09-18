// ==========================================================
// verrah/controllers/substations/images.js
// SUBSTATION IMAGES CONTROLLER
// ==========================================================

const service =
    require("../../services/substationService");

const {
    getRole
} = require("./helpers");


// ==========================================================
// EDIT IMAGES FORM
// ==========================================================

exports.editImagesForm =
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
            "branch-partials/images",
            {
                title:
                    `Manage Images - ${substation.name}`,

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
            "EDIT IMAGES FORM ERROR:",
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
// UPDATE IMAGES
// ==========================================================

exports.updateImages =
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

        let keepImages =
            req.body.keepImages || [];

        if (!Array.isArray(keepImages)) {
            keepImages =
                [keepImages];
        }

        const existingImages =
            Array.isArray(
                substation.images
            )
                ? substation.images
                : [];

        keepImages =
            keepImages.filter(
                image =>
                    existingImages.includes(
                        image
                    )
            );

        const uploadedImages =
            Array.isArray(req.files)
                ? req.files.map(
                    file =>
                        `/uploads/substations/${file.filename}`
                )
                : [];

        const images = [
            ...keepImages,
            ...uploadedImages
        ];

        if (images.length > 20) {
            throw new Error(
                "A substation can have a maximum of 20 images."
            );
        }

        await service.updateImages(
            req.params.id,
            images
        );

        return res.redirect(
            `/substations/branch/images/${req.params.id}?success=${encodeURIComponent(
                "Substation images updated successfully."
            )}`
        );

    } catch (e) {
        console.error(
            "UPDATE IMAGES ERROR:",
            e
        );

        return res.redirect(
            `/substations/branch/images/${req.params.id}?error=${encodeURIComponent(
                e.message
            )}`
        );
    }
};
