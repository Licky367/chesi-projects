// ==========================================================
// controllers/storageController.js
// STORAGE CONTROLLER
// ==========================================================
//
// RESPONSIBILITY
// ----------------------------------------------------------
//
// Handles HTTP concerns for Storage.
//
// The controller:
//
//     - reads route parameters
//     - reads user-submitted form values
//     - calls the storage service
//     - renders views
//     - redirects after successful creation
//
// The controller DOES NOT:
//
//     - resolve the parent Dairy
//     - determine farmCode
//     - determine assetCode
//     - determine recordType
//     - generate roomNumber
//     - validate storage ownership
//     - check duplicate names
//
// Those responsibilities belong to the service.
//
// PARENT DAIRY:
//
//     req.params.id
//
// is ALWAYS the MongoDB _id of the parent Dairy Farm.
//
// ==========================================================


const storageService =
    require("../services/storage/add");


// ==========================================================
// GET ADD STORAGE FORM
// ==========================================================
//
// GET:
//
//     /storage/:id/add
//
// :id = parent Dairy._id
//
// The service resolves the actual parent Dairy.
//
// ==========================================================

async function getAddStorage(
    req,
    res,
    next
) {

    try {

        const dairyId =
            String(
                req.params.id || ""
            ).trim();


        if (!dairyId) {

            const error =
                new Error(
                    "Dairy Farm ID is required."
                );

            error.status =
                400;

            throw error;

        }


        // --------------------------------------------------
        // Resolve parent Dairy
        // --------------------------------------------------
        //
        // The ID in the URL identifies the parent Dairy.
        //
        // --------------------------------------------------

        const {

            dairy

        } =
            await storageService.getParentDairy(
                dairyId
            );


        // --------------------------------------------------
        // Render add form
        // --------------------------------------------------

        return res.render(
            "storage/add",
            {

                dairy,

                formData: {},

                error: null

            }
        );

    } catch (error) {

        return next(error);

    }

}


// ==========================================================
// POST ADD STORAGE
// ==========================================================
//
// POST:
//
//     /storage/:id/add
//
// USER PROVIDES:
//
//     name
//     type
//
// SERVICE DETERMINES:
//
//     recordType
//     assetCode
//     farmCode
//     roomNumber
//     status
//
// ==========================================================

async function createStorage(
    req,
    res,
    next
) {

    const dairyId =
        String(
            req.params.id || ""
        ).trim();


    const formData = {

        name:
            String(
                req.body?.name || ""
            ).trim(),

        type:
            String(
                req.body?.type || ""
            ).trim()

    };


    try {

        // --------------------------------------------------
        // Validate route parameter exists
        // --------------------------------------------------

        if (!dairyId) {

            const error =
                new Error(
                    "Dairy Farm ID is required."
                );

            error.status =
                400;

            throw error;

        }


        // --------------------------------------------------
        // Create storage
        // --------------------------------------------------
        //
        // IMPORTANT:
        //
        // Only user-controlled fields are passed here.
        //
        // recordType, assetCode, farmCode and roomNumber
        // are NOT accepted from the controller.
        //
        // The service derives them from the parent Dairy.
        //
        // --------------------------------------------------

        const result =
            await storageService.createStorage({

                dairyId,

                name:
                    formData.name,

                type:
                    formData.type

            });


        // --------------------------------------------------
        // Successful creation
        // --------------------------------------------------
        //
        // Redirect using the parent Dairy._id.
        //
        // Never use farmCode as the URL identifier.
        //
        // --------------------------------------------------

        return res.redirect(
            `/storage/${result.dairy._id}`
        );

    } catch (error) {

        // --------------------------------------------------
        // Re-resolve parent Dairy for form rendering
        // --------------------------------------------------
        //
        // If the service failed after resolving the parent,
        // we still need the Dairy object to render the form.
        //
        // --------------------------------------------------

        try {

            const {

                dairy

            } =
                await storageService.getParentDairy(
                    dairyId
                );


            return res.status(
                error.status || 400
            ).render(
                "storage/add",
                {

                    dairy,

                    formData,

                    error:
                        error.message ||
                        "Unable to create storage facility."

                }
            );

        } catch (renderError) {

            return next(
                renderError
            );

        }

    }

}


// ==========================================================
// EXPORT
// ==========================================================

module.exports = {

    getAddStorage,

    createStorage

};