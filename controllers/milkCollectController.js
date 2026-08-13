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
//     GET  /milk/edit/:id
//     POST /milk/:id
//
// IMPORTANT
// ----------------------------------------------------------
// Business logic and authorization belong to:
//
//     services/milkCollectService.js
//
// This controller is responsible only for:
//
// • Authentication/session access
// • Calling the service
// • Rendering milk.ejs
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
// Keeps session access consistent.
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
// RENDER MILK PAGE
// ==========================================================
//
// Centralized rendering helper.
//
// This prevents GET /milk and POST /milk error handling
// from building different versions of the milk.ejs data.
//
// ==========================================================

async function renderMilkPage(
    req,
    res,
    options = {}
) {

    const user =
        getUser(req);


    if (!user) {

        return res.redirect(
            "/login"
        );

    }


    try {

        const data =
            await milkCollectService.getMilkPageData(
                user
            );


        return res.status(
            options.status || 200
        ).render(
            "milk",
            {

                // ==================================================
                // MILK PAGE DATA
                // ==================================================

                dairies:
                    data.dairies || [],

                milkRecords:
                    data.milkRecords || [],

                morningRecords:
                    data.morningRecords || [],

                eveningRecords:
                    data.eveningRecords || [],


                // ==================================================
                // SESSION
                // ==================================================

                session:
                    data.session,

                sessionInfo:
                    data.sessionInfo || null,

                canSubmit:
                    data.canSubmit === true,

                canEditMorning:
                    data.canEditMorning === true,

                canEditEvening:
                    data.canEditEvening === true,


                // ==================================================
                // USER
                // ==================================================

                user,

                isAdmin:
                    user.role === "admin",


                // ==================================================
                // OPTIONAL MESSAGE
                // ==================================================

                success:
                    options.success || null,

                error:
                    options.error || null

            }
        );

    }

    catch (error) {

        console.error(
            "Render milk page error:",
            error
        );


        return res.status(
            500
        ).render(
            "milk",
            {

                dairies:
                    [],

                milkRecords:
                    [],

                morningRecords:
                    [],

                eveningRecords:
                    [],


                session:
                    null,

                sessionInfo:
                    null,

                canSubmit:
                    false,

                canEditMorning:
                    false,

                canEditEvening:
                    false,


                user,

                isAdmin:
                    user.role === "admin",


                success:
                    null,

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
// ==========================================================
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
        // RENDER MILK.EJS
        // ==================================================

        return res.render(
            "milk",
            {

                // ------------------------------------------------
                // Animals / records
                // ------------------------------------------------

                dairies:
                    data.dairies || [],

                milkRecords:
                    data.milkRecords || [],

                morningRecords:
                    data.morningRecords || [],

                eveningRecords:
                    data.eveningRecords || [],


                // ------------------------------------------------
                // Session
                // ------------------------------------------------

                session:
                    data.session,

                sessionInfo:
                    data.sessionInfo || null,

                canSubmit:
                    data.canSubmit === true,

                canEditMorning:
                    data.canEditMorning === true,

                canEditEvening:
                    data.canEditEvening === true,


                // ------------------------------------------------
                // User
                // ------------------------------------------------

                user,

                isAdmin:
                    user.role === "admin"

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
                    error.message ||
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
// ==========================================================
//
// Route:
//
//     router.post(
//         "/milk",
//         milkCollectController.submitMilk
//     );
//
// Service:
//
//     milkCollectService.saveMilkRecords(
//         records,
//         user
//     );
//
// IMPORTANT
// ----------------------------------------------------------
// The service determines the real session using Kenya time.
//
// The controller does NOT trust:
//
//     req.body.session
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


    try {

        // ==================================================
        // GET SUBMITTED RECORDS
        // ==================================================
        //
        // The service accepts either:
        //
        //     Array
        //
        // or:
        //
        //     Object
        //
        // Therefore we pass the records through without
        // duplicating validation here.
        //
        // ==================================================

        const records =
            req.body?.records ||
            req.body ||
            {};


        // ==================================================
        // SAVE RECORDS
        // ==================================================

        await milkCollectService.saveMilkRecords(
            records,
            user
        );


        // ==================================================
        // SUCCESS MESSAGE
        // ==================================================

        const message =
            user.role === "admin"

                ? "Milk records saved successfully."

                : "Today's milk records have been submitted successfully.";


        // ==================================================
        // REDIRECT
        // ==================================================
        //
        // Prevents duplicate POST submission when the user
        // refreshes the browser.
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
        // AUTHENTICATION FAILURE
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
                error.message
            );

        }


        // ==================================================
        // COLLECTION TIME CLOSED
        // ==================================================

        if (
            error.code ===
            "MILK_TIME_CLOSED"
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
        // VALIDATION / DUPLICATE RECORD ERRORS
        // ==================================================

        const validationErrors = [

            "MILK_NO_RECORDS",

            "MILK_INVALID_ANIMAL",

            "MILK_INVALID_QUANTITY",

            "MILK_DUPLICATE_RECORD",

            "MILK_ALREADY_RECORDED",

            "MILK_SAVE_FAILED"

        ];


        if (
            validationErrors.includes(
                error.code
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
        // UNEXPECTED ERROR
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
// If another file still calls:
//
//     milkCollectController.saveMilk
//
// it will continue working.
//
// The route should preferably use:
//
//     submitMilk
//
// ==========================================================

exports.saveMilk =
    exports.submitMilk;


// ==========================================================
// GET EDIT MILK RECORD
// ==========================================================
//
// GET /milk/edit/:id
//
// Admin only.
//
// IMPORTANT
// ----------------------------------------------------------
// The actual authorization and edit-window validation belongs
// to milkCollectService.editMilkRecord().
//
// This endpoint only loads the record for the edit form.
//
// ==========================================================

exports.getEditMilk =
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
        // ADMIN CHECK
        // ==================================================
        //
        // This is a UI-access check only.
        //
        // The actual authorization remains in the service.
        //
        // ==================================================

        if (
            user.role !== "admin"
        ) {

            return res.status(
                403
            ).send(
                "Only an administrator can edit milk records."
            );

        }


        // ==================================================
        // VALIDATE RECORD ID
        // ==================================================

        const recordId =
            req.params.id;


        if (
            !recordId
        ) {

            return res.status(
                400
            ).send(
                "Milk record ID is required."
            );

        }


        // ==================================================
        // LOAD MILK RECORD
        // ==================================================

        const Milk =
            require("../models/milk");


        const record =
            await Milk.findById(
                recordId
            )
                .populate(
                    "dairy"
                )
                .populate(
                    "recordedBy",
                    "name"
                )
                .lean();


        if (
            !record
        ) {

            return res.status(
                404
            ).send(
                "Milk record not found."
            );

        }


        // ==================================================
        // CHECK EDIT PERMISSION
        // ==================================================

        const canEdit =
            milkCollectService.canAdminEditRecord(
                record
            );


        if (
            !canEdit
        ) {

            return res.status(
                400
            ).send(
                "This milk record can no longer be edited."
            );

        }


        // ==================================================
        // RENDER EDIT PAGE
        // ==================================================
        //
        // If your application uses a different edit view,
        // change ONLY the view name here.
        //
        // ==================================================

        return res.render(
            "milk/edit",
            {

                record,

                user,

                isAdmin:
                    true

            }
        );

    }

    catch (error) {

        console.error(
            "GET /milk/edit/:id error:",
            error
        );


        return res.status(
            500
        ).send(
            error.message ||
            "Unable to load the milk record."
        );

    }

};


// ==========================================================
// UPDATE EXISTING MILK RECORD
// ==========================================================
//
// POST /milk/:id
//
// Admin only.
//
// Service:
//
//     milkCollectService.editMilkRecord({
//         recordId,
//         liters,
//         remarks,
//         user
//     })
//
// ==========================================================

exports.updateMilkRecord =
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
        // RECORD ID
        // ==================================================

        const recordId =
            req.params.id;


        // ==================================================
        // FORM DATA
        // ==================================================

        const liters =
            req.body?.liters;


        const remarks =
            req.body?.remarks;


        // ==================================================
        // UPDATE THROUGH SERVICE
        // ==================================================
        //
        // Authorization is handled by the service.
        //
        // ==================================================

        await milkCollectService.editMilkRecord({

            recordId,

            liters,

            remarks,

            user

        });


        // ==================================================
        // SUCCESS
        // ==================================================

        const message =
            "Milk record updated successfully.";


        // ==================================================
        // REDIRECT
        // ==================================================

        return res.redirect(
            `/milk?success=${encodeURIComponent(message)}`
        );

    }

    catch (error) {

        console.error(
            "POST /milk/:id error:",
            error
        );


        // ==================================================
        // AUTHENTICATION
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
        // ADMIN REQUIRED
        // ==================================================

        if (
            error.code ===
            "MILK_ADMIN_REQUIRED"
        ) {

            return res.status(
                403
            ).send(
                error.message
            );

        }


        // ==================================================
        // RECORD NOT FOUND
        // ==================================================

        if (
            error.code ===
            "MILK_NOT_FOUND"
        ) {

            return res.status(
                404
            ).send(
                error.message
            );

        }


        // ==================================================
        // EDIT WINDOW CLOSED
        // ==================================================

        if (
            error.code ===
            "MILK_TIME_CLOSED"
        ) {

            return res.status(
                400
            ).send(
                error.message
            );

        }


        // ==================================================
        // INVALID QUANTITY
        // ==================================================

        if (
            error.code ===
            "MILK_INVALID_QUANTITY"
        ) {

            return res.status(
                400
            ).send(
                error.message
            );

        }


        // ==================================================
        // GENERIC ERROR
        // ==================================================

        return res.status(
            500
        ).send(
            error.message ||
            "Unable to update the milk record."
        );

    }

};


// ==========================================================
// EXPORT
// ==========================================================
//
// The individual functions are already exported above.
//
// ==========================================================