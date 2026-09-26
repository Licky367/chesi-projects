// ==========================================================
// controllers/substations/create.js
//
// SUBSTATION CREATE CONTROLLER
// ==========================================================

const service =
    require("../../services/substationService");

const {
    buildSubstationData
} = require("./helpers");


// ==========================================================
// NEW SUBSTATION FORM
// ==========================================================

exports.newForm = async (
    req,
    res
) => {

    try {

        const businessTypes =
            await service.getBusinessTypes();


        return res.render(
            "substations/new",
            {
                title:
                    "New Substation",

                error:
                    null,

                old:
                    {},

                user:
                    req.user,

                businessTypes
            }
        );

    } catch (e) {

        console.error(
            "NEW SUBSTATION FORM ERROR:",
            e
        );


        return res.status(500).render(
            "substations/new",
            {
                title:
                    "New Substation",

                error:
                    e.message,

                old:
                    {},

                user:
                    req.user,

                businessTypes:
                    []
            }
        );
    }
};


// ==========================================================
// CREATE SUBSTATION
// ==========================================================

exports.create = async (
    req,
    res
) => {

    try {

        const data =
            buildSubstationData(req);


        await service.create(
            data
        );


        return res.redirect(
            "/substations?saved=1"
        );

    } catch (e) {

        console.error(
            "CREATE SUBSTATION ERROR:",
            e
        );


        let old =
            {
                ...(req.body || {})
            };


        if (req.file) {

            old.substationIcon =
                `/uploads/substations/${req.file.filename}`;
        }


        // --------------------------------------------------
        // RELOAD BUSINESS TYPES
        // --------------------------------------------------

        let businessTypes = [];

        try {

            businessTypes =
                await service.getBusinessTypes();

        } catch (businessTypeError) {

            console.error(
                "BUSINESS TYPE LOAD ERROR:",
                businessTypeError
            );
        }


        return res.status(400).render(
            "substations/new",
            {
                title:
                    "New Substation",

                error:
                    e.message,

                old,

                user:
                    req.user,

                businessTypes
            }
        );
    }
};