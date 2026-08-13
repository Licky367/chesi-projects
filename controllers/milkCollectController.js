// ==========================================================
// controllers/milkCollectController.js
// ==========================================================

const milkService =
    require("../services/milkCollectService");


// ==========================================================
// GET MILK COLLECTION PAGE
// ==========================================================
//
// GET /milk
//
// ==========================================================

exports.milkPage =
async function(
    req,
    res
) {

    try {

        const user =
            req.session.user;


        if (
            !user
        ) {

            return res.redirect(
                "/login"
            );

        }


        // ==================================================
        // AUTHORIZATION
        // ==================================================

        if (
            ![
                "admin",
                "dairyWorker"
            ].includes(
                user.role
            )
        ) {

            return res.status(403)
                .send(
                    "You are not authorized to access milk collection."
                );

        }


        const data =
            await milkService.getTodayMilkPage(
                user
            );


        return res.render(
            "milk",
            {

                title:
                    "Record Today's Milk",

                user,

                day:
                    data.day,

                farms:
                    data.farms,

                summary:
                    data.summary

            }
        );

    }

    catch (error) {

        console.error(
            "Milk page error:",
            error
        );


        return res.status(500)
            .send(
                "Unable to load today's milk collection page."
            );

    }

};


// ==========================================================
// SUBMIT TODAY'S MILK
// ==========================================================
//
// POST /milk
//
// ==========================================================

exports.recordMilk =
async function(
    req,
    res
) {

    try {

        const user =
            req.session.user;


        if (
            !user
        ) {

            return res.status(401)
                .json({

                    success:
                        false,

                    message:
                        "Authentication required."

                });

        }


        if (
            ![
                "admin",
                "dairyWorker"
            ].includes(
                user.role
            )
        ) {

            return res.status(403)
                .json({

                    success:
                        false,

                    message:
                        "You are not authorized to record milk."

                });

        }


        const records =
            Array.isArray(
                req.body.records
            )
                ? req.body.records
                : [];


        const result =
            await milkService.saveMilkCollection({

                user,

                records

            });


        return res.json({

            success:
                true,

            message:
                "Milk records saved successfully.",

            day:
                milkService.getTodayKey(),

            summary: {

                produced:
                    result.summary.produced,

                farmTotal:
                    result.summary.farmTotal,

                available:
                    result.summary.available

            }

        });

    }

    catch (error) {

        console.error(
            "Record milk error:",
            error
        );


        return res.status(400)
            .json({

                success:
                    false,

                message:
                    error.message ||
                    "Unable to save milk records."

            });

    }

};


// ==========================================================
// ADMIN EDIT ONE RECORD
// ==========================================================
//
// PUT /milk/:animalId/:session
//
// ==========================================================

exports.updateMilk =
async function(
    req,
    res
) {

    try {

        const user =
            req.session.user;


        if (
            !user
        ) {

            return res.status(401)
                .json({

                    success:
                        false,

                    message:
                        "Authentication required."

                });

        }


        if (
            user.role !== "admin"
        ) {

            return res.status(403)
                .json({

                    success:
                        false,

                    message:
                        "Only an administrator can edit submitted milk records."

                });

        }


        const {
            animalId,
            session
        } =
            req.params;


        const {
            liters,
            remarks
        } =
            req.body;


        const record =
            await milkService.saveMilkRecord({

                user,

                animalId,

                session,

                liters,

                remarks

            });


        return res.json({

            success:
                true,

            message:
                "Milk record updated successfully.",

            record

        });

    }

    catch (error) {

        console.error(
            "Update milk error:",
            error
        );


        return res.status(400)
            .json({

                success:
                    false,

                message:
                    error.message ||
                    "Unable to update milk record."

            });

    }

};


// ==========================================================
// DELETE MILK RECORD
// ==========================================================
//
// DELETE /milk/:animalId/:session
//
// Admin only.
//
// ==========================================================

exports.deleteMilk =
async function(
    req,
    res
) {

    try {

        const user =
            req.session.user;


        if (
            !user
        ) {

            return res.status(401)
                .json({

                    success:
                        false,

                    message:
                        "Authentication required."

                });

        }


        if (
            user.role !== "admin"
        ) {

            return res.status(403)
                .json({

                    success:
                        false,

                    message:
                        "Only an administrator can delete milk records."

                });

        }


        await milkService.deleteMilkRecord({

            user,

            animalId:
                req.params.animalId,

            session:
                req.params.session

        });


        return res.json({

            success:
                true,

            message:
                "Milk record deleted successfully."

        });

    }

    catch (error) {

        console.error(
            "Delete milk error:",
            error
        );


        return res.status(400)
            .json({

                success:
                    false,

                message:
                    error.message ||
                    "Unable to delete milk record."

            });

    }

};