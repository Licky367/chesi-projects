// ==========================================================
// controllers/update/storage/code-gen.js
// STORAGE URL CODE GENERATOR CONTROLLER
// ==========================================================
//
// PURPOSE:
//
//     Receives the request for the storage URL generator page,
//     obtains all generated URLs from the service, and renders
//     the EJS view.
//
// VIEW:
//
//     views/update/storage/code-gen.ejs
//
// ==========================================================

const codeGenService =
    require("../../../services/update/storage/code-gen");

// ==========================================================
// INDEX
// ==========================================================
//
// GET:
//
//     /update/storage/code-gen
//
// ==========================================================

async function index(req, res, next) {

    try {

        const result =
            await codeGenService.generateStorageUrls();

        return res.render(
            "update/storage/code-gen",
            {
                title: "Storage URL Code Generator",

                farms: result.farms,

                agroStores: result.agroStores,

                items: result.items,

                summary: result.summary
            }
        );

    } catch (error) {

        return next(error);
    }
}

// ==========================================================
// EXPORT
// ==========================================================

module.exports = {
    index
};