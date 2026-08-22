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