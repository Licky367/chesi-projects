// ==========================================================
// controllers/salesController.js
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
// HTTP controller for all milk sales operations.
//
// BUSINESS LOGIC
// ----------------------------------------------------------
// All sales business logic is handled by:
//
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
// GET /sales
// ==========================================================

async function renderSales(req, res) {

    try {

        const result =
            await salesService.getSalesPageData({
                user: req.user,
                farmId: req.query.farmId
            });


        // ------------------------------------------------------
        // Authentication
        // ------------------------------------------------------

        if (result.redirect) {

            return res.redirect(
                result.redirect
            );

        }


        // ------------------------------------------------------
        // Error response
        // ------------------------------------------------------

        if (result.status) {

            return res
                .status(result.status)
                .render(
                    "sales",
                    result.data
                );

        }


        // ------------------------------------------------------
        // Render
        // ------------------------------------------------------

        return res.render(
            "sales",
            result.data
        );

    }

    catch (error) {

        console.error(
            "SALES CONTROLLER - GET /sales:",
            error
        );


        return res
            .status(500)
            .render(
                "sales",
                salesService.getErrorPageData(
                    req.user,
                    "Unable to load the sales page."
                )
            );

    }

}


// ==========================================================
// POST /sales/price
// ==========================================================

async function saveMilkPrice(req, res) {

    try {

        const result =
            await salesService.saveMilkPrice({
                user: req.user,
                farmId: req.body.farmId,
                price: req.body.price
            });


        return res.redirect(
            result.redirect
        );

    }

    catch (error) {

        console.error(
            "SALES CONTROLLER - POST /sales/price:",
            error
        );


        const farmId =
            req.body?.farmId;


        return res.redirect(
            salesService.buildErrorRedirect(
                farmId,
                error.code === "SUMMARY_LOCKED"
                    ? error.message
                    : "Unable to save milk price."
            )
        );

    }

}


// ==========================================================
// POST /sales/manual
// ==========================================================

async function recordManualSale(req, res) {

    try {

        const result =
            await salesService.recordManualSale({
                user: req.user,
                farmId: req.body.farmId,
                customerName: req.body.customerName,
                liters: req.body.liters
            });


        return res.redirect(
            result.redirect
        );

    }

    catch (error) {

        console.error(
            "SALES CONTROLLER - POST /sales/manual:",
            error
        );


        const farmId =
            req.body?.farmId ||
            salesService.getUserFarmId(
                req.user
            );


        return res.redirect(
            salesService.buildErrorRedirect(
                farmId,
                error.code === "SUMMARY_LOCKED"
                    ? error.message
                    : error.message ||
                      "Unable to record the milk sale."
            )
        );

    }

}


// ==========================================================
// POST /sales/standing
// ==========================================================

async function createStandingOrder(req, res) {

    try {

        const result =
            await salesService.createStandingOrder({
                user: req.user,
                farmId: req.body.farmId,
                customerName:
                    req.body.customerName,
                liters:
                    req.body.liters
            });


        return res.redirect(
            result.redirect
        );

    }

    catch (error) {

        console.error(
            "SALES CONTROLLER - POST /sales/standing:",
            error
        );


        const farmId =
            req.body?.farmId ||
            salesService.getUserFarmId(
                req.user
            );


        return res.redirect(
            salesService.buildErrorRedirect(
                farmId,
                error.message ||
                "Unable to create the standing order."
            )
        );

    }

}


// ==========================================================
// POST /sales/standing/submit
// ==========================================================

async function submitStandingSale(req, res) {

    try {

        const result =
            await salesService.submitStandingSale({
                user: req.user,
                standingOrderId:
                    req.body.standingOrderId,
                farmId:
                    req.body.farmId,
                liters:
                    req.body.liters,
                customerName:
                    req.body.customerName
            });


        return res.redirect(
            result.redirect
        );

    }

    catch (error) {

        console.error(
            "SALES CONTROLLER - POST /sales/standing/submit:",
            error
        );


        const farmId =
            req.body?.farmId ||
            salesService.getUserFarmId(
                req.user
            );


        return res.redirect(
            salesService.buildErrorRedirect(
                farmId,
                error.code === "SUMMARY_LOCKED"
                    ? error.message
                    : error.message ||
                      "Unable to record the standing-order sale."
            )
        );

    }

}


// ==========================================================
// POST /sales/standing/omit
// ==========================================================

async function omitStandingOrder(req, res) {

    try {

        const result =
            await salesService.omitStandingOrder({
                user: req.user,
                id: req.body.id,
                farmId: req.body.farmId
            });


        return res.redirect(
            result.redirect
        );

    }

    catch (error) {

        console.error(
            "SALES CONTROLLER - POST /sales/standing/omit:",
            error
        );


        return res.redirect(
            salesService.buildErrorRedirect(
                req.body?.farmId,
                error.message ||
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