const express = require("express");

const router = express.Router();

const controller = require("../controllers/packages");

const requireLogin = require("../middleware/requireLogin");
const requireStaffOrAdmin = require("../middleware/requireStaffOrAdmin");
const packageSubstationAccess = require("../middleware/packageSubstationAccess");


router.get(
    "/staff",
    requireStaffOrAdmin,
    packageSubstationAccess.filterStaffList,
    controller.staffList
);


router.get(
    "/staffDirect",
    requireStaffOrAdmin,
    packageSubstationAccess.filterStaffList,
    controller.staffDirectSells
);


router.post(
    "/staff/cash",
    requireStaffOrAdmin,
    controller.markCash
);


router.get(
    "/staff/:id",
    requireStaffOrAdmin,
    packageSubstationAccess.guardStaffDetails,
    controller.staffDetails
);


router.post(
    "/staff/:id/confirm",
    requireStaffOrAdmin,
    controller.confirm
);


router.post(
    "/staff/:id/deliver",
    requireStaffOrAdmin,
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
