const express = require("express");

const router = express.Router();

/* =========================================================
HOME PAGE
========================================================= */

router.get("/", (req, res) => {

res.render("index", {

    title: "VERAH COSMETICS"

});

});

/* =========================================================
EXPORT
========================================================= */

module.exports = router;