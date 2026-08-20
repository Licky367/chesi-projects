// ==========================================================
// controllers/storage/index.js
// STORAGE CONTROLLER ENTRY POINT
// ==========================================================
//
// Combines:
//
//     list
//     add.form
//     add.create
//
// ==========================================================


const list =
    require("./list");

const add =
    require("./add");


// ==========================================================
// EXPORT
// ==========================================================

module.exports = {

    list,

    form:
        add.form,

    create:
        add.create

};