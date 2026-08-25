// ==========================================================
// services/update/index.js
// ========================================================
//
// UPDATE SERVICES
// ========================================================
//
// Central export for all update-related services.
// ==========================================================

module.exports = {

    ...require("./projectService"),

    ...require("./pageService"),

    ...require("./profileService"),

    ...require("./commentService"),

    ...require("./postService"),

    ...require("./medicalService"),

    ...require("./maintenanceService"),

    ...require("./itemLink"),

    ...require("./stockUpdateService"),

    ...require("./contentItemService"),

    ...require("./booleanService"),

    ...require("./addOns")

};