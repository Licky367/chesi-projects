// ==========================================================
// services/update/index.js
// UPDATE SERVICES INDEX
// ==========================================================

module.exports = {
    ...require("./itemLink"),

    ...require("./projectService"),

    ...require("./pageService"),

    ...require("./profileService"),

    ...require("./commentService"),

    ...require("./postService"),

    ...require("./medicalService"),

    ...require("./maintenanceService")

};