// ==========================================================
// controllers/storage/addNew.js
// ADD ITEM DIRECTLY TO AN EXISTING STORAGE FACILITY
// ==========================================================

const storageService = require("../../services/storage");
const addNewService = require("../../services/storage/addNew");


function getErrorMessage(error) {
    return error?.message || "Unable to process the storage item request.";
}


async function getAddNewStorage(req, res) {

    const { dairyId, storageId } = req.params;

    try {

        const context = await addNewService.getAddNewContext({
            dairyId,
            storageId
        });

        return res.render("storage/addNew", {
            dairy: context.dairy,
            storage: context.storage,
            dairyBreeds: context.dairyBreeds,
            storageType: context.storageType
        });

    } catch (error) {

        console.error("[storage/addNew] form:", error);

        return res.status(error.statusCode || 500).render("error", {
            message: getErrorMessage(error)
        });
    }
}


async function addNewItem(req, res) {

    const { dairyId, storageId } = req.params;

    try {

        const result = await addNewService.addNewItem({
            dairyId,
            storageId,
            body: req.body || {},
            file: req.file || null,
            request: req
        });

        // Keep normal browser POST behaviour. If the existing
        // application uses a flash/redirect convention, the
        // service result can provide the redirect explicitly.
        if (result?.redirect) {
            return res.redirect(result.redirect);
        }

        return res.redirect(
            `/storage/${dairyId}/contents/${storageId}`
        );

    } catch (error) {

        console.error("[storage/addNew] create:", error);

        // Render the same form again when validation fails so the
        // user does not lose the context of the selected storage.
        try {

            const context = await addNewService.getAddNewContext({
                dairyId,
                storageId
            });

            return res.status(error.statusCode || 400).render("storage/addNew", {
                dairy: context.dairy,
                storage: context.storage,
                dairyBreeds: context.dairyBreeds,
                storageType: context.storageType,
                formError: getErrorMessage(error),
                formData: req.body || {}
            });

        } catch (renderError) {

            console.error("[storage/addNew] error render:", renderError);

            return res.status(error.statusCode || 400).send(
                getErrorMessage(error)
            );
        }
    }
}


module.exports = {
    getAddNewStorage,
    addNewItem
};
