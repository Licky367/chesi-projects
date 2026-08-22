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
        // URL PARAMETERS
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
        // UPDATE INVENTORY
        // ======================================================
        //
        // IMPORTANT:
        //
        // parentId  = Dairy Farm MongoDB _id
        // roomNumber = AgroStore.roomNumber
        // inventoryId = Inventory MongoDB _id
        //
        // No agroStoreId is invented or substituted.
        //
        // ======================================================

        await storageService.update({

            parentId,

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