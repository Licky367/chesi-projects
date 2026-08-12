// ==========================================================
// controllers/salesController.js
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
// Handles HTTP requests for milk sales.
//
// RESPONSIBILITY
// ----------------------------------------------------------
// The controller is intentionally thin.
//
// It:
//   1. Receives req/res.
//   2. Calls salesService.
//   3. Handles redirects.
//   4. Renders sales.ejs.
//
// Business logic belongs in:
//     services/salesService.js
//
// ROUTES
// ----------------------------------------------------------
//
// GET
//     /sales
//     /sales?farmId=<ID>
//
// POST
//     /sales/price
//     /sales/manual
//     /sales/standing
//     /sales/standing/submit
//     /sales/standing/omit
//
// ==========================================================

const salesService =
    require("../services/salesService");


// ==========================================================
// HELPERS
// ==========================================================

function getFarmId(
    req
) {

    return (
        req.body?.farmId ||
        req.query?.farmId ||
        salesService.getUserFarmId(
            req.user
        ) ||
        null
    );

}


function salesRedirect(
    res,
    farmId,
    message = null,
    success = false
) {

    const params =
        new URLSearchParams();


    if (farmId) {

        params.set(
            "farmId",
            farmId
        );

    }


    if (message) {

        params.set(
            success
                ? "success"
                : "error",
            success
                ? "1"
                : message
        );

    }


    const query =
        params.toString();


    return res.redirect(
        "/sales" +
        (
            query
                ? `?${query}`
                : ""
        )
    );

}


// ==========================================================
// GET /sales
// ==========================================================

async function renderSales(
    req,
    res
) {

    try {

        const result =
            await salesService.getSalesPageData(
                {
                    user: req.user,
                    farmId: req.query.farmId
                }
            );


        if (
            result.redirect
        ) {

            return res.redirect(
                result.redirect
            );

        }


        return res.render(
            "sales",
            result.data
        );

    }

    catch (error) {

        console.error(
            "SALES PAGE ERROR:",
            error
        );


        return res.status(500)
            .render(
                "sales",
                salesService.getEmptySalesPageData(
                    {
                        user:
                            req.user,

                        error:
                            "Unable to load the sales page."
                    }
                )
            );

    }

}


// ==========================================================
// POST /sales/price
// ==========================================================

async function saveMilkPrice(
    req,
    res
) {

    const farmId =
        getFarmId(req);


    try {

        await salesService.saveMilkPrice(
            {
                user:
                    req.user,

                farmId,

                price:
                    req.body.price
            }
        );


        return salesRedirect(
            res,
            farmId,
            null,
            true
        );

    }

    catch (error) {

        console.error(
            "SAVE MILK PRICE ERROR:",
            error
        );


        return salesRedirect(
            res,
            farmId,
            salesService.getErrorMessage(
                error,
                "Unable to save milk price."
            )
        );

    }

}


// ==========================================================
// POST /sales/manual
// ==========================================================

async function recordManualSale(
    req,
    res
) {

    const farmId =
        getFarmId(req);


    try {

        await salesService.recordManualSale(
            {
                user:
                    req.user,

                farmId,

                customerName:
                    req.body.customerName,

                liters:
                    req.body.liters
            }
        );


        return salesRedirect(
            res,
            farmId,
            null,
            true
        );

    }

    catch (error) {

        console.error(
            "MANUAL SALE ERROR:",
            error
        );


        return salesRedirect(
            res,
            farmId,
            salesService.getErrorMessage(
                error,
                "Unable to record the milk sale."
            )
        );

    }

}


// ==========================================================
// POST /sales/standing
// ==========================================================

async function createStandingOrder(
    req,
    res
) {

    const farmId =
        getFarmId(req);


    try {

        await salesService.createStandingOrder(
            {
                user:
                    req.user,

                farmId,

                customerName:
                    req.body.customerName,

                liters:
                    req.body.liters
            }
        );


        return salesRedirect(
            res,
            farmId,
            null,
            true
        );

    }

    catch (error) {

        console.error(
            "CREATE STANDING ORDER ERROR:",
            error
        );


        return salesRedirect(
            res,
            farmId,
            salesService.getErrorMessage(
                error,
                "Unable to create the standing order."
            )
        );

    }

}


// ==========================================================
// POST /sales/standing/submit
// ==========================================================

async function submitStandingSale(
    req,
    res
) {

    const farmId =
        getFarmId(req);


    try {

        const result =
            await salesService.submitStandingSale(
                {
                    user:
                        req.user,

                    farmId,

                    standingOrderId:
                        req.body.standingOrderId,

                    liters:
                        req.body.liters,

                    customerName:
                        req.body.customerName
                }
            );


        return salesRedirect(
            res,
            result.farmId || farmId,
            null,
            true
        );

    }

    catch (error) {

        console.error(
            "STANDING SALE ERROR:",
            error
        );


        return salesRedirect(
            res,
            farmId,
            salesService.getErrorMessage(
                error,
                "Unable to record the standing-order sale."
            )
        );

    }

}


// ==========================================================
// POST /sales/standing/omit
// ==========================================================

async function omitStandingOrder(
    req,
    res
) {

    const farmId =
        getFarmId(req);


    try {

        await salesService.omitStandingOrder(
            {
                user:
                    req.user,

                farmId,

                standingOrderId:
                    req.body.id
            }
        );


        return salesRedirect(
            res,
            farmId,
            null,
            true
        );

    }

    catch (error) {

        console.error(
            "OMIT STANDING ORDER ERROR:",
            error
        );


        return salesRedirect(
            res,
            farmId,
            salesService.getErrorMessage(
                error,
                "Unable to omit the standing order."
            )
        );

    }

}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    renderSales,

    saveMilkPrice,

    recordManualSale,

    createStandingOrder,

    submitStandingSale,

    omitStandingOrder

};