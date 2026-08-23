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
//      FARM RULE:
//          code < 0
//
// 2. standaloneAssets
//      = active Dairy records that lack BOTH:
//
//          assetCode
//          code
//
// STANDALONE ASSET RULE
// ----------------------------------------------------------
//
// A standalone asset is an active Dairy document where:
//
//      assetCode is null / missing
//
// AND
//
//      code is null / missing
//
// Therefore:
//
//      Farm:
//          code < 0
//          EXCLUDED
//
//      Animal:
//          code > 0
//          EXCLUDED
//
//      Asset with assetCode:
//          EXCLUDED
//
//      Standalone asset:
//          code = null/missing
//          assetCode = null/missing
//          INCLUDED
//
// MongoDB _id is preserved for every record.
//
// ==========================================================


const Dairy =
    require("../models/dairy");


// ==========================================================
// GET DAIRIES FOR DASHBOARD
// ==========================================================
//
// Returns ALL active Dairy Farm records.
//
// FARM RULE:
//
//      code < 0
//
// Every active Dairy document with a negative numeric code
// is treated as a Dairy Farm.
//
// ==========================================================

exports.getDairiesForDashboard =
    async function () {

        const dairies =
            await Dairy
                .find({

                    status: "active",

                    code: {
                        $lt: 0
                    }

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
// Returns ALL active standalone Dairy records.
//
// STANDALONE ASSET RULE:
//
//      assetCode = null / missing
//
// AND
//
//      code = null / missing
//
// IMPORTANT
// ----------------------------------------------------------
//
// We deliberately do NOT use:
//
//      recordType: "structure"
//
// The identity of a standalone asset is determined by the
// absence of BOTH assetCode and code.
//
// MongoDB:
//
//      field: null
//
// matches both:
//
//      field === null
//
// and documents where the field does not exist.
//
// Therefore:
//
//      assetCode: null
//      code: null
//
// means the document lacks both identifiers.
//
// ==========================================================

exports.getStandaloneAssets =
    async function () {

        const standaloneAssets =
            await Dairy
                .find({

                    status: "active",

                    assetCode: null,

                    code: null

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
// Convenience method for the dashboard controller.
//
// Retrieves:
//
//      dairies
//      standaloneAssets
//
// in parallel.
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

        ] =
            await Promise.all([

                exports.getDairiesForDashboard(),

                exports.getStandaloneAssets()

            ]);


        return {

            dairies,

            standaloneAssets

        };

    };