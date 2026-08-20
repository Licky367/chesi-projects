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
//     getStorageContents
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
//
// Keep the existing storage service API and add the
// storage contents API.
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
        add.createStorage,


    // ======================================================
    // CONTENTS
    // ======================================================

    getStorageContents:
        contents.getStorageContents

};