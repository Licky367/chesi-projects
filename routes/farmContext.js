// ==========================================================
// routes/farmContext.js
// ==========================================================

const express =
    require("express");

const router =
    express.Router();

const farmContextController =
    require("../controllers/farmContextController");


// ==========================================================
// SWITCH ACTIVE FARM
// ==========================================================

router.post(
    "/switch",
    farmContextController.switchFarm
);


module.exports =
    router;