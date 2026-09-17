const express = require("express");

const router = express.Router();

const branchController =
    require("../controllers/branchController");


/* ========================================================
   BRANCH DETAILS
======================================================== */

// ==========================================================
// BRANCH PRODUCT DETAILS
// ==========================================================

router.get(
    "/:id/product/:productId",
    branchController.getBranchProduct
);


router.get(
    "/:id",
    branchController.getBranch
);


/* ========================================================
   EXPORT
======================================================== */

module.exports = router;