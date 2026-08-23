// ==========================================================
// controllers/dashboardController.js
// DASHBOARD CONTROLLERS
// ==========================================================

const dashboardService =
    require("../services/dashboardService");


// ==========================================================
// DAIRY DASHBOARD
// ==========================================================

exports.getDairyDashboard =
    async (req, res, next) => {

        try {

            const dairies =
                await dashboardService
                    .getDairiesForDashboard();


            return res.render(
                "admin",
                {

                    title:
                        "Admin Dashboard",

                    user:
                        req.user,

                    // ------------------------------------------
                    // DAIRY RECORDS
                    // ------------------------------------------
                    //
                    // Each dairy contains its MongoDB _id.
                    //
                    // Frontend:
                    //
                    //     dairy._id
                    //
                    // ------------------------------------------

                    dairies

                }
            );

        } catch (error) {

            return next(error);

        }

    };


// ==========================================================
// POULTRY DASHBOARD
// ==========================================================

exports.getPoultryDashboard =
    (req, res) => {

        return res.render(
            "poultryDashboard",
            {

                title:
                    "Poultry Dashboard",

                user:
                    req.user

            }
        );

    };


// ==========================================================
// AGRICULTURE DASHBOARD
// ==========================================================

exports.getAgricultureDashboard =
    (req, res) => {

        return res.render(
            "agricultureDashboard",
            {

                title:
                    "Agriculture Dashboard",

                user:
                    req.user

            }
        );

    };