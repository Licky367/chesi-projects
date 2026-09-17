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


const searchController =
    require("./search");


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    // --------------------------------------------------------
    // Product listing
    // --------------------------------------------------------

    list:
        listController.list,


    // --------------------------------------------------------
    // Product details
    // --------------------------------------------------------

    details:
        detailsController.details,


    // --------------------------------------------------------
    // Add to cart
    // --------------------------------------------------------

    addToCart:
        addToCartController.addToCart,


    // --------------------------------------------------------
    // Product search
    // --------------------------------------------------------

    search:
        searchController.search

};