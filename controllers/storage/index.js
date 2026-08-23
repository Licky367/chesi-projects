// =========================================================
// controllers/storage/index.js
// STORAGE CONTROLLER ENTRY POINT
// =======================================================

const listController =
    require("./list");

const addController =
    require("./add");

const addNewController =
    require("./addNew");

const contentsController =
    require("./contents");


// =========================================================
// RESOLVE ROUTE HANDLER
// =========================================================
//
// Allows individual controller files to export either:
//
//     module.exports = function
//
// OR:
//
//     module.exports = {
//         handlerName: function
//     }
//
// =========================================================

function resolveHandler(
    controller,
    names,
    controllerName
) {

    // -----------------------------------------------------
    // CONTROLLER ITSELF IS A FUNCTION
    // -----------------------------------------------------

    if (
        typeof controller === "function"
    ) {

        return controller;

    }


    // -----------------------------------------------------
    // CONTROLLER IS AN OBJECT
    // -----------------------------------------------------

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


    // -----------------------------------------------------
    // INVALID CONTROLLER
    // -----------------------------------------------------

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
// ADD STORAGE FORM
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


// =========================================================
// CREATE STORAGE
// =========================================================

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


// ---------------------------------------------------------
// ADD ITEM FORM
// ---------------------------------------------------------

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


// ---------------------------------------------------------
// CREATE ITEM
// ---------------------------------------------------------

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
// SINGLE CONTENT ITEM DETAILS
// =========================================================
//
// GET:
//
// /storage/:dairyId/contents/:storageId/details/:itemId
//
// Controller:
//
//     controllers/storage/contents.js
//
// Handler:
//
//     contentItem
//
// View:
//
//     views/storage/content-item.ejs
//
// =========================================================

const contentItem =
    resolveHandler(
        contentsController,
        [
            "contentItem",
            "details",
            "itemDetails"
        ],
        "contentItem"
    );


// =========================================================
// ADD ITEMS
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
// OMIT ITEMS
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
// UPDATE AGROSTORE QUANTITY
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
// UPDATE STORAGE CONTENT ITEM
// =========================================================
//
// POST:
//
// /storage/:dairyId/contents/:storageId/update/:itemId
//
// Controller:
//
//     controllers/storage/contents.js
//
// Handler:
//
//     updateContentItem
//
// =========================================================

const updateContentItem =
    resolveHandler(
        contentsController,
        [
            "updateContentItem",
            "updateQuantity"
        ],
        "updateContentItem"
    );


// =========================================================
// EXPORT
// =========================================================

module.exports = {

    // -----------------------------------------------------
    // STORAGE
    // -----------------------------------------------------

    list,

    form,

    create,


    // -----------------------------------------------------
    // DIRECT ITEM CREATION
    // -----------------------------------------------------

    addNewForm,

    addNewItem,


    // -----------------------------------------------------
    // STORAGE CONTENTS
    // -----------------------------------------------------

    contents,

    contentItem,


    // -----------------------------------------------------
    // CONTENT OPERATIONS
    // -----------------------------------------------------

    addItems,

    omitItems,

    reshuffleItems,

    updateQuantity,

    updateContentItem

};