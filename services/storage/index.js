// ==========================================================
// services/storage/index.js
// STORAGE SERVICE ENTRY POINT
// ==========================================================
//
// Combines:
//
//     list.js
//     add.js
//
// PUBLIC API:
//
//     normalizeType
//     getParentDairy
//     getStorage
//     getAllStorage
//     getRooms
//     getAgroStores
//     getStorageFacility
//     createStorage
//
// ==========================================================


const list =
    require("./list");

const add =
    require("./add");


// ==========================================================
// EXPORT
// ==========================================================
//
// Keep the exact same service API that the original
// storageService.js exposed.
//
// ==========================================================

module.exports = {

    // ======================================================
    // LIST / READ
    // ======================================================

    normalizeType:
        list.normalizeType,

    getParentDairy:
        list.getParentDairy,

    getStorage:
        list.getStorage,

    getAllStorage:
        list.getAllStorage,

    getRooms:
        list.getRooms,

    getAgroStores:
        list.getAgroStores,

    getStorageFacility:
        list.getStorageFacility,


    // ======================================================
    // ADD / CREATE
    // ======================================================

    createStorage:
        add.createStorage

};