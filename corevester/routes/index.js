// ==========================================================
// routes/index.js
// COREVESTER ONLINE STORE ROUTES
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
//
// Public storefront routes for Corevester Investments Limited.
//
// Corevester is an ONLINE MEDICAL EQUIPMENT & HEALTHCARE
// SUPPLIES BUSINESS.
//
// This router is responsible for the public storefront,
// beginning with:
//
//     GET /
//
// ==========================================================

const express = require("express");

const router = express.Router();


// ==========================================================
// HOME
// ==========================================================
//
// GET
// /
//
// Render the Corevester online medical-equipment storefront.
//
// View:
//
//     views/index.ejs
//
// ==========================================================

router.get("/", (req, res) => {

    res.render("index", {
        user: req.user || null
    });

});


// ==========================================================
// EXPORT
// ==========================================================

module.exports = router;