// ==========================================================
// verrah/services/substationService/index.js
// SUBSTATION SERVICE ENTRY
// ==========================================================

module.exports = {
    ...require("./list"),
    ...require("./create"),
    ...require("./getById"),
    ...require("./getWithProducts"),
    ...require("./getProduct"),
    ...require("./search"),
    ...require("./update"),
    ...require("./updateIcon"),
    ...require("./updateImages"),
    ...require("./updateProductUnits")
};