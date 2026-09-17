// ==========================================================
// verrah/services/products/index.js
// PRODUCT SERVICE ENTRY POINT
// ==========================================================

const {
    getProductsByCategory
} =
    require("./list");


const {
    getProduct
} =
    require("./details");


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    getProductsByCategory,

    getProduct

};