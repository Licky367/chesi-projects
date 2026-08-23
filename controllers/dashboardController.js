// ==========================================================
// controllers/dashboardController.js
// DASHBOARD CONTROLLERS
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
//
// Handles dashboard requests.
//
// The controller does NOT construct or query Dairy records
// directly.
//
// All dashboard data comes from:
//
//      services/dashboardService.js
//
// ==========================================================


const dashboardService =
    require("../services/dashboardService");


// ==========================================================
// DAIRY DASHBOARD
// ==========================================================
//
// Renders:
//
//      views/admin.ejs
//
// Data supplied to the view:
//
//      dairies
//      standaloneAssets
//
// Both collections contain MongoDB _id values.
//
// Therefore EJS can safely use:
//
//      /dairy/<%= dairy._id %>
//
// and:
//
//      /dairy/<%= asset._id %>
//
// ==========================================================

exports.getDairyDashboard =
    async (req, res, next) => {

        try {

            // ==================================================
            // GET ALL DAIRY DASHBOARD DATA
            // ==================================================

            const {

                dairies,

                standaloneAssets

            } =
                await dashboardService
                    .getDairyDashboardData();


            // ==================================================
            // RENDER ADMIN DASHBOARD
            // ==================================================

            return res.render(

                "admin",

                {

                    // ------------------------------------------
                    // PAGE TITLE
                    // ------------------------------------------

                    title:
                        "Admin Dashboard",


                    // ------------------------------------------
                    // CURRENT USER
                    // ------------------------------------------

                    user:
                        req.user,


                    // ------------------------------------------
                    // DAIRY FARMS
                    // ------------------------------------------

                    dairies,


                    // ------------------------------------------
                    // STANDALONE STRUCTURES / ASSETS
                    // ------------------------------------------

                    standaloneAssets

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