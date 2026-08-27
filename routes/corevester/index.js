// ==========================================================
// routes/corevester/index.js
// CORE VESTER HEALTHCARE
// PUBLIC HOME ROUTE
// ==========================================================

const express = require("express");

const router =
    express.Router();


// ==========================================================
// HOME
// ==========================================================
//
// GET /
//
// This is a PUBLIC page.
//
// No authentication middleware is used.
//
// ==========================================================

router.get(
    "/",
    (req, res, next) => {

        try {

            return res.render(
                "index",
                {
                    title:
                        "Core Vester Healthcare"
                }
            );

        } catch (error) {

            return next(error);

        }

    }
);


// ==========================================================
// EXPORT
// ==========================================================

module.exports =
    router;