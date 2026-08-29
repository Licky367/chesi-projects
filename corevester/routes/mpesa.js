// =========================================================
// routes/mpesa.js
// DARAJA CALLBACK
// =========================================================
const express = require("express");
const router = express.Router();
const controller = require("../controllers/carts");

// Safaricom calls this endpoint server-to-server.
router.post("/callback", express.json(), controller.mpesaCallback);

module.exports = router;
