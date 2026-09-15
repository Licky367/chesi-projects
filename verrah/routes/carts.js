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
// PAYMENT MODE
// POST /carts/payment-mode
//
// Staff selects:
//
//     Cash  -> isMobile = false
//     M-PESA -> isMobile = true
//
// This only updates the cart payment mode.
// ==========================================================

router.post(
    "/payment-mode",
    requireLogin,
    controller.updatePaymentMode
);


// ==========================================================
// CHECKOUT PROCESS
// POST /carts/checkout
//
// Existing checkout flow.
// ==========================================================

router.post(
    "/checkout",
    requireLogin,
    checkoutSubstation.saveSelection,
    controller.checkout
);


// ==========================================================
// STAFF CASH SALE
// POST /carts/staff-sale
//
// Used by staff when:
//
//     isMobile = false
//
// The salesName is submitted from the
// staff sales popup.
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
// M-PESA CHECKOUT
// POST /carts/:id
//
// Used by staff when:
//
//     isMobile = true
//
// The staff popup submits:
//
//     salesName
//
// to this route.
//
// IMPORTANT:
// This must come BEFORE the GET /:id route,
// but AFTER the more specific routes above.
// ==========================================================

router.post(
    "/:id",
    requireLogin,
    checkoutSubstation.saveSelection,
    controller.checkout
);


// ==========================================================
// CHECKOUT PAGE
// GET /carts/:id
//
// Displays the checkout page.
//
// Staff + M-PESA can also arrive here through
// the normal checkout flow after the POST above.
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