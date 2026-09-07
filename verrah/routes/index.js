const express = require("express");

const router = express.Router();

const indexController = require("../controllers/indexController");

/* =========================================================
   HOME PAGE
========================================================= */

router.get("/", indexController.getHome);

/* =========================================================
   EXPORT
========================================================= */

module.exports = router;