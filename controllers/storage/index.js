// =========================================================
// controllers/storage/index.js
// STORAGE CONTROLLER ENTRY POINT
// =========================================================

const listController = require("./list");
const addController = require("./add");
const addNewController = require("./addNew");
const contentsController = require("./contents");


function resolveHandler(controller, names, controllerName) {

    if (typeof controller === "function") {
        return controller;
    }

    if (controller && typeof controller === "object") {
        for (const name of names) {
            if (typeof controller[name] === "function") {
                return controller[name];
            }
        }
    }

    throw new TypeError(
        `Storage controller "${controllerName}" does not export a valid route handler function.`
    );
}


const list = resolveHandler(listController, ["list", "index"], "list");

const form = resolveHandler(
    addController,
    ["getAddStorage", "form", "showForm", "addForm"],
    "form"
);

const create = resolveHandler(
    addController,
    ["createStorage", "create", "add"],
    "create"
);

// ==========================================================
// ADD ITEM DIRECTLY TO EXISTING STORAGE
// ==========================================================

const addNewForm = resolveHandler(
    addNewController,
    ["getAddNewStorage", "form", "showForm", "addNewForm"],
    "addNewForm"
);

const addNewItem = resolveHandler(
    addNewController,
    ["addNewItem", "create", "add"],
    "addNewItem"
);


const contents = resolveHandler(
    contentsController,
    ["contents", "index"],
    "contents"
);

const addItems = resolveHandler(
    contentsController,
    ["addItems"],
    "addItems"
);

const omitItems = resolveHandler(
    contentsController,
    ["omitItems"],
    "omitItems"
);

const reshuffleItems = resolveHandler(
    contentsController,
    ["reshuffleItems"],
    "reshuffleItems"
);

const updateQuantity = resolveHandler(
    contentsController,
    ["updateQuantity", "updateFeedQuantity"],
    "updateQuantity"
);


module.exports = {
    list,
    form,
    create,
    addNewForm,
    addNewItem,
    contents,
    addItems,
    omitItems,
    reshuffleItems,
    updateQuantity
};
