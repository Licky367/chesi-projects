// ==========================================================
// services/dashboardService.js
// DASHBOARD SERVICES
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
//
// Supplies dashboard data to dashboard controllers.
//
// DAIRY DASHBOARD DATA
// ----------------------------------------------------------
//
// 1. dairies
//      = active Dairy Farm records
//
// 2. standaloneAssets
//      = active standalone structures/assets
//
// Standalone assets are identified by:
//
//      recordType = "structure"
//      code       = null
//      assetCode  = null
//
// MongoDB _id is preserved for every record so the EJS views
// can safely create links such as:
//
//      /dairy/:id
//
// ==========================================================


const Dairy =
    require("../models/dairy");


// ==========================================================
// GET DAIRIES FOR DAIRY DASHBOARD
// ==========================================================
//
// Returns active Dairy Farm records.
//
// IMPORTANT:
//
// This specifically retrieves:
//
//      recordType = "farm"
//
// It does NOT mix animals or structures into the main
// Dairy Farms list.
//
// ==========================================================

exports.getDairiesForDashboard =
    async function () {

        const dairies =
            await Dairy
                .find({

                    recordType: "farm",

                    status: "active"

                })
                .sort({

                    name: 1

                })
                .lean();


        return dairies;

    };


// ==========================================================
// GET STANDALONE ASSETS
// ==========================================================
//
// Returns standalone structures/assets.
//
// CANONICAL DEFINITION
// ----------------------------------------------------------
//
// Standalone asset:
//
//      recordType = "structure"
//      code       = null
//      assetCode  = null
//
// Examples may include:
//
//      machine
//      equipment
//      tool
//      building
//      cowshed
//      milkingParlour
//      hayShed
//      waterSystem
//      fencing
//      vehicle
//      generator
//      solarSystem
//      feedStore
//      feeds
//      room
//      agroStore
//      other
//
// IMPORTANT:
//
// _id is preserved because the frontend uses it for:
//
//      /dairy/:id
//
// ==========================================================

exports.getStandaloneAssets =
    async function () {

        const standaloneAssets =
            await Dairy
                .find({

                    recordType: "structure",

                    code: null,

                    assetCode: null,

                    status: "active"

                })
                .sort({

                    name: 1

                })
                .lean();


        return standaloneAssets;

    };


// ==========================================================
// GET DAIRY DASHBOARD DATA
// ==========================================================
//
// Convenience method.
//
// Retrieves everything required by:
//
//      views/admin.ejs
//
// This keeps the controller clean.
//
// Returned object:
//
//      {
//          dairies,
//          standaloneAssets
//      }
//
// ==========================================================

exports.getDairyDashboardData =
    async function () {

        const [

            dairies,

            standaloneAssets

        ] = await Promise.all([

            exports.getDairiesForDashboard(),

            exports.getStandaloneAssets()

        ]);


        return {

            dairies,

            standaloneAssets

        };

    };