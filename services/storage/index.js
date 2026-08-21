// ==========================================================
// services/storage/index.js
// STORAGE SERVICE ENTRY POINT
// ==========================================================

const list = require("./list");
const add = require("./add");
const addNew = require("./addNew");
const contents = require("./contents");


module.exports = {

    // ======================================================
    // LIST / READ
    // ======================================================

    normalizeType: list.normalizeType,
    getParentDairy: list.getParentDairy,
    getStorage: list.getStorage,
    getAllStorage: list.getAllStorage,
    getRooms: list.getRooms,
    getAgroStores: list.getAgroStores,
    getStorageFacility: list.getStorageFacility,

    // ======================================================
    // CREATE STORAGE
    // ======================================================

    createStorage: add.createStorage,

    // ======================================================
    // ADD-NEW FORM / ITEM
    // ======================================================

    getAddNewContext: addNew.getAddNewContext,
    addNewItem: addNew.addNewItem,

    // ======================================================
    // CONTENTS
    // ======================================================

    getStorageContents: contents.getStorageContents,
    getAvailableItems: contents.getAvailableItems,
    addItemsToStorage: contents.addItemsToStorage,

    // ======================================================
    // NORMAL STORAGE OPERATIONS
    // ======================================================

    omitItemsFromStorage: contents.omitItemsFromStorage,
    reshuffleItems: contents.reshuffleItems,

    // ======================================================
    // AGROSTORE QUANTITY OPERATIONS
    // ======================================================

    updateFeedQuantity: contents.updateFeedQuantity,
    updateFeedQuantities: contents.updateFeedQuantities
};
