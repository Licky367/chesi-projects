// ==========================================================
// verrah/controllers/dailyCashSales.js
// VERRAH COSMETICS
// DAILY CASH SALE DEPOSIT CONTROLLER
// ==========================================================

const mongoose = require("mongoose");
const Substation = require("../models/substations");

// ==========================================================
// TOGGLE DAILY CASH SALE DEPOSIT STATUS
// ==========================================================
//
// URL:
//
// POST /deposit/:id/toggleDeposit
//
// The :id is the _id of the embedded dailyCashSales record.
//
// Example:
//
// dailyCashSales: [
//     {
//         _id: ObjectId("..."),
//         amount: 18500,
//         date: Date("2026-09-21"),
//         isDeposited: false
//     }
// ]
//
// ==========================================================

async function toggleDailyCashSaleDeposit(req, res) {
    try {

        const { id } = req.params;


        // --------------------------------------------------
        // VALIDATE DAILY CASH SALE ID
        // --------------------------------------------------

        if (!mongoose.Types.ObjectId.isValid(id)) {

            return res.status(400).json({
                success: false,
                message: "Invalid daily cash sale ID"
            });

        }


        // --------------------------------------------------
        // FIND THE SUBSTATION CONTAINING THE DAILY SALE
        // --------------------------------------------------

        const substation =
            await Substation.findOne({
                "dailyCashSales._id": id
            });


        if (!substation) {

            return res.status(404).json({
                success: false,
                message: "Daily cash sale not found"
            });

        }


        // --------------------------------------------------
        // FIND THE EMBEDDED DAILY CASH SALE
        // --------------------------------------------------

        const dailySale =
            substation.dailyCashSales.id(id);


        if (!dailySale) {

            return res.status(404).json({
                success: false,
                message: "Daily cash sale not found"
            });

        }


        // --------------------------------------------------
        // TOGGLE DEPOSIT STATUS
        // --------------------------------------------------

        dailySale.isDeposited =
            !dailySale.isDeposited;


        // --------------------------------------------------
        // SAVE SUBSTATION
        // --------------------------------------------------

        await substation.save();


        // --------------------------------------------------
        // RESPONSE
        // --------------------------------------------------

        return res.status(200).json({

            success: true,

            message:
                dailySale.isDeposited
                    ? "Daily cash sale marked as deposited"
                    : "Daily cash sale marked as not deposited",

            sale: {
                _id: dailySale._id,
                amount: dailySale.amount,
                date: dailySale.date,
                isDeposited: dailySale.isDeposited
            }

        });

    } catch (error) {

        console.error(
            "toggleDailyCashSaleDeposit error:",
            error
        );


        return res.status(500).json({
            success: false,
            message: "Failed to change deposit status"
        });

    }
}


// ==========================================================
// EXPORT
// ==========================================================

module.exports = {
    toggleDailyCashSaleDeposit
};