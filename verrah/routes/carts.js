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
// CHECKOUT PAGE
// GET /carts/:id/checkout
//
// Renders:
// cart/cart-checkout.ejs
//
// The selected cart item is identified by :id.
// The controller loads the cart, item, total,
// substations and previous pickup station.
// =========================================================

router.get(
    "/:id/checkout",
    requireLogin,
    checkoutSubstation.load,
    controller.checkout
);


// =========================================================
// CHECKOUT
// POST /carts/checkout
//
// The customer must select a pickup substation first.
// The selection is saved to User.pickupStation before
// either payment path is executed.
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
// REMOVE CART ITEM
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
//
// Renders:
// cart/cart-details.ejs
// =========================================================

router.get(
    "/:id",
    requireLogin,
    checkoutSubstation.load,
    controller.details
);


module.exports = router;