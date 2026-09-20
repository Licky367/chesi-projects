const express = require("express");

const router = express.Router();

const controller =
    require("../controllers/packages");

const requireLogin =
    require("../middleware/requireLogin");

const requireStaffOrAdmin =
    require("../middleware/requireStaffOrAdmin");

const requireStaff =
    require("../middleware/requireStaff");

const packageSubstationAccess =
    require("../middleware/packageSubstationAccess");


// =========================================================
// STAFF PACKAGE LIST
// GET /packages/staff
//
// Displays normal packages where the package owner is NOT
// a staff user.
//
// For staff, pending packages are filtered by the staff
// member's assignedSubstation against packageSubstation.
// =========================================================

router.get(
    "/staff",
    requireStaffOrAdmin,
    packageSubstationAccess.filterStaffList,
    controller.staffList
);


// =========================================================
// STAFF DIRECT SELL PACKAGE LIST
// GET /packages/staffDirect
//
// Displays packages where the package owner is a staff user.
//
// This renders:
// packages/staffDirectSells.ejs
//
// The controller is responsible for determining:
// isDirectSell === true
// =========================================================

router.get(
    "/staffDirect",
    requireStaffOrAdmin,
    packageSubstationAccess.filterStaffList,
    controller.staffDirectSells
);


// =========================================================
// CHANGE PACKAGE TO CASH
// POST /packages/staff/cash
//
// Changes a package with arrears to:
//     isCash = true
//
// This route MUST be declared before /staff/:id.
// Otherwise "cash" could be interpreted as a package ID.
// =========================================================

router.post(
    "/staff/cash",
    requireStaffOrAdmin,
    controller.markCash
);


// =========================================================
// STAFF PACKAGE DETAILS
// GET /packages/staff/:id
//
// Staff cannot open a pending package belonging to another
// pickup substation.
// =========================================================

router.get(
    "/staff/:id",
    requireStaffOrAdmin,
    packageSubstationAccess.guardStaffDetails,
    controller.staffDetails
);


router.post(
    "/staff/:id/confirm",
    requireStaff,
    controller.confirm
);


router.post(
    "/staff/:id/deliver",
    requireStaff,
    controller.deliver
);


router.post(
    "/staff/:id/payment",
    requireStaffOrAdmin,
    controller.recordPayment
);


router.post(
    "/staff/:id/clear",
    requireStaffOrAdmin,
    controller.clear
);


// =========================================================
// CLIENT PACKAGE HISTORY
// =========================================================

router.get(
    "/",
    requireLogin,
    controller.list
);


router.get(
    "/:id",
    requireLogin,
    controller.details
);


router.post(
    "/:id/pay",
    requireLogin,
    controller.pay
);


module.exports = router;