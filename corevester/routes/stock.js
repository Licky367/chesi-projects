// =========================================================
// routes/stock.js
// =========================================================
//
// Mount this router at:
//     app.use("/stock", require("./routes/stock"));
//
// Then:
//     GET  /stock       -> stock.ejs
//     GET  /stock/new   -> product-entry.ejs
//     POST /stock       -> create Product + Stock
//     GET  /stock/:id   -> stock-entry.ejs
//     POST /stock/:id   -> update Product + Stock
// =========================================================
const express = require("express");
const router = express.Router();
const controller = require("../controllers/stock");

router.get("/", controller.list);
router.get("/new", controller.newProductForm);
router.post("/", controller.createProduct);
router.get("/:id", controller.entry);
router.post("/:id", controller.update);

module.exports = router;
