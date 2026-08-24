// ==========================================================
// controllers/farmContextController.js
// ==========================================================

const farmContextService =
    require("../services/farmContextService");


// ==========================================================
// GET USER
// ==========================================================

function getUser(req) {

    return (
        req.session?.user ||
        req.user ||
        null
    );

}


// ==========================================================
// SWITCH FARM
// ==========================================================
//
// POST /farm-context/switch
//
// ==========================================================

exports.switchFarm =
async function(
    req,
    res
) {

    try {

        const user =
            getUser(req);


        if (!user) {

            return res.redirect(
                "/login"
            );

        }


        const farmId =
            req.body?.farmId;


        if (!farmId) {

            return res.status(
                400
            ).send(
                "Farm was not specified."
            );

        }


        await farmContextService.setActiveFarm({

            user,

            farmId,

            session:
                req.session

        });


        // ==================================================
        // RETURN TO PREVIOUS PAGE
        // ==================================================

        const returnTo =
            typeof req.body?.returnTo === "string" &&
            req.body.returnTo.startsWith("/")
                ? req.body.returnTo
                : "/sales";


        return res.redirect(
            returnTo
        );

    }

    catch (error) {

        console.error(
            "SWITCH FARM ERROR:",
            error
        );


        if (
            error.code ===
            "FARM_NOT_ASSIGNED"
        ) {

            return res.status(
                403
            ).send(
                error.message
            );

        }


        return res.status(
            400
        ).send(
            error.message ||
            "Unable to switch farm."
        );

    }

};