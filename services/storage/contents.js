// ==========================================================
// services/storage/contents.js
// STORAGE CONTENTS SERVICE
// ==========================================================
//
// PURPOSE:
//
// Handles everything related to the contents of a
// Room or AgroStore.
//
// SUPPORTED OPERATIONS:
//
//     1. View current contents
//     2. Find items available for addition
//     3. Add items
//     4. Omit items
//     5. Reshuffle items
//
// ==========================================================
//
// ALLOCATION RULE
// ----------------------------------------------------------
//
// A Dairy record belongs to a particular storage facility
// when:
//
//     Dairy.assetCode
//         ===
//     Parent Dairy Farm.code
//
// AND
//
//     Dairy.dwellNumber
//         ===
//     DairyStorage.roomNumber
//
// This rule applies IDENTICALLY to:
//
//     Room
//     AgroStore
//
// There is NO separate allocation mechanism.
//
// ==========================================================
//
// ADD RULE
// ----------------------------------------------------------
//
// An item can be added to a storage facility when:
//
//     assetCode exists
//
// AND
//
//     dwellNumber === null
//
// The item must also belong to the parent farm:
//
//     item.assetCode === parentFarm.code
//
// ==========================================================
//
// OMIT RULE
// ----------------------------------------------------------
//
// Omitting an item does NOT change assetCode.
//
// It only changes:
//
//     dwellNumber = null
//
// This makes the item available for allocation again.
//
// ==========================================================
//
// RESHUFFLE RULE
// ----------------------------------------------------------
//
// Reshuffling changes:
//
//     dwellNumber
//
// from the current storage number to the target storage
// number.
//
// The target storage MUST:
//
//     1. Belong to the same parent farm
//     2. Be active
//     3. Be the same storage type
//
// Therefore:
//
//     Room → Room
//     AgroStore → AgroStore
//
// ==========================================================


const mongoose =
    require("mongoose");

const Dairy =
    require("../../models/dairy");

const DairyStorage =
    require("../../models/dairyStorage");


// ==========================================================
// ERROR HELPER
// ==========================================================

function createError(
    message,
    statusCode = 400
) {

    const error =
        new Error(message);

    error.status =
        statusCode;

    return error;

}


// ==========================================================
// OBJECT ID VALIDATION
// ==========================================================

function isValidObjectId(
    value
) {

    return mongoose.Types.ObjectId.isValid(
        value
    );

}


// ==========================================================
// NORMALIZE ARRAY
// ==========================================================
//
// Accepts:
//
//     ["id1", "id2"]
//
// Also safely handles:
//
//     "id1"
//
// ==========================================================

function normalizeIdArray(
    value
) {

    if (Array.isArray(value)) {

        return value
            .filter(Boolean)
            .map(String);

    }

    if (value) {

        return [String(value)];

    }

    return [];

}


// ==========================================================
// VALIDATE ITEM IDS
// ==========================================================

function validateItemIds(
    itemIds
) {

    const ids =
        normalizeIdArray(
            itemIds
        );


    if (!ids.length) {

        throw createError(
            "No items were selected.",
            400
        );

    }


    const invalid =
        ids.find(
            id =>
                !isValidObjectId(id)
        );


    if (invalid) {

        throw createError(
            "One or more selected item IDs are invalid.",
            400
        );

    }


    return ids;

}


// ==========================================================
// FIND PARENT FARM
// ==========================================================

async function findParentFarm(
    dairyId
) {

    if (
        !isValidObjectId(
            dairyId
        )
    ) {

        throw createError(
            "Invalid Dairy Farm ID.",
            400
        );

    }


    const dairy =
        await Dairy.findById(
            dairyId
        );


    if (!dairy) {

        throw createError(
            "Dairy Farm not found.",
            404
        );

    }


    // ======================================================
    // A FARM HAS A NEGATIVE CODE
    // ======================================================

    if (

        dairy.code === null ||

        dairy.code === undefined ||

        Number(dairy.code) >= 0

    ) {

        throw createError(
            "The selected Dairy record is not a Dairy Farm.",
            400
        );

    }


    return dairy;

}


// ==========================================================
// FIND STORAGE BELONGING TO FARM
// ==========================================================
//
// The storage ID alone is NOT trusted.
//
// We verify:
//
//     storage._id
//     storage.farmCode === dairy.code
//
// ==========================================================

async function findStorageForFarm({

    dairy,

    storageId

}) {

    if (
        !isValidObjectId(
            storageId
        )
    ) {

        throw createError(
            "Invalid storage facility ID.",
            400
        );

    }


    const storage =
        await DairyStorage.findOne({

            _id:
                storageId,

            farmCode:
                dairy.code

        });


    if (!storage) {

        throw createError(
            "Storage facility not found for this Dairy Farm.",
            404
        );

    }


    return storage;

}


// ==========================================================
// GET STORAGE CONTENTS
// ==========================================================
//
// RETURNS:
//
//     {
//         dairy,
//         storage,
//         items,
//         itemCount,
//         availableItems,
//         targetStorages
//     }
//
// ==========================================================

async function getStorageContents({

    dairyId,

    storageId

}) {

    // ======================================================
    // FIND FARM
    // ======================================================

    const dairy =
        await findParentFarm(
            dairyId
        );


    // ======================================================
    // FIND STORAGE
    // ======================================================

    const storage =
        await findStorageForFarm({

            dairy,

            storageId

        });


    // ======================================================
    // FIND CURRENT CONTENTS
    // ======================================================

    const items =
        await Dairy.find({

            assetCode:
                dairy.code,

            dwellNumber:
                storage.roomNumber

        })
        .sort({

            code: 1,

            name: 1

        });


    // ======================================================
    // FIND ITEMS AVAILABLE FOR ADDITION
    // ======================================================
    //
    // These are records belonging to this farm that have
    // an assetCode but are currently not allocated.
    //
    // ======================================================

    const availableItems =
        await Dairy.find({

            assetCode:
                dairy.code,

            dwellNumber:
                null

        })
        .sort({

            code: 1,

            name: 1

        });


    // ======================================================
    // FIND TARGET STORAGE FACILITIES
    // ======================================================
    //
    // Reshuffling is restricted to the SAME storage type.
    //
    // If current storage is a Room:
    //
    //     only Rooms
    //
    // If current storage is an AgroStore:
    //
    //     only AgroStores
    //
    // ======================================================

    const targetStorages =
        await DairyStorage.find({

            farmCode:
                dairy.code,

            type:
                storage.type,

            status:
                "active"

        })
        .sort({

            roomNumber: 1

        });


    // ======================================================
    // REMOVE CURRENT STORAGE FROM RESHUFFLE OPTIONS
    // ======================================================
    //
    // There is no point reshuffling an item to the storage
    // it is already in.
    //
    // ======================================================

    const filteredTargetStorages =
        targetStorages.filter(
            target =>
                String(target._id) !==
                String(storage._id)
        );


    // ======================================================
    // RETURN
    // ======================================================

    return {

        dairy,

        storage,

        items,

        itemCount:
            items.length,

        availableItems,

        targetStorages:
            filteredTargetStorages

    };

}


// ==========================================================
// GET AVAILABLE ITEMS
// ==========================================================
//
// This is separated from getStorageContents so the
// controller can request the available items independently
// if needed later.
//
// ==========================================================

async function getAvailableItems({

    dairyId,

    storageId

}) {

    // ======================================================
    // FIND FARM
    // ======================================================

    const dairy =
        await findParentFarm(
            dairyId
        );


    // ======================================================
    // VERIFY STORAGE BELONGS TO FARM
    // ======================================================

    await findStorageForFarm({

        dairy,

        storageId

    });


    // ======================================================
    // FIND UNALLOCATED ITEMS
    // ======================================================

    const items =
        await Dairy.find({

            assetCode:
                dairy.code,

            dwellNumber:
                null

        })
        .sort({

            code: 1,

            name: 1

        });


    return {

        dairy,

        items

    };

}


// ==========================================================
// ADD ITEMS TO STORAGE
// ==========================================================
//
// PARAMETERS:
//
//     dairyId
//     storageId
//     itemIds
//
// OPERATION:
//
//     dwellNumber = storage.roomNumber
//
// assetCode DOES NOT change.
//
// ==========================================================

async function addItemsToStorage({

    dairyId,

    storageId,

    itemIds

}) {

    // ======================================================
    // VALIDATE ITEM IDS
    // ======================================================

    const ids =
        validateItemIds(
            itemIds
        );


    // ======================================================
    // FIND FARM
    // ======================================================

    const dairy =
        await findParentFarm(
            dairyId
        );


    // ======================================================
    // FIND STORAGE
    // ======================================================

    const storage =
        await findStorageForFarm({

            dairy,

            storageId

        });


    // ======================================================
    // ONLY ACTIVE STORAGE CAN RECEIVE ITEMS
    // ======================================================

    if (
        storage.status !==
        "active"
    ) {

        throw createError(
            "Items cannot be added to an inactive storage facility.",
            400
        );

    }


    // ======================================================
    // FIND SELECTED ITEMS
    // ======================================================

    const items =
        await Dairy.find({

            _id: {
                $in: ids
            },

            assetCode:
                dairy.code,

            dwellNumber:
                null

        });


    // ======================================================
    // VERIFY ALL SELECTED ITEMS WERE FOUND
    // ======================================================

    if (
        items.length !==
        ids.length
    ) {

        throw createError(
            "One or more selected items are invalid, belong to another farm, or are already allocated.",
            400
        );

    }


    // ======================================================
    // ALLOCATE ITEMS
    // ======================================================

    const result =
        await Dairy.updateMany(

            {

                _id: {
                    $in: ids
                },

                assetCode:
                    dairy.code,

                dwellNumber:
                    null

            },

            {

                $set: {

                    dwellNumber:
                        storage.roomNumber

                }

            }

        );


    // ======================================================
    // RETURN
    // ======================================================

    return {

        modifiedCount:
            result.modifiedCount,

        dairy,

        storage,

        items

    };

}


// ==========================================================
// OMIT ITEMS FROM STORAGE
// ==========================================================
//
// PARAMETERS:
//
//     dairyId
//     storageId
//     itemIds
//
// OPERATION:
//
//     dwellNumber = null
//
// assetCode remains untouched.
//
// ==========================================================

async function omitItemsFromStorage({

    dairyId,

    storageId,

    itemIds

}) {

    // ======================================================
    // VALIDATE IDS
    // ======================================================

    const ids =
        validateItemIds(
            itemIds
        );


    // ======================================================
    // FIND FARM
    // ======================================================

    const dairy =
        await findParentFarm(
            dairyId
        );


    // ======================================================
    // FIND STORAGE
    // ======================================================

    const storage =
        await findStorageForFarm({

            dairy,

            storageId

        });


    // ======================================================
    // VERIFY ITEMS CURRENTLY BELONG TO THIS STORAGE
    // ======================================================

    const items =
        await Dairy.find({

            _id: {
                $in: ids
            },

            assetCode:
                dairy.code,

            dwellNumber:
                storage.roomNumber

        });


    // ======================================================
    // ALL SELECTED ITEMS MUST BELONG HERE
    // ======================================================

    if (
        items.length !==
        ids.length
    ) {

        throw createError(
            "One or more selected items do not belong to this storage facility.",
            400
        );

    }


    // ======================================================
    // REMOVE FROM STORAGE
    // ======================================================

    const result =
        await Dairy.updateMany(

            {

                _id: {
                    $in: ids
                },

                assetCode:
                    dairy.code,

                dwellNumber:
                    storage.roomNumber

            },

            {

                $set: {

                    dwellNumber:
                        null

                }

            }

        );


    // ======================================================
    // RETURN
    // ======================================================

    return {

        modifiedCount:
            result.modifiedCount,

        dairy,

        storage,

        items

    };

}


// ==========================================================
// RESHUFFLE ITEMS
// ==========================================================
//
// PARAMETERS:
//
//     dairyId
//     storageId
//     targetStorageId
//     itemIds
//
// OPERATION:
//
//     dwellNumber = targetStorage.roomNumber
//
// ==========================================================

async function reshuffleItems({

    dairyId,

    storageId,

    targetStorageId,

    itemIds

}) {

    // ======================================================
    // VALIDATE IDS
    // ======================================================

    const ids =
        validateItemIds(
            itemIds
        );


    // ======================================================
    // VALIDATE TARGET STORAGE ID
    // ======================================================

    if (
        !isValidObjectId(
            targetStorageId
        )
    ) {

        throw createError(
            "Invalid target storage facility ID.",
            400
        );

    }


    // ======================================================
    // FIND FARM
    // ======================================================

    const dairy =
        await findParentFarm(
            dairyId
        );


    // ======================================================
    // FIND CURRENT STORAGE
    // ======================================================

    const storage =
        await findStorageForFarm({

            dairy,

            storageId

        });


    // ======================================================
    // FIND TARGET STORAGE
    // ======================================================

    const targetStorage =
        await findStorageForFarm({

            dairy,

            storageId:
                targetStorageId

        });


    // ======================================================
    // TARGET MUST BE ACTIVE
    // ======================================================

    if (
        targetStorage.status !==
        "active"
    ) {

        throw createError(
            "The target storage facility is inactive.",
            400
        );

    }


    // ======================================================
    // TARGET MUST BE DIFFERENT
    // ======================================================

    if (
        String(targetStorage._id) ===
        String(storage._id)
    ) {

        throw createError(
            "The target storage facility must be different from the current storage.",
            400
        );

    }


    // ======================================================
    // TARGET MUST HAVE SAME TYPE
    // ======================================================
    //
    // Room → Room
    //
    // AgroStore → AgroStore
    //
    // ======================================================

    if (
        targetStorage.type !==
        storage.type
    ) {

        throw createError(
            "Items can only be reshuffled between storage facilities of the same type.",
            400
        );

    }


    // ======================================================
    // VERIFY SELECTED ITEMS ARE CURRENTLY HERE
    // ======================================================

    const items =
        await Dairy.find({

            _id: {
                $in: ids
            },

            assetCode:
                dairy.code,

            dwellNumber:
                storage.roomNumber

        });


    // ======================================================
    // ALL SELECTED ITEMS MUST BELONG TO CURRENT STORAGE
    // ======================================================

    if (
        items.length !==
        ids.length
    ) {

        throw createError(
            "One or more selected items do not belong to this storage facility.",
            400
        );

    }


    // ======================================================
    // MOVE ITEMS
    // ======================================================

    const result =
        await Dairy.updateMany(

            {

                _id: {
                    $in: ids
                },

                assetCode:
                    dairy.code,

                dwellNumber:
                    storage.roomNumber

            },

            {

                $set: {

                    dwellNumber:
                        targetStorage.roomNumber

                }

            }

        );


    // ======================================================
    // RETURN
    // ======================================================

    return {

        modifiedCount:
            result.modifiedCount,

        dairy,

        storage,

        targetStorage,

        items

    };

}


// ==========================================================
// EXPORT
// ==========================================================

module.exports = {

    getStorageContents,

    getAvailableItems,

    addItemsToStorage,

    omitItemsFromStorage,

    reshuffleItems

};