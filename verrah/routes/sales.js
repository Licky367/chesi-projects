// ==========================================================
// verrah/routes/sales.js
//
// VERRAH COSMETICS
// SALES / ANALYTICS ROUTES
//
// Mount in server-verrah.js with:
//
// const salesRoutes = require("./routes/sales");
// app.use("/sales", salesRoutes);
//
// Authentication/authorization can be applied here if
// required by the existing application.
// ==========================================================

const express = require("express");

const router = express.Router();

const controller =
    require("../controllers/sales");


router.get(
    "/",
    controller.index
);


module.exports = router;
