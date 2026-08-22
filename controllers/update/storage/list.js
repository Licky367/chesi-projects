// ==========================================================
// controllers/update/storage/list.js
// AGROSTORE INVENTORY LIST CONTROLLER
// ==========================================================

const storageService =
    require("../../../services/update/storage");


// ==========================================================
// LIST AGROSTORE INVENTORY
// ==========================================================
//
// GET
// /dairy/:parentId/agroStore/:roomNumber
//
// ==========================================================

async function list(
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
            roomNumber
        } = req.params;


        // ======================================================
        // GET AGROSTORE INVENTORY
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

        const result =
            await storageService.list({

                agroStoreId:
                    roomNumber

            });


        // ======================================================
        // RENDER
        // ======================================================

        return res.render(
            "dairy/agroStore/inventory",
            {

                title:
                    `${result.agroStore.name} Inventory`,

                parentDairy:
                    result.parentDairy,

                agroStore:
                    result.agroStore,

                inventory:
                    result.inventory,

                parentId,

                roomNumber:
                    result.agroStore.roomNumber

            }
        );

    } catch (error) {

        return next(error);

    }

}


// ==========================================================
// EXPORT
// ==========================================================

module.exports =
    list;