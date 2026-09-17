// ==========================================================
// controllers/branch/index.js
// VERRAH COSMETICS
// BRANCH / SUBSTATION CONTROLLER
// ==========================================================
//
// RESPONSIBILITIES:
//
//     • Export branch/substation controllers
//     • Keep controller imports clean
//
// ==========================================================


const branchController =
    require("./getBranch");

const branchProductController =
    require("./getBranchProduct");


// ==========================================================
// EXPORT CONTROLLERS
// ==========================================================

module.exports = {

    // --------------------------------------------------------
    // BRANCH / SUBSTATION
    // --------------------------------------------------------

    getBranch:
        branchController.getBranch,


    // --------------------------------------------------------
    // BRANCH / SUBSTATION PRODUCT
    // --------------------------------------------------------

    getBranchProduct:
        branchProductController.getBranchProduct
};