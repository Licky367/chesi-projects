// =========================================================
// controllers/storage/index.js
// STORAGE CONTROLLER ENTRY POINT
// ==========================================================
//
// Combines:
//
//     list.js
//     add.js
//     contents.js
//
// IMPORTANT:
//
// Every property exported here MUST be a function,
// because routes/storage.js passes these directly to Express.
//
// ==========================================================


const listController =
    require("./list");


const addController =
    require("./add");


const contentsController =
    require("./contents");


// ==========================================================
// CONTROLLER HANDLER RESOLVER
// ==========================================================
//
// Allows a controller module to export either:
//
//     module.exports = function (...) {}
//
// OR:
//
//     module.exports = {
//         functionName: function (...) {}
//     }
//
// ==========================================================

function resolveHandler(
    controller,
    names,
    controllerName
) {

    // ------------------------------------------------------
    // DIRECT FUNCTION EXPORT
    // ------------------------------------------------------

    if (
        typeof controller === "function"
    ) {

        return controller;

    }


    // ------------------------------------------------------
    // NAMED FUNCTION EXPORT
    // ------------------------------------------------------

    if (
        controller &&
        typeof controller === "object"
    ) {

        for (
            const name of names
        ) {

            if (
                typeof controller[name] ===
                "function"
            ) {

                return controller[name];

            }

        }

    }


    // ------------------------------------------------------
    // INVALID CONTROLLER
    // ------------------------------------------------------

    throw new TypeError(
        `Storage controller "${controllerName}" does not export a valid route handler function.`
    );

}


// ==========================================================
// LIST
// ==========================================================

const list =
    resolveHandler(

        listController,

        [
            "list",
            "index"
        ],

        "list"

    );


// ==========================================================
// ADD FORM
// ==========================================================
//
// add.js exports:
//
//     getAddStorage
//
// This is exposed to the routes as:
//
//     form
//
// ==========================================================

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


// ==========================================================
// CREATE STORAGE
// ==========================================================
//
// add.js exports:
//
//     createStorage
//
// This is exposed to the routes as:
//
//     create
//
// ==========================================================

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


// ==========================================================
// STORAGE CONTENTS
// ==========================================================

const contents =
    resolveHandler(

        contentsController,

        [
            "contents",
            "index"
        ],

        "contents"

    );


// ==========================================================
// ADD ITEMS
// ==========================================================

const addItems =
    resolveHandler(

        contentsController,

        [
            "addItems"
        ],

        "addItems"

    );


// ==========================================================
// OMIT ITEMS
// ==========================================================
//
// IMPORTANT:
//
// This remains available for NORMAL storage.
//
// The controller/service will reject manual omission from
// AgroStore.
//
// ==========================================================

const omitItems =
    resolveHandler(

        contentsController,

        [
            "omitItems"
        ],

        "omitItems"

    );


// ==========================================================
// RESHUFFLE ITEMS
// ==========================================================
//
// IMPORTANT:
//
// This remains available for NORMAL storage.
//
// The controller/service will reject reshuffling involving
// AgroStore.
//
// ==========================================================

const reshuffleItems =
    resolveHandler(

        contentsController,

        [
            "reshuffleItems"
        ],

        "reshuffleItems"

    );


// ==========================================================
// UPDATE QUANTITY
// ==========================================================
//
// AgroStore operation.
//
// The service is responsible for:
//
//     quantity > 0
//         -> keep item in AgroStore
//
//     quantity === 0
//         -> automatically omit item
//
// Negative quantities are rejected by the service.
//
// ==========================================================

const updateQuantity =
    resolveHandler(

        contentsController,

        [
            "updateQuantity",
            "updateFeedQuantity"
        ],

        "updateQuantity"

    );


// ==========================================================
// EXPORT
// ==========================================================

module.exports = {

    list,

    form,

    create,

    contents,

    addItems,

    omitItems,

    reshuffleItems,

    updateQuantity

};