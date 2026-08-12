// ==========================================================
// controllers/milkController.js
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
// Controller for milk.ejs.
//
// Handles:
//
// GET  /milk
// POST /milk
// POST /milk/:recordId
//
// ==========================================================

const milkService =
    require("../services/milkService");


// ==========================================================
// GET MILK PAGE
// ==========================================================
//
// GET /milk
//
// Renders:
//
// views/milk.ejs
//
// ==========================================================

exports.getMilkPage =
    async function(req, res) {

        try {

            // ------------------------------------------------
            // SESSION USER
            // ------------------------------------------------

            const user =
                req.session &&
                req.session.user;


            if (!user) {

                return res.redirect(
                    "/login"
                );

            }


            // ------------------------------------------------
            // GET PAGE DATA
            // ------------------------------------------------

            const data =
                await milkService.getMilkPageData(
                    user
                );


            // ------------------------------------------------
            // RENDER
            // ------------------------------------------------

            return res.render(
                "milk",
                {

                    // Logged-in user
                    user,

                    // Eligible milking animals
                    animals:
                        data.animals,

                    // Today's milk records
                    records:
                        data.records,

                    // Nairobi calendar day
                    today:
                        data.today,

                    // Totals
                    totals:
                        data.totals

                }
            );

        }
        catch (error) {

            console.error(
                "GET /milk error:",
                error
            );


            // ------------------------------------------------
            // AUTHORIZATION
            // ------------------------------------------------

            if (
                error.statusCode === 401
            ) {

                return res.redirect(
                    "/login"
                );

            }


            // ------------------------------------------------
            // FORBIDDEN
            // ------------------------------------------------

            if (
                error.statusCode === 403
            ) {

                return res.status(403).send(
                    error.message
                );

            }


            // ------------------------------------------------
            // OTHER ERROR
            // ------------------------------------------------

            return res.status(
                error.statusCode || 500
            ).send(
                error.message ||
                "Unable to load milk collection page."
            );

        }

    };


// ==========================================================
// SUBMIT MILK
// ==========================================================
//
// POST /milk
//
// Expected body:
//
// {
//     dairy,
//     session,
//     liters,
//     remarks
// }
//
// ==========================================================

exports.submitMilk =
    async function(req, res) {

        try {

            // ------------------------------------------------
            // SESSION USER
            // ------------------------------------------------

            const user =
                req.session &&
                req.session.user;


            if (!user) {

                return res.redirect(
                    "/login"
                );

            }


            // ------------------------------------------------
            // FORM DATA
            // ------------------------------------------------

            const {

                dairy,

                session,

                liters,

                remarks

            } = req.body;


            // ------------------------------------------------
            // SAVE
            // ------------------------------------------------

            const record =
                await milkService.createMilkRecord({

                    dairy,

                    session,

                    liters,

                    remarks,

                    user

                });


            // ------------------------------------------------
            // RESPONSE TYPE
            // ------------------------------------------------
            //
            // If milk.ejs submits using normal HTML forms,
            // redirect back to /milk.
            //
            // If JavaScript sends fetch(), return JSON.
            //
            // ------------------------------------------------

            const acceptsJson =
                req.headers.accept &&
                req.headers.accept.includes(
                    "application/json"
                );


            if (
                acceptsJson ||
                req.xhr
            ) {

                return res.status(
                    201
                ).json({

                    success:
                        true,

                    message:
                        "Milk record saved successfully.",

                    record

                });

            }


            // ------------------------------------------------
            // NORMAL FORM SUBMISSION
            // ------------------------------------------------

            return res.redirect(
                "/milk"
            );

        }
        catch (error) {

            console.error(
                "POST /milk error:",
                error
            );


            // ------------------------------------------------
            // AJAX / FETCH ERROR
            // ------------------------------------------------

            const acceptsJson =
                req.headers.accept &&
                req.headers.accept.includes(
                    "application/json"
                );


            if (
                acceptsJson ||
                req.xhr
            ) {

                return res.status(
                    error.statusCode || 500
                ).json({

                    success:
                        false,

                    message:
                        error.message ||
                        "Unable to save milk record."

                });

            }


            // ------------------------------------------------
            // NORMAL FORM ERROR
            // ------------------------------------------------

            return res.status(
                error.statusCode || 400
            ).send(
                error.message ||
                "Unable to save milk record."
            );

        }

    };


// ==========================================================
// UPDATE MILK RECORD
// ==========================================================
//
// POST /milk/:recordId
//
// Expected body:
//
// {
//     liters,
//     remarks
// }
//
// ==========================================================

exports.updateMilkRecord =
    async function(req, res) {

        try {

            // ------------------------------------------------
            // SESSION USER
            // ------------------------------------------------

            const user =
                req.session &&
                req.session.user;


            if (!user) {

                return res.redirect(
                    "/login"
                );

            }


            // ------------------------------------------------
            // RECORD ID
            // ------------------------------------------------

            const recordId =
                req.params.recordId;


            // ------------------------------------------------
            // BODY
            // ------------------------------------------------

            const {

                liters,

                remarks

            } = req.body;


            // ------------------------------------------------
            // UPDATE
            // ------------------------------------------------

            const record =
                await milkService.updateMilkRecord({

                    recordId,

                    liters,

                    remarks,

                    user

                });


            // ------------------------------------------------
            // JSON RESPONSE
            // ------------------------------------------------

            const acceptsJson =
                req.headers.accept &&
                req.headers.accept.includes(
                    "application/json"
                );


            if (
                acceptsJson ||
                req.xhr
            ) {

                return res.json({

                    success:
                        true,

                    message:
                        "Milk record updated successfully.",

                    record

                });

            }


            // ------------------------------------------------
            // NORMAL FORM
            // ------------------------------------------------

            return res.redirect(
                "/milk"
            );

        }
        catch (error) {

            console.error(
                "POST /milk/:recordId error:",
                error
            );


            // ------------------------------------------------
            // JSON ERROR
            // ------------------------------------------------

            const acceptsJson =
                req.headers.accept &&
                req.headers.accept.includes(
                    "application/json"
                );


            if (
                acceptsJson ||
                req.xhr
            ) {

                return res.status(
                    error.statusCode || 500
                ).json({

                    success:
                        false,

                    message:
                        error.message ||
                        "Unable to update milk record."

                });

            }


            // ------------------------------------------------
            // NORMAL FORM ERROR
            // ------------------------------------------------

            return res.status(
                error.statusCode || 400
            ).send(
                error.message ||
                "Unable to update milk record."
            );

        }

    };


// ==========================================================
// OPTIONAL: DAILY REPORT API
// ==========================================================
//
// This is not required by the routes you supplied, but it
// makes the service available if milk.ejs later uses AJAX.
//
// GET /milk/daily?day=YYYY-MM-DD
//
// ==========================================================

exports.getDailyReport =
    async function(req, res) {

        try {

            const user =
                req.session &&
                req.session.user;


            if (!user) {

                return res.status(
                    401
                ).json({

                    success:
                        false,

                    message:
                        "Authentication required."

                });

            }


            const day =
                req.query.day ||
                milkService.getNairobiDay();


            const report =
                await milkService.getDailyReport(
                    user,
                    day
                );


            return res.json({

                success:
                    true,

                ...report

            });

        }
        catch (error) {

            console.error(
                "GET milk daily report error:",
                error
            );


            return res.status(
                error.statusCode || 500
            ).json({

                success:
                    false,

                message:
                    error.message ||
                    "Unable to load daily milk report."

            });

        }

    };


// ==========================================================
// OPTIONAL: ANIMAL MONTHLY HISTORY
// ==========================================================

exports.getAnimalMonthlyHistory =
    async function(req, res) {

        try {

            const user =
                req.session &&
                req.session.user;


            if (!user) {

                return res.status(
                    401
                ).json({

                    success:
                        false,

                    message:
                        "Authentication required."

                });

            }


            const dairyId =
                req.params.dairyId;


            const month =
                req.query.month ||
                milkService.getNairobiMonth();


            const result =
                await milkService.getAnimalMonthlyHistory({

                    dairyId,

                    month,

                    user

                });


            return res.json({

                success:
                    true,

                ...result

            });

        }
        catch (error) {

            console.error(
                "Animal milk history error:",
                error
            );


            return res.status(
                error.statusCode || 500
            ).json({

                success:
                    false,

                message:
                    error.message ||
                    "Unable to load milk history."

            });

        }

    };