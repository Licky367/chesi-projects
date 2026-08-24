// ==========================================================
// middleware/farmContext.js
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
// Establish the active dairy farm for the request.
//
// Makes available:
//
//     req.farm
//     req.farmId
//     req.availableFarms
//
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
// MIDDLEWARE
// ==========================================================

async function farmContext(
    req,
    res,
    next
) {

    try {

        const user =
            getUser(req);


        if (!user) {

            return res.redirect(
                "/login"
            );

        }


        // ==================================================
        // OPTIONAL FARM SWITCH
        // ==================================================

        const requestedFarmId =
            req.query?.farmId ||
            req.body?.farmId ||
            null;


        // ==================================================
        // RESOLVE
        // ==================================================

        const farm =
            await farmContextService.resolveActiveFarm({

                user,

                requestedFarmId,

                session:
                    req.session

            });


        // ==================================================
        // AVAILABLE FARMS
        // ==================================================

        const availableFarms =
            await farmContextService.getAvailableFarms(
                user
            );


        // ==================================================
        // REQUEST CONTEXT
        // ==================================================

        req.farm =
            farm;


        req.farmId =
            farm._id;


        req.availableFarms =
            availableFarms;


        // ==================================================
        // LOCALS
        // ==================================================

        res.locals.activeFarm =
            farm;


        res.locals.availableFarms =
            availableFarms;


        res.locals.farmId =
            String(farm._id);


        next();

    }

    catch (error) {

        console.error(
            "FARM CONTEXT ERROR:",
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


        if (
            error.code ===
            "FARM_NOT_AVAILABLE"
        ) {

            return res.status(
                404
            ).send(
                error.message
            );

        }


        return res.status(
            500
        ).send(
            "Unable to determine active dairy farm."
        );

    }

}


module.exports =
    farmContext;