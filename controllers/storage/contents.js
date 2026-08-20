// ==========================================================
// controllers/storage/contents.js
// STORAGE CONTENTS CONTROLLER
// ==========================================================
//
// PURPOSE:
//
//     Display everything allocated inside a particular
//     Room or AgroStore.
//
// ROUTE:
//
//     GET /storage/:dairyId/contents/:storageId
//
// PARAMETERS:
//
//     dairyId
//         = parent Dairy._id
//
//     storageId
//         = DairyStorage._id
//
// ALLOCATION:
//
//     Dairy.assetCode   = parent Dairy.code
//     Dairy.dwellNumber = DairyStorage.roomNumber
//
// The exact same allocation rule is used for:
//
//     Room
//     AgroStore
//
// ==========================================================


const storageContentsService =
    require("../../services/storage/contents");


// ==========================================================
// GET STORAGE CONTENTS
// ==========================================================

async function contents(
    req,
    res
) {

    try {

        // ==================================================
        // PARAMS
        // ==================================================

        const dairyId =
            req.params.dairyId;

        const storageId =
            req.params.storageId;


        // ==================================================
        // SERVICE
        // ==================================================

        const result =
            await storageContentsService.getStorageContents({

                dairyId,

                storageId

            });


        // ==================================================
        // RENDER
        // ==================================================

        return res.render(
            "storage/contents",
            {

                dairy:
                    result.dairy,

                storage:
                    result.storage,

                items:
                    result.items,

                itemCount:
                    result.items.length

            }
        );


    } catch (error) {

        console.error(
            "Storage contents error:",
            error
        );


        // ==================================================
        // STATUS
        // ==================================================

        const statusCode =
            Number(
                error.status ||
                error.statusCode ||
                500
            );


        // ==================================================
        // ERROR RESPONSE
        // ==================================================

        return res
            .status(
                statusCode >= 400 &&
                statusCode < 600
                    ? statusCode
                    : 500
            )
            .send(
                error.message ||
                "Unable to load storage contents."
            );

    }

}


// ==========================================================
// EXPORT
// ==========================================================

module.exports =
    contents;