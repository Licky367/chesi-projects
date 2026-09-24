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
// ==========================================================

async function toggleDailyCashSaleDeposit(req, res) {

    try {

        const { id } = req.params;


        // --------------------------------------------------
        // VALIDATE DAILY CASH SALE ID
        // --------------------------------------------------

        if (!mongoose.Types.ObjectId.isValid(id)) {

            return res.redirect(
                "/deposit?error=Invalid%20daily%20cash%20sale%20ID"
            );

        }


        // --------------------------------------------------
        // FIND SUBSTATION CONTAINING THE DAILY SALE
        // --------------------------------------------------

        const substation =
            await Substation.findOne({
                "dailyCashSales._id": id
            });


        if (!substation) {

            return res.redirect(
                "/deposit?error=Daily%20cash%20sale%20not%20found"
            );

        }


        // --------------------------------------------------
        // FIND EMBEDDED DAILY CASH SALE
        // --------------------------------------------------

        const dailySale =
            substation.dailyCashSales.id(id);


        if (!dailySale) {

            return res.redirect(
                "/deposit?error=Daily%20cash%20sale%20not%20found"
            );

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
        // REDIRECT AFTER SUCCESS
        // --------------------------------------------------

        return res.redirect(
            `/deposit`
        );


    } catch (error) {

        console.error(
            "toggleDailyCashSaleDeposit error:",
            error
        );


        return res.redirect(
            "/deposit?error=Failed%20to%20change%20deposit%20status"
        );

    }

}


// ==========================================================
// EXPORT
// ==========================================================

module.exports = {
    toggleDailyCashSaleDeposit
};