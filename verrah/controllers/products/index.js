// ==========================================================
// controllers/products/index.js
// PRODUCT CONTROLLERS
// ==========================================================

const listController =
    require("./list");

const detailsController =
    require("./details");

const addToCartController =
    require("./addToCart");


module.exports = {

    list:
        listController.list,

    details:
        detailsController.details,

    addToCart:
        addToCartController.addToCart

};