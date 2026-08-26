// ==========================================================
// controllers/addOns/report.js
// CASH FLOW / FINANCIAL REPORT CONTROLLER
// ==========================================================
//
// PAGE:
//
//     /cash/:id
//
// PURPOSE
// ----------------------------------------------------------
//
// Receives the Dairy ID and optional week-filter date,
// delegates all reporting logic to:
//
//     services/addOns/report.js
//
// and renders:
//
//     views/addOns/report.ejs
//
// ==========================================================


const reportService =
    require("../../services/addOns/report");


// ==========================================================
// CASH FLOW REPORT
// ==========================================================

async function report(
    req,
    res,
    next
) {

    try {

        // ==================================================
        // DAIRY ID
        // ==================================================

        const dairyId =
            req.params.id;


        // ==================================================
        // DATE FILTER
        // ==================================================
        //
        // Expected:
//
//     /cash/:id?date=2026-08-26
//
//     If no date is supplied, the service uses today.
//
// ==================================================

        const selectedDate =
            req.query.date ||
            "";


        // ==================================================
        // GET REPORT DATA
        // ==================================================

        const reportData =
            await reportService.getReport(

                dairyId,

                selectedDate

            );


        // ==================================================
        // RENDER
        // ==================================================

        return res.render(

            "addOns/report",

            {

                title:
                    "Cash Flow Report",

                currentPath:
                    req.path,

                ...reportData

            }

        );

    }

    catch(error) {

        return next(
            error
        );

    }

}


// ==========================================================
// EXPORT
// ==========================================================

module.exports =
    report;