// =========================================================
// controllers/storage/index.js
// STORAGE CONTROLLER ENTRY POINT
// =========================================================

const listController = require("./list");
const addController = require("./add");
const addNewController = require("./addNew");
const contentsController = require("./contents");


// =========================================================
// RESOLVE CONTROLLER HANDLER
// =========================================================

function resolveHandler(
    controller,
    names,
    controllerName
) {

    if (typeof controller === "function") {
        return controller;
    }

    if (
        controller &&
        typeof controller === "object"
    ) {

        for (
            const name
            of names
        ) {

            if (
                typeof controller[name] === "function"
            ) {

                return controller[name];

            }

        }

    }

    throw new TypeError(
        `Storage controller "${controllerName}" does not export a valid route handler function.`
    );

}


// =========================================================
// STORAGE LIST
// =========================================================

const list =
    resolveHandler(
        listController,
        [
            "list",
            "index"
        ],
        "list"
    );


// =========================================================
// ADD STORAGE
// =========================================================

const form =
    resolveHandler(
        addController,
        [
            "getAddStorage",
            "form",
            "showForm",
            "addForm"
        ],
        "form"
    );


const create =
    resolveHandler(
        addController,
        [
            "createStorage",
            "create",
            "add"
        ],
        "create"
    );


// =========================================================
// ADD ITEM DIRECTLY TO EXISTING STORAGE
// =========================================================

const addNewForm =
    resolveHandler(
        addNewController,
        [
            "getAddNewStorage",
            "form",
            "showForm",
            "addNewForm"
        ],
        "addNewForm"
    );


const addNewItem =
    resolveHandler(
        addNewController,
        [
            "addNewItem",
            "create",
            "add"
        ],
        "addNewItem"
    );


// =========================================================
// STORAGE CONTENTS
// =========================================================

const contents =
    resolveHandler(
        contentsController,
        [
            "contents",
            "index"
        ],
        "contents"
    );


// =========================================================
// STORAGE CONTENT ITEM DETAILS
// =========================================================
//
// GET:
//
// /storage/:dairyId/contents/:storageId/details/:itemId
//
// This resolves the handler responsible for rendering:
//
//     views/storage/content-item.ejs
//
// =========================================================

const contentItem =
    resolveHandler(
        contentsController,
        [
            "contentItem",
            "itemDetails",
            "details"
        ],
        "contentItem"
    );


// =========================================================
// ADD ITEMS TO STORAGE
// =========================================================

const addItems =
    resolveHandler(
        contentsController,
        [
            "addItems"
        ],
        "addItems"
    );


// =========================================================
// OMIT ITEMS FROM STORAGE
// =========================================================

const omitItems =
    resolveHandler(
        contentsController,
        [
            "omitItems"
        ],
        "omitItems"
    );


// =========================================================
// RESHUFFLE ITEMS
// =========================================================

const reshuffleItems =
    resolveHandler(
        contentsController,
        [
            "reshuffleItems"
        ],
        "reshuffleItems"
    );


// =========================================================
// UPDATE STORAGE QUANTITY
// =========================================================

const updateQuantity =
    resolveHandler(
        contentsController,
        [
            "updateQuantity",
            "updateFeedQuantity"
        ],
        "updateQuantity"
    );


// =========================================================
// EXPORT
// =========================================================

module.exports = {

    list,

    form,

    create,

    addNewForm,

    addNewItem,

    contents,

    contentItem,

    addItems,

    omitItems,

    reshuffleItems,

    updateQuantity

};