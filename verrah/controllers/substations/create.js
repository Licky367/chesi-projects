// ==========================================================
// verrah/controllers/substations/create.js
// CREATE SUBSTATION
// ==========================================================

const service =
    require("../../services/substationService");

const {
    buildSubstationData
} = require("./helpers");


// ==========================================================
// NEW SUBSTATION FORM
// ==========================================================

exports.newForm = (
    req,
    res
) => {
    res.render(
        "substations/new",
        {
            title:
                "New Substation",

            error:
                null,

            old:
                {},

            user:
                req.user
        }
    );
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

        let old = {
            ...(req.body || {})
        };

        if (req.file) {
            old.substationIcon =
                `/uploads/substations/${req.file.filename}`;
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
                    req.user
            }
        );
    }
};
