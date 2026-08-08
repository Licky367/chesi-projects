const liabilityService = require("../services/liabilityService");


/* =========================================================
   SHOW LIABILITY PAGE
========================================================= */

exports.showLiabilityPage = async (req, res) => {

    try {

        return res.render("liability");

    } catch (error) {

        console.error(
            "Liability page error:",
            error
        );

        return res.status(500).send(
            "Unable to load liability page"
        );

    }

};


/* =========================================================
   CREATE LIABILITY
========================================================= */

exports.createLiability = async (req, res) => {

    try {

        const {
            type,
            amount,
            description
        } = req.body;


        /* =====================================================
           BASIC VALIDATION
        ====================================================== */

        if (!type || !type.trim()) {

            return res.status(400).send(
                "Liability type is required"
            );

        }


        if (
            amount === undefined ||
            amount === null ||
            amount === ""
        ) {

            return res.status(400).send(
                "Liability amount is required"
            );

        }


        const numericAmount = Number(amount);


        if (
            !Number.isFinite(numericAmount) ||
            numericAmount < 0
        ) {

            return res.status(400).send(
                "Invalid liability amount"
            );

        }


        if (
            !description ||
            !description.trim()
        ) {

            return res.status(400).send(
                "Liability description is required"
            );

        }


        /* =====================================================
           SAVE LIABILITY
        ====================================================== */

        await liabilityService.createLiability({

            type: type.trim(),

            amount: numericAmount,

            description: description.trim()

        });


        /* =====================================================
           REDIRECT
        ====================================================== */

        return res.redirect(
            "/financials/liabilitysummary"
        );

    } catch (error) {

        console.error(
            "Create liability error:",
            error
        );

        return res.status(500).send(
            "Unable to save liability"
        );

    }

};


/* =========================================================
   SHOW LIABILITY SUMMARY
========================================================= */

exports.showLiabilitySummary = async (req, res) => {

    try {

        const liabilities =
            await liabilityService.getLiabilitySummary();


        return res.render(
            "liabilitysummary",
            {
                liabilities
            }
        );

    } catch (error) {

        console.error(
            "Liability summary error:",
            error
        );

        return res.status(500).send(
            "Unable to load liability summary"
        );

    }

};