const express =
  require("express");

const router =
  express.Router();

const cartsController =
  require("../controllers/carts");

const mpesaController =
  require("../controllers/mpesa");

// Existing STK callback.
router.post(
  "/callback",
  express.json(),
  cartsController.mpesaCallback
);

// Transaction Status result callback.
router.post(
  "/transaction-result",
  express.json(),
  mpesaController.transactionResult
);

// Transaction Status timeout callback.
router.post(
  "/transaction-timeout",
  express.json(),
  mpesaController.transactionTimeout
);

module.exports =
  router;
