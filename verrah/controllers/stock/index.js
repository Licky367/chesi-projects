const {list} = require("./list");
const {newStockForm} = require("./forms");
const {createOrUpdateStock} = require("./create-update");
const {entry, createProduct} = require("./allocation");

exports.list = list;
exports.newStockForm = newStockForm;
exports.createOrUpdateStock = createOrUpdateStock;
exports.entry = entry;
exports.createProduct = createProduct;
