// ==========================================================
// controllers/update/storage/update.js
// AGROSTORE INVENTORY UPDATE CONTROLLER
// ==========================================================

const storageService =
    require("../../../services/update/storage");


// ==========================================================
// UPDATE INVENTORY
// ==========================================================
//
// POST
// /dairy/:parentId/agroStore/:roomNumber/inventory/:inventoryId/update
//
// ==========================================================

async function update(
    req,
    res,
    next
) {

    try {

        // ======================================================
        // PARAMETERS
        // ======================================================

        const {
            parentId,
            roomNumber,
            inventoryId
        } = req.params;


        // ======================================================
        // FORM DATA
        // ======================================================

        const {
            quantity,
            stockUpdateNote
        } = req.body;


        // ======================================================
        // UPDATE STOCK
        // ======================================================
        //
        // IMPORTANT:
        //
        // roomNumber from the URL is the AgroStore's
        // application-level ID.
        //
        // Therefore:
        //
        //     roomNumber
        //          ↓
        //     agroStoreId
        //          ↓
        //     AgroStore.roomNumber
        //
        // The storage service resolves the parent Dairy
        // Farm through AgroStore.assetCode.
        //
        // ======================================================

        await storageService.update({

            agroStoreId:
                roomNumber,

            inventoryId,

            quantity,

            stockUpdateNote

        });


        // ======================================================
        // SUCCESS
        // ======================================================

        return res.redirect(
            `/dairy/${encodeURIComponent(parentId)}/agroStore/${encodeURIComponent(roomNumber)}`
        );

    } catch (error) {

        return next(error);

    }

}


// ==========================================================
// EXPORT
// ==========================================================

module.exports =
    update;