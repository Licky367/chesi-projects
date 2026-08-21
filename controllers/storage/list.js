// ==========================================================
// controllers/storage/list.js
// STORAGE LIST CONTROLLER
// ==========================================================
//
// HANDLES:
//
//     GET /storage/:id
//
// IMPORTANT ID CONTRACT:
//
//     :id = parent Dairy._id
//
// NEW DAIRY ARCHITECTURE:
//
//     req.params.id
//          ↓
//     Dairy._id
//          ↓
//     Dairy.code
//          ↓
//     Dairy.assetCode
//          ↓
//     Storage Dairy records
//
// Each storage facility is itself a Dairy document.
//
// Therefore:
//
//     parent farm ID = dairy._id
//
//     storage Dairy ID = item._id
//
// View URL:
//
//     /storage/:parentFarmId/contents/:dairyId
//
// ==========================================================


const storageService =
    require("../../services/storage");


// ==========================================================
// GET STORAGE PAGE
// ==========================================================
//
// GET:
//
//     /storage/:id
//
// :id = parent Dairy._id
//
// ==========================================================

async function list(
    req,
    res,
    next
) {

    try {

        // ==================================================
        // GET PARENT DAIRY ID
        // ==================================================

        const dairyId =
            String(
                req.params.id || ""
            ).trim();


        // ==================================================
        // REQUIRE DAIRY ID
        // ==================================================

        if (!dairyId) {

            return res
                .status(400)
                .render(
                    "400",
                    {

                        title:
                            "Invalid Dairy ID",

                        error:
                            "Dairy Farm ID is required.",

                        user:
                            req.session?.user || null

                    }
                );

        }


        // ==================================================
        // GET TYPE FILTER
        // ==================================================

        const type =
            storageService.normalizeType(
                req.query.type
            );


        // ==================================================
        // GET STORAGE
        // ==================================================
        //
        // The service resolves:
        //
        //     Dairy._id
        //          ↓
        //     Parent Dairy Farm
        //          ↓
        //     Parent Dairy.code
        //          ↓
        //     Storage Dairy.assetCode
        //
        // No DairyStorage model is involved.
        //
        // ==================================================

        const result =
            await storageService.getStorage({

                dairyId,

                type

            });


        // ==================================================
        // RENDER
        // ==================================================

        return res.render(
            "storage/storage",
            {

                title:
                    "Feed Store",

                // ------------------------------------------
                // Parent Dairy Farm
                // ------------------------------------------

                dairy:
                    result.dairy,

                // ------------------------------------------
                // Storage Dairy records
                // ------------------------------------------
                //
                // Each item is a document from models/dairy.js
                //
                // item._id
                // item.assetCode
                // item.dwellNumber
                // item.type
                //
                // ------------------------------------------

                storage:
                    result.storage,

                // ------------------------------------------
                // Selected filter
                // ------------------------------------------

                selectedType:
                    result.type,

                // ------------------------------------------
                // Parent Dairy MongoDB ID
                // ------------------------------------------
                //
                // Used by the view as:
                //
                // /storage/<dairyId>/contents/<item._id>
                //
                // ------------------------------------------

                dairyId:
                    result.dairy._id,

                // ------------------------------------------
                // Parent Dairy Farm Code
                // ------------------------------------------

                farmCode:
                    result.farmCode,

                // ------------------------------------------
                // Logged-in user
                // ------------------------------------------

                user:
                    req.session?.user || null

            }
        );

    } catch (error) {

        console.error(
            "STORAGE LIST ERROR:",
            error
        );

        return next(error);

    }

}


// ==========================================================
// EXPORT
// ==========================================================

module.exports = list;