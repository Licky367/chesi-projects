// ==========================================================
// controllers/storage/index.js
// STORAGE CONTROLLER INDEX
// ==========================================================
//
// Combines:
//
//     list.js
//     storage.js
//
// Route handlers:
//
//     GET  /storage/:id
//     GET  /storage/:id/add
//     POST /storage/:id/add
//
// IMPORTANT:
//
//     :id = parent Dairy._id
//
// ==========================================================


const listController =
    require("./list");

const storageController =
    require("./storage");


// ==========================================================
// EXPORT
// ==========================================================

module.exports = {

    // ======================================================
    // GET /storage/:id
    // ======================================================

    list:
        listController.list,


    // ======================================================
    // GET /storage/:id/add
    // ======================================================

    form:
        storageController.form,


    // ======================================================
    // POST /storage/:id/add
    // ======================================================

    create:
        storageController.create

};