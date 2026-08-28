// =========================================================
// routes/corevester/products.js
// =========================================================
//
// COREVESTER MARKETPLACE ROUTES
//
// PUBLIC / USER:
//     GET  /products
//     GET  /products/:id
//
// CART:
//     POST /products/add-to-cart
//     POST /products/update-cart-qty
//     POST /products/remove-from-cart
//
// ADMIN:
//     POST   /admin/products/create
//     DELETE /admin/products/:id
//
// =========================================================

const express = require("express");

const router = express.Router();

const productsController =
    require("../../controllers/corevester/productsController");


// =========================================================
// OPTIONAL AUTH HELPERS
// =========================================================
//
// The marketplace itself can be viewed without forcing an
// authentication middleware here.
//
// Cart identity is handled by productsController using:
//     req.user._id
//     req.sessionID
//
// Admin operations are protected locally below.
// =========================================================


function requireAdmin(req, res, next) {

    try {

        if (!req.user) {

            return res.status(401).json({
                success: false,
                message: "Login required."
            });

        }

        if (req.user.role !== "admin") {

            return res.status(403).json({
                success: false,
                message: "Administrator access required."
            });

        }

        next();

    } catch (error) {

        console.error(
            "❌ requireAdmin ERROR:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Unable to verify administrator access."
        });

    }

}


// =========================================================
// MARKETPLACE
// =========================================================

router.get(
    "/products",
    productsController.productsPage
);


// =========================================================
// PRODUCT DETAILS
// =========================================================
//
// IMPORTANT:
// This must remain after /products and before any generic
// /products route that might capture the ID.
// =========================================================

router.get(
    "/products/:id",
    productsController.productDetails
);


// =========================================================
// CART
// =========================================================

router.post(
    "/products/add-to-cart",
    productsController.addToCart
);


router.post(
    "/products/update-cart-qty",
    productsController.updateCartQty
);


router.post(
    "/products/remove-from-cart",
    productsController.removeFromCart
);


// =========================================================
// ADMIN — CREATE MARKET PRODUCT
// =========================================================
//
// Matches the product-entry EJS:
//
// POST /admin/products/create
//
// Body:
//     name
//     category
//     units
//     unitSellPrice
//     image
//
// =========================================================

router.post(
    "/admin/products/create",
    requireAdmin,
    productsController.createProduct
);


// =========================================================
// ADMIN — REMOVE MARKET PRODUCT
// =========================================================
//
// Matches:
//
// DELETE /admin/products/:id
//
// =========================================================

router.delete(
    "/admin/products/:id",
    requireAdmin,
    productsController.deleteProduct
);


// =========================================================
// EXPORT
// =========================================================

module.exports = router;