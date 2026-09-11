// =========================================================
// routes/carts.js
// =========================================================

const express = require("express");

const router = express.Router();

const controller =
    require("../controllers/carts");

const requireLogin =
    require("../middleware/requireLogin");


// =========================================================
// CART LIST
// GET /carts
// =========================================================

router.get(
    "/",
    requireLogin,
    controller.list
);


// =========================================================
// CHECKOUT
// POST /carts/checkout
// =========================================================

router.post(
    "/checkout",
    requireLogin,
    controller.checkout
);


// =========================================================
// STAFF SALE
// POST /carts/staff-sale
// =========================================================

router.post(
    "/staff-sale",
    requireLogin,
    controller.staffSale
);


// =========================================================
// PAYMENT
// GET /carts/payment/:id
// =========================================================

router.get(
    "/payment/:id",
    requireLogin,
    controller.paymentPage
);


// =========================================================
// PAYMENT STATUS
// GET /carts/payment/:id/status
// =========================================================

router.get(
    "/payment/:id/status",
    requireLogin,
    controller.paymentStatus
);


// =========================================================
// REMOVE CART
// POST /carts/:id/remove
// =========================================================

router.post(
    "/:id/remove",
    requireLogin,
    controller.remove
);


// =========================================================
// CART DETAILS
// GET /carts/:id
// =========================================================

router.get(
    "/:id",
    requireLogin,
    controller.details
);


module.exports = router;