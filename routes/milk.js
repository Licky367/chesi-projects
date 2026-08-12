// ==========================================================
// routes/milk.js
// ==========================================================

const express = require("express");

const router = express.Router();

const milkController = require("../controllers/milkController");


// ==========================================================
// AUTHENTICATION
// ==========================================================

function requireLogin(req, res, next) {

    if (
        req.session &&
        req.session.user
    ) {

        return next();

    }

    return res.redirect("/login");

}


// ==========================================================
// MILK COLLECTION PAGE
// ==========================================================

router.get(
    "/milk",
    requireLogin,
    milkController.getMilkPage
);


// ==========================================================
// SAVE MILK RECORD
// ==========================================================
//
// Used by the individual forms in milk.ejs:
//
// POST /milk
//
// Fields:
// - dairy
// - session
// - liters
// - remarks
//

router.post(
    "/milk",
    requireLogin,
    milkController.submitMilk
);


// ==========================================================
// EDIT MILK RECORD
// ==========================================================
//
// Used by the admin edit modal:
//
// POST /milk/:recordId
//
// Fields:
// - liters
// - remarks
//

router.post(
    "/milk/:recordId",
    requireLogin,
    milkController.updateMilkRecord
);


// ==========================================================
// EXPORT
// ==========================================================

module.exports = router;