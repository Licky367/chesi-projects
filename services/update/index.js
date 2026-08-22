// ==========================================================
// services/update/index.js
// =====================================================

module.exports = {

    ...require("./projectService"),

    ...require("./pageService"),

    ...require("./profileService"),

    ...require("./commentService"),

    ...require("./postService"),

    ...require("./medicalService"),

    ...require("./maintenanceService"),

    ...require("./itemLink")

};