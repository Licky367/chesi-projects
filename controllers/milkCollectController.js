// ==========================================================
// controllers/milkCollectController.js
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
// Controller for:
//
//     /milk
//
// Handles:
//
//     GET  /milk
//     POST /milk
//
// IMPORTANT
// ----------------------------------------------------------
// Business logic belongs to:
//
//     services/milkCollectService.js
//
// This controller is responsible only for:
//
// • Authentication/session access
// • Calling the milk collection service
// • Rendering milk.ejs
// • Passing the exact data expected by milk.ejs
// • Redirecting after successful POST
// • Translating service errors into HTTP responses
//
// ==========================================================


const milkCollectService =
    require("../services/milkCollectService");


// ==========================================================
// GET AUTHENTICATED USER
// ==========================================================
//
// Supports applications where authentication is stored in:
//
//     req.user
//
// or:
//
//     req.session.user
//
// ==========================================================

function getUser(req) {

    return (
        req.user ||
        req.session?.user ||
        null
    );

}


// ==========================================================
// GET USER ROLE
// ==========================================================

function getUserRole(user) {

    if (!user) {

        return null;

    }


    return user.role || null;

}


// ==========================================================
// IS ADMIN
// ==========================================================

function isAdmin(user) {

    return (
        !!user &&
        user.role === "admin"
    );

}


// ==========================================================
// IS DAIRY WORKER
// ==========================================================

function isDairyWorker(user) {

    return (
        !!user &&
        user.role === "dairyWorker"
    );

}


// ==========================================================
// RENDER MILK PAGE
// ==========================================================
//
// Centralized renderer.
//
// This is used both when:
//
//     GET /milk
//
// and when:
//
//     POST /milk
//
// needs to return the page with an error.
//
// ==========================================================

async function renderMilkPage(
    req,
    res,
    options = {}
) {

    const user =
        getUser(req);


    // ======================================================
    // AUTHENTICATION
    // ======================================================

    if (!user) {

        return res.redirect(
            "/login"
        );

    }


    try {

        // ==================================================
        // GET PAGE DATA FROM SERVICE
        // ==================================================

        const data =
            await milkCollectService.getMilkPageData(
                user
            );


        // ==================================================
        // RENDER
        // ==================================================

        return res.status(
            options.status || 200
        ).render(
            "milk",
            {

                // ==================================================
                // EXACT DATA EXPECTED BY milk.ejs
                // ==================================================

                day:
                    data.day,

                month:
                    data.month,

                farms:
                    Array.isArray(data.farms)
                        ? data.farms
                        : [],


                // ==================================================
                // USER
                // ==================================================

                user,

                isAdmin:
                    isAdmin(user),


                // ==================================================
                // FLASH / STATUS MESSAGES
                // ==================================================

                success:
                    options.success || "",

                error:
                    options.error || ""

            }
        );

    }

    catch (error) {

        console.error(
            "Render milk page error:",
            error
        );


        // ======================================================
        // FALLBACK DATA
        // ======================================================

        const fallbackDay =
            milkCollectService.getNairobiDay();


        const fallbackMonth =
            milkCollectService.getNairobiMonth();


        return res.status(
            options.status || 500
        ).render(
            "milk",
            {

                day:
                    fallbackDay,

                month:
                    fallbackMonth,

                farms:
                    [],

                user,

                isAdmin:
                    isAdmin(user),

                success:
                    options.success || "",

                error:
                    options.error ||
                    "Unable to load today's milk collection page."

            }
        );

    }

}


// ==========================================================
// GET MILK COLLECTION PAGE
// ==========================================================
//
// GET /milk
//
// Service:
//
//     milkCollectService.getMilkPageData(user)
//
// ==========================================================

exports.getMilkPage =
async function(
    req,
    res
) {

    const user =
        getUser(req);


    // ======================================================
    // AUTHENTICATION
    // ======================================================

    if (!user) {

        return res.redirect(
            "/login"
        );

    }


    try {

        // ==================================================
        // GET PAGE DATA
        // ==================================================

        const data =
            await milkCollectService.getMilkPageData(
                user
            );


        // ==================================================
        // RENDER milk.ejs
        // ==================================================

        return res.render(
            "milk",
            {

                // ==================================================
                // PAGE DATA
                // ==================================================

                day:
                    data.day,

                month:
                    data.month,

                farms:
                    Array.isArray(data.farms)
                        ? data.farms
                        : [],


                // ==================================================
                // USER
                // ==================================================

                user,

                isAdmin:
                    isAdmin(user),


                // ==================================================
                // STATUS MESSAGES
                // ==================================================

                success:
                    req.query?.success || "",

                error:
                    req.query?.error || ""

            }
        );

    }

    catch (error) {

        console.error(
            "GET /milk error:",
            error
        );


        return renderMilkPage(
            req,
            res,
            {

                status:
                    500,

                error:
                    "Unable to load today's milk collection page."

            }
        );

    }

};


// ==========================================================
// POST MILK COLLECTION
// ==========================================================
//
// POST /milk
//
// The EJS form submits:
//
//     records[animalId][morning][liters]
//     records[animalId][morning][remarks]
//
//     records[animalId][evening][liters]
//     records[animalId][evening][remarks]
//
// The controller does NOT determine:
//
//     • current session
//     • whether a record can be edited
//     • whether the worker is allowed to edit
//     • whether a session is closed
//
// Those decisions belong to:
//
//     milkCollectService.saveMilk()
//
// ==========================================================

exports.submitMilk =
async function(
    req,
    res
) {

    const user =
        getUser(req);


    // ======================================================
    // AUTHENTICATION
    // ======================================================

    if (!user) {

        return res.redirect(
            "/login"
        );

    }


    // ======================================================
    // ROLE CHECK
    // ======================================================
    //
    // The service also performs authorization.
    //
    // This check prevents unnecessary processing for users
    // who are obviously not permitted to use the page.
    //
    // ======================================================

    if (
        !isAdmin(user) &&
        !isDairyWorker(user)
    ) {

        return res.status(
            403
        ).send(
            "You are not authorized to record milk."
        );

    }


    try {

        // ==================================================
        // GET RECORDS
        // ==================================================
        //
        // Expected structure:
        //
        // records = {
        //
        //     animalId: {
        //
        //         morning: {
        //             liters,
        //             remarks
        //         },
        //
        //         evening: {
        //             liters,
        //             remarks
        //         }
        //
        //     }
        //
        // }
        //
        // ==================================================

        const records =
            req.body?.records || {};


        // ==================================================
        // SAVE THROUGH SERVICE
        // ==================================================

        const result =
            await milkCollectService.saveMilk(
                user,
                records
            );


        // ==================================================
        // SUCCESS MESSAGE
        // ==================================================

        let message;


        if (
            result.created > 0 &&
            result.updated > 0
        ) {

            message =
                "Milk records saved and updated successfully.";

        }

        else if (
            result.updated > 0
        ) {

            message =
                "Milk records updated successfully.";

        }

        else if (
            result.created > 0
        ) {

            message =
                "Milk records submitted successfully.";

        }

        else {

            message =
                "No new milk records were submitted.";

        }


        // ==================================================
        // REDIRECT
        // ==================================================
        //
        // PRG:
        //
        // POST
        //  ↓
        // REDIRECT
        //  ↓
        // GET /milk
        //
        // Prevents duplicate submission on refresh.
        //
        // ==================================================

        return res.redirect(
            `/milk?success=${encodeURIComponent(message)}`
        );

    }

    catch (error) {

        console.error(
            "POST /milk error:",
            error
        );


        // ==================================================
        // AUTHENTICATION ERROR
        // ==================================================

        if (
            error.code ===
            "MILK_USER_REQUIRED"
        ) {

            return res.redirect(
                "/login"
            );

        }


        // ==================================================
        // ACCESS DENIED
        // ==================================================

        if (
            error.code ===
            "MILK_ACCESS_DENIED"
        ) {

            return res.status(
                403
            ).send(
                error.message ||
                "You are not authorized to record milk."
            );

        }


        // ==================================================
        // WORKER / ADMIN RECORD EDIT ERROR
        // ==================================================
        //
        // The service currently uses its return value
        // `skipped` when a worker attempts to modify an
        // existing record.
        //
        // Therefore this is normally handled by the normal
        // response rather than as a thrown exception.
        //
        // These codes are nevertheless supported in case
        // the service later converts them into explicit
        // errors.
        //
        // ==================================================

        if (
            error.code ===
            "MILK_RECORD_LOCKED"
        ) {

            return renderMilkPage(
                req,
                res,
                {

                    status:
                        400,

                    error:
                        error.message ||
                        "This milk record is read-only."

                }
            );

        }


        // ==================================================
        // INVALID QUANTITY
        // ==================================================

        if (
            error.message &&
            error.message.toLowerCase().includes(
                "invalid"
            ) &&
            error.message.toLowerCase().includes(
                "milk"
            )
        ) {

            return renderMilkPage(
                req,
                res,
                {

                    status:
                        400,

                    error:
                        error.message

                }
            );

        }


        // ==================================================
        // GENERIC SAVE ERROR
        // ==================================================

        return renderMilkPage(
            req,
            res,
            {

                status:
                    500,

                error:
                    "Unable to save today's milk records. Please try again."

            }
        );

    }

};


// ==========================================================
// BACKWARD COMPATIBILITY ALIAS
// ==========================================================
//
// Existing routes may still use:
//
//     controller.saveMilk
//
// Keep this alias so the route does not immediately break.
//
// Preferred:
//
//     controller.submitMilk
//
// ==========================================================

exports.saveMilk =
    exports.submitMilk;


// ==========================================================
// OPTIONAL: GET MILK RECORD EDIT PAGE
// ==========================================================
//
// IMPORTANT
// ----------------------------------------------------------
// The new milk.ejs is designed as the primary recording page.
//
// It already supports:
//
//     Admin → edit existing records
//
// Therefore a separate:
//
//     /milk/edit/:id
//
// page is NOT required for the normal milk workflow.
//
// This endpoint is intentionally omitted.
//
// If you later want a dedicated admin edit screen, it should
// be implemented as a separate feature and its service method
// should be added to milkCollectService first.
//
// ==========================================================


// ==========================================================
// OPTIONAL: UPDATE SINGLE MILK RECORD
// ==========================================================
//
// IMPORTANT
// ----------------------------------------------------------
// The current milkCollectService does NOT expose:
//
//     editMilkRecord()
//
// Therefore this controller must NOT call it.
//
// Admin editing currently happens through:
//
//     POST /milk
//
// using the same records structure as the EJS.
//
// The service recognizes an existing record and allows the
// administrator to update it.
//
// ==========================================================


// ==========================================================
// PUBLIC RENDER HELPER
// ==========================================================
//
// Exporting this is optional.
//
// It can be useful if another milk route needs to render the
// same page without duplicating page-data preparation.
//
// ==========================================================

exports.renderMilkPage =
    renderMilkPage;


// ==========================================================
// MODULE COMPLETE
// ==========================================================