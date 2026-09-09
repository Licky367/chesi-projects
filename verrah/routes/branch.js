const express = require("express");

const router = express.Router();

const branchController =
    require("../controllers/branchController");


/* ========================================================
   BRANCH DETAILS
======================================================== */

router.get(
    "/branch/:id",
    branchController.getBranch
);


/* ========================================================
   EXPORT
======================================================== */

module.exports = router;