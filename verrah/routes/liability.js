const express = require("express");

const router = express.Router();

const liabilityController = require("../controllers/liability");


// ==========================================================
// LIABILITY PAGE
// ==========================================================

router.get(
    "/",
    liabilityController.index
);


// ==========================================================
// RECORD LIABILITY
// ==========================================================

router.post(
    "/",
    liabilityController.create
);


module.exports = router;