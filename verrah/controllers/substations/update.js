// ==========================================================
// verrah/controllers/substations/update.js
// UPDATE SUBSTATION
// ==========================================================

const service =
    require("../../services/substationService");

const {
    normalizeCoordinate,
    buildSubstationData
} = require("./helpers");

exports.update =
async (
    req,
    res
) => {
    try {
        const existingSubstation =
            await service.getById(
                req.params.id
            );

        if (!existingSubstation) {
            throw new Error(
                "Substation not found."
            );
        }

        const data =
            buildSubstationData(
                req,
                existingSubstation
            );

        await service.update(
            req.params.id,
            data
        );

        return res.redirect(
            `/substations/branch/${req.params.id}/edit?saved=1`
        );

    } catch (e) {
        console.error(
            "UPDATE SUBSTATION ERROR:",
            e
        );

        const substation = {
            ...(req.body || {}),
            _id:
                req.params.id
        };

        try {
            const existing =
                await service.getById(
                    req.params.id
                );

            if (
                existing &&
                existing.substationIcon &&
                !req.file &&
                !req.body?.substationIconUrl
            ) {
                substation.substationIcon =
                    existing.substationIcon;
            }

        } catch (iconError) {
            console.error(
                "LOAD EXISTING ICON ERROR:",
                iconError
            );
        }

        if (req.file) {
            substation.substationIcon =
                `/uploads/substations/${req.file.filename}`;
        }

        substation.gps = {
            latitude:
                normalizeCoordinate(
                    req.body?.latitude,
                    -90,
                    90
                ),

            longitude:
                normalizeCoordinate(
                    req.body?.longitude,
                    -180,
                    180
                )
        };

        return res.status(400).render(
            "substations/new",
            {
                title:
                    "Edit Substation",

                substation,

                error:
                    e.message,

                old:
                    req.body || {},

                user:
                    req.user
            }
        );
    }
};
