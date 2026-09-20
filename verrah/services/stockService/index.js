// ==========================================================
// services/stockService/
// STOCK SERVICE ENTRY POINT
//
// This directory contains the same stock-service logic split
// into smaller manageable modules. index.js remains the
// service entry point so existing require("../services/stockService")
// imports continue to work.
// ==========================================================

module.exports = {
    ...require("./queries"),
    ...require("./stockCrud"),
    ...require("./allocation"),
    ...require("./batchEdit")
};