// ==========================================================
// services/storage/add.js
// STORAGE SERVICE INDEX
// ==========================================================
//
// PUBLIC STORAGE SERVICE API
//
// Combines:
//
//     list.js
//     add.js
//
// This file preserves the original service interface.
//
// ==========================================================


const listService =
    require("./list");

const storageService =
    require("./add");


// ==========================================================
// EXPORT
// ==========================================================

module.exports = {

    // ======================================================
    // LIST / READ OPERATIONS
    // ======================================================

    normalizeType:
        listService.normalizeType,

    validateDairyId:
        listService.validateDairyId,

    getParentDairy:
        listService.getParentDairy,

    sortStorage:
        listService.sortStorage,

    getStorage:
        listService.getStorage,

    getAllStorage:
        listService.getAllStorage,

    getRooms:
        listService.getRooms,

    getAgroStores:
        listService.getAgroStores,

    getStorageFacility:
        listService.getStorageFacility,


    // ======================================================
    // CREATION OPERATIONS
    // ======================================================

    createStorage:
        storageService.createStorage

};