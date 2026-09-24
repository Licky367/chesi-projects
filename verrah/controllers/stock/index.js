const {
    list
} = require("./list");

const {
    newStockForm
} = require("./forms");

const {
    createOrUpdateStock
} = require("./create-update");

const {
    entry,
    createProduct
} = require("./allocation");

const {
    batches,
    batch,
    editBatches
} = require("./batch");

const {
    createFifoBatch
} = require("./createFifoBatch");


// ==========================================================
// EXPORTS
// ==========================================================

exports.list =
    list;

exports.newStockForm =
    newStockForm;

exports.createOrUpdateStock =
    createOrUpdateStock;

exports.entry =
    entry;

exports.createProduct =
    createProduct;

exports.batches =
    batches;

exports.batch =
    batch;

exports.editBatches =
    editBatches;

exports.createFifoBatch =
    createFifoBatch;