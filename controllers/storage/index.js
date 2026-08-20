// ==========================================================
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
//     Every property exported here MUST be a function,
//     because routes/storage.js passes these directly to
//     Express.
//
// ==========================================================

const listController = require("./list");

const addController = require("./add");

const contentsController = require("./contents");


// ==========================================================
// CONTROLLER HANDLER RESOLVER
// ==========================================================
//
// This allows the entry point to safely work whether:
//
//     list.js
//
// exports:
//
//     module.exports = function (...) {}
//
// OR:
//
//     module.exports = {
//         list: function (...) {}
//     }
//
// The same applies to add.js.
//
// ==========================================================

function resolveHandler(
    controller,
    names,
    controllerName
) {

    // ------------------------------------------------------
    // Direct function export
    // ------------------------------------------------------

    if (
        typeof controller === "function"
    ) {

        return controller;

    }


    // ------------------------------------------------------
    // Named function export
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
    // Invalid controller
    // ------------------------------------------------------

    throw new TypeError(
        `Storage controller "${controllerName}" does not export a valid route handler function.`
    );

}


// ==========================================================
// LIST CONTROLLER
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
// ADD FORM CONTROLLER
// ==========================================================

const form =
    resolveHandler(
        addController,
        [
            "form",
            "showForm",
            "addForm"
        ],
        "form"
    );


// ==========================================================
// CREATE CONTROLLER
// ==========================================================

const create =
    resolveHandler(
        addController,
        [
            "create",
            "createStorage",
            "add"
        ],
        "create"
    );


// ==========================================================
// CONTENTS CONTROLLER
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
// ADD ITEMS CONTROLLER
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
// OMIT ITEMS CONTROLLER
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
// RESHUFFLE CONTROLLER
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
// EXPORT
// ==========================================================
//
// Every exported value below is guaranteed to be a
// FUNCTION.
//
// Therefore Express can safely receive:
//
//     router.get(path, storageController.contents)
//
// ==========================================================

module.exports = {

    list,

    form,

    create,

    contents,

    addItems,

    omitItems,

    reshuffleItems

};