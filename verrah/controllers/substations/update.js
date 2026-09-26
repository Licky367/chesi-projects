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


// ==========================================================
// UPDATE SUBSTATION
// ==========================================================

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


        // ==================================================
        // REBUILD SUBSTATION DATA FOR FORM
        // ==================================================

        const substation = {

            ...(req.body || {}),

            _id:
                req.params.id

        };


        // ==================================================
        // LOAD EXISTING SUBSTATION
        // ==================================================

        let existing = null;


        try {

            existing =
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


        } catch (loadError) {

            console.error(
                "LOAD EXISTING SUBSTATION ERROR:",
                loadError
            );
        }


        // ==================================================
        // UPLOADED ICON
        // ==================================================

        if (req.file) {

            substation.substationIcon =
                `/uploads/substations/${req.file.filename}`;
        }


        // ==================================================
        // GPS
        // ==================================================

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


        // ==================================================
        // BUSINESS TYPES
        // ==================================================
        //
        // The edit form needs the complete existing list even
        // when the update fails validation.
        //
        // ==================================================

        let businessTypes = [];


        try {

            businessTypes =
                await service.getBusinessTypes();

        } catch (businessTypeError) {

            console.error(
                "LOAD BUSINESS TYPES ERROR:",
                businessTypeError
            );
        }


        // ==================================================
        // RENDER EDIT FORM
        // ==================================================

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
                    req.user,

                businessTypes

            }
        );
    }
};