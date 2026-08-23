// =========================================================
// controllers/update/index.js
// =========================================================
//
// UPDATE CONTROLLERS
// =========================================================
//
// Central export for all update-related controllers.
// ==========================================================

module.exports = {

    ...require("./projectController"),

    ...require("./pageController"),

    ...require("./profileController"),

    ...require("./postController"),

    ...require("./commentController"),

    ...require("./medicalController"),

    ...require("./maintenanceController"),

    ...require("./storageController"),

    ...require("./stockUpdateController"),

    ...require("./contentItemController"),

    ...require("./booleanController")

};