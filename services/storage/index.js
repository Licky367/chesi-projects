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
    // CREATE STORAGE
    // ======================================================

    createStorage:
        add.createStorage,


    // ======================================================
    // CONTENTS
    // ======================================================

    getStorageContents:
        contents.getStorageContents,


    getAvailableItems:
        contents.getAvailableItems,


    addItemsToStorage:
        contents.addItemsToStorage,


    // ======================================================
    // NORMAL STORAGE OPERATIONS
    // ======================================================

    omitItemsFromStorage:
        contents.omitItemsFromStorage,


    reshuffleItems:
        contents.reshuffleItems,


    // ======================================================
    // AGROSTORE QUANTITY OPERATIONS
    // ======================================================

    updateFeedQuantity:
        contents.updateFeedQuantity,


    updateFeedQuantities:
        contents.updateFeedQuantities

};