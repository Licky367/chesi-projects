// ==========================================================
// controllers/storage/addNew.js
// ADD ITEM DIRECTLY TO AN EXISTING STORAGE FACILITY
// ==========================================================

const storageService = require("../../services/storage");
const addNewService = require("../../services/storage/addNew");


function getErrorMessage(error) {

    return (
        error?.message ||
        "Unable to process the storage item request."
    );

}


/* ============================================================
   ADD ITEM FORM
============================================================ */

async function getAddNewStorage(req, res) {

    const {
        dairyId,
        storageId,
        storageType
    } = req.params;


    try {

        const context =
            await addNewService.getAddNewContext({
                dairyId,
                storageId,
                storageType
            });


        return res.render(
            "storage/addNew",
            {

                dairy:
                    context.dairy,

                storage:
                    context.storage,

                dairyBreeds:
                    context.dairyBreeds,

                storageType:
                    context.storageType

            }
        );


    } catch (error) {

        console.error(
            "[storage/addNew] form:",
            error
        );


        return res
            .status(
                error.statusCode || 500
            )
            .render(
                "error",
                {
                    message:
                        getErrorMessage(error)
                }
            );

    }

}


/* ============================================================
   ADD ITEM
============================================================ */

async function addNewItem(req, res) {

    const {
        dairyId,
        storageId,
        storageType
    } = req.params;


    try {

        const result =
            await addNewService.addNewItem({

                dairyId,

                storageId,

                storageType,

                body:
                    req.body || {},

                file:
                    req.file || null,

                request:
                    req

            });


        /*
        --------------------------------------------------------
        Explicit redirect supplied by service
        --------------------------------------------------------
        */

        if (
            result?.redirect
        ) {

            return res.redirect(
                result.redirect
            );

        }


        /*
        --------------------------------------------------------
        Normal successful redirect
        --------------------------------------------------------
        */

        return res.redirect(
            `/storage/${dairyId}/contents/${storageId}`
        );


    } catch (error) {

        console.error(
            "[storage/addNew] create:",
            error
        );


        /*
        --------------------------------------------------------
        Re-render the same form after validation failure.
        --------------------------------------------------------
        */

        try {

            const context =
                await addNewService.getAddNewContext({

                    dairyId,

                    storageId,

                    storageType

                });


            return res
                .status(
                    error.statusCode || 400
                )
                .render(
                    "storage/addNew",
                    {

                        dairy:
                            context.dairy,

                        storage:
                            context.storage,

                        dairyBreeds:
                            context.dairyBreeds,

                        storageType:
                            context.storageType,

                        formError:
                            getErrorMessage(error),

                        formData:
                            req.body || {}

                    }
                );


        } catch (renderError) {

            console.error(
                "[storage/addNew] error render:",
                renderError
            );


            return res
                .status(
                    error.statusCode || 400
                )
                .send(
                    getErrorMessage(error)
                );

        }

    }

}


/* ============================================================
   EXPORTS
============================================================ */

module.exports = {

    getAddNewStorage,

    addNewItem

};