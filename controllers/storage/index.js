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
//     contents
//
// ==========================================================


const list =
    require("./list");

const add =
    require("./add");

const contents =
    require("./contents");


// ==========================================================
// EXPORT
// ==========================================================

module.exports = {

    list,

    form:
        add.form,

    create:
        add.create,

    contents,

    addItems:
        contents.addItems,

    omitItems:
        contents.omitItems,

    reshuffleItems:
        contents.reshuffleItems

};