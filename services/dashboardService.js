// ==========================================================
// services/dashboardService.js
// DASHBOARD SERVICES
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
//
// Supplies dashboard data to the dashboard controllers.
//
// For the Dairy Dashboard:
//
//     Dairy documents are retrieved from MongoDB.
//
// The complete MongoDB _id is preserved so that the frontend
// can directly use:
//
//     dairy._id
//
// No attempt is made to construct an ID from:
//
//     code
//     assetCode
//     roomNumber
//     dwellNumber
//
// ==========================================================


const Dairy =
    require("../models/dairy");


// ==========================================================
// GET DAIRIES FOR DAIRY DASHBOARD
// ==========================================================
//
// Returns Dairy records for the dashboard.
//
// IMPORTANT:
//
// .lean() preserves the MongoDB _id:
//
//     {
//         _id: "...",
//         name: "...",
//         ...
//     }
//
// The frontend can therefore use:
//
//     dairy._id
//
// ==========================================================

exports.getDairiesForDashboard =
    async function () {

        const dairies =
            await Dairy.find({

                status: "active"

            })
            .sort({

                name: 1

            })
            .lean();


        return dairies;

    };