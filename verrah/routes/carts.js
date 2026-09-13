// ==========================================================
// verrah/routes/carts.js
//
// CART ROUTES
// ==========================================================

const express = require("express");

const router = express.Router();

const controller =
    require("../controllers/carts");

const requireLogin =
    require("../middleware/requireLogin");

const checkoutSubstation =
    require("../middleware/checkoutSubstation");


// ==========================================================
// CART LIST
// GET /carts
// ==========================================================

router.get(
    "/",
    requireLogin,
    controller.list
);


// ==========================================================
// CHECKOUT PROCESS
// POST /carts/checkout
//
// The selected pickup substation is saved first.
// checkoutSubstation.saveSelection then passes
// control to controller.checkout.
// ==========================================================

router.post(
    "/checkout",
    requireLogin,
    checkoutSubstation.saveSelection,
    controller.checkout
);


// ==========================================================
// STAFF SALE
// POST /carts/staff-sale
// ==========================================================

router.post(
    "/staff-sale",
    requireLogin,
    controller.staffSale
);


// ==========================================================
// PAYMENT PAGE
// GET /carts/payment/:id
// ==========================================================

router.get(
    "/payment/:id",
    requireLogin,
    controller.paymentPage
);


// ==========================================================
// PAYMENT STATUS
// GET /carts/payment/:id/status
// ==========================================================

router.get(
    "/payment/:id/status",
    requireLogin,
    controller.paymentStatus
);


// ==========================================================
// CART ITEM DETAILS
// GET /carts/:id/details
// ==========================================================

router.get(
    "/:id/details",
    requireLogin,
    checkoutSubstation.load,
    controller.details
);


// ==========================================================
// REMOVE CART ITEM
// POST /carts/:id/remove
// ==========================================================

router.post(
    "/:id/remove",
    requireLogin,
    controller.remove
);


// ==========================================================
// CHECKOUT PAGE
// GET /carts/:id
//
// This is the checkout page.
// ==========================================================

router.get(
    "/:id",
    requireLogin,
    checkoutSubstation.load,
    controller.checkoutPage
);


// ==========================================================
// EXPORT ROUTER
// ==========================================================

module.exports = router;