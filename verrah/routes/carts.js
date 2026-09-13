// =========================================================
// verrah/routes/carts.js
//
// CART ROUTES
// =========================================================

const express = require("express");

const router = express.Router();

const controller =
    require("../controllers/carts");

const requireLogin =
    require("../middleware/requireLogin");

const checkoutSubstation =
    require("../middleware/checkoutSubstation");


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
// CHECKOUT SUBMISSION
// POST /carts/checkout
// =========================================================

router.post(
    "/checkout",
    requireLogin,
    checkoutSubstation.saveSelection,
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
// PAYMENT PAGE
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
// CART DETAILS
// GET /carts/:id/details
//
// Renders:
// cart/cart-details.ejs
// =========================================================

router.get(
    "/:id/details",
    requireLogin,
    checkoutSubstation.load,
    controller.details
);


// =========================================================
// CHECKOUT PAGE
// GET /carts/:id
//
// Renders:
// cart/cart-checkout.ejs
//
// This must come AFTER the more specific routes above.
// =========================================================

router.get(
    "/:id",
    requireLogin,
    checkoutSubstation.load,
    controller.checkoutPage
);


// =========================================================
// REMOVE CART ITEM
// POST /carts/:id/remove
// =========================================================

router.post(
    "/:id/remove",
    requireLogin,
    controller.remove
);


module.exports = router;