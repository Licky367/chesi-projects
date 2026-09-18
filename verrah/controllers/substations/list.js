// ==========================================================
// verrah/controllers/substations/list.js
// LIST SUBSTATIONS
// ==========================================================

const service =
    require("../../services/substationService");

exports.list = async (
    req,
    res
) => {
    try {
        res.render(
            "substations/index",
            {
                title:
                    "Substations",

                substations:
                    await service.list(),

                error:
                    req.query.error || null,

                saved:
                    req.query.saved || "",

                user:
                    req.user
            }
        );

    } catch (e) {
        console.error(
            "SUBSTATION LIST ERROR:",
            e
        );

        res.status(500).render(
            "substations/index",
            {
                title:
                    "Substations",

                substations: [],

                error:
                    e.message,

                saved: "",

                user:
                    req.user
            }
        );
    }
};
