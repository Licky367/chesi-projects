// ==========================================================
// services/storage/index.js
// STORAGE SERVICE ENTRY POINT
// ==========================================================
//
// Combines:
//
//     list.js
//     add.js
//     contents.js
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
// CONTENTS:
//
//     getStorageContents
//     getAvailableItems
//     addItemsToStorage
//     omitItemsFromStorage
//     reshuffleItems
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
    // ADD / CREATE STORAGE FACILITY
    // ======================================================

    createStorage:
        add.createStorage,


    // ======================================================
    // STORAGE CONTENTS
    // ======================================================

    getStorageContents:
        contents.getStorageContents,

    getAvailableItems:
        contents.getAvailableItems,

    addItemsToStorage:
        contents.addItemsToStorage,

    omitItemsFromStorage:
        contents.omitItemsFromStorage,

    reshuffleItems:
        contents.reshuffleItems

};