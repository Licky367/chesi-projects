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
// Changes:
//
// isDeposited: false -> true
//
// OR
//
// isDeposited: true -> false
//
// Required params:
//
// req.params.substationId
// req.params.saleId
//
// ==========================================================

async function toggleDailyCashSaleDeposit(req, res) {
    try {

        const { substationId, saleId } = req.params;

        // --------------------------------------------------
        // VALIDATE SUBSTATION ID
        // --------------------------------------------------

        if (!mongoose.Types.ObjectId.isValid(substationId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid substation ID"
            });
        }

        // --------------------------------------------------
        // VALIDATE DAILY SALE ID
        // --------------------------------------------------

        if (!mongoose.Types.ObjectId.isValid(saleId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid daily cash sale ID"
            });
        }

        // --------------------------------------------------
        // FIND SUBSTATION
        // --------------------------------------------------

        const substation = await Substation.findById(substationId);

        if (!substation) {
            return res.status(404).json({
                success: false,
                message: "Substation not found"
            });
        }

        // --------------------------------------------------
        // FIND DAILY CASH SALE
        // --------------------------------------------------

        const dailySale = substation.dailyCashSales.id(saleId);

        if (!dailySale) {
            return res.status(404).json({
                success: false,
                message: "Daily cash sale not found"
            });
        }

        // --------------------------------------------------
        // TOGGLE DEPOSIT STATUS
        // --------------------------------------------------

        dailySale.isDeposited = !dailySale.isDeposited;

        // --------------------------------------------------
        // SAVE SUBSTATION
        // --------------------------------------------------

        await substation.save();

        // --------------------------------------------------
        // RESPONSE
        // --------------------------------------------------

        return res.status(200).json({
            success: true,
            message: dailySale.isDeposited
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