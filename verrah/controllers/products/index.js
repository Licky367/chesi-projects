// ==========================================================
// controllers/products/index.js
// PRODUCT CONTROLLERS
// ==========================================================

const listController =
    require("./list");


const detailsController =
    require("./details");

const updateController =
    require("./details");

const addToCartController =
    require("./addToCart");

const addManyToCartController =
    require("./addManyToCart");


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
    // Product listing
    // --------------------------------------------------------

    updateProduct:
        updateController.updateProduct,




    // --------------------------------------------------------
    // Add to cart
    // --------------------------------------------------------

    addToCart:
        addToCartController.addToCart,




    addManyToCart:
        addToCartController.addManyToCart,



    // --------------------------------------------------------
    // Product search
    // --------------------------------------------------------

    search:
        searchController.search

};