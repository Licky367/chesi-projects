// ==========================================================
// services/storage/contents.js
// STORAGE CONTENTS SERVICE
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

    return Boolean(

        value &&

        mongoose.Types.ObjectId.isValid(
            value
        )

    );

}


// ==========================================================
// NORMALIZE IDS
// ==========================================================

function normalizeIdArray(
    value
) {

    const values =
        Array.isArray(value)
            ? value
            : value
                ? [value]
                : [];


    return [

        ...new Set(

            values

                .filter(
                    item =>

                        item !== null &&

                        item !== undefined &&

                        String(item).trim() !== ""

                )

                .map(String)

        )

    ];

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


    if (
        ids.length === 0
    ) {

        throw createError(
            "No items were selected.",
            400
        );

    }


    const invalidId =
        ids.find(
            id =>
                !isValidObjectId(id)
        );


    if (invalidId) {

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
//
// `dairyId` is the actual MongoDB `_id` of the parent farm.
//
// The parent farm itself is identified by:
//
//     code < 0
//
// Its `code` is then used as the ownership identifier for
// child Dairy records through their `assetCode`.
//
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


    // ------------------------------------------------------
    // THE SELECTED RECORD MUST ACTUALLY BE A FARM
    //
    // Farm:
    //
    //     code < 0
    //
    // Animal:
    //
    //     code > 0
    //
    // Structure / Asset:
    //
    //     code === null
    //
    // ------------------------------------------------------

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
// DairyStorage does not use dairy._id according to the
// current storage design.
//
// It uses:
//
//     farmCode = parent Dairy Farm code
//
// Therefore the storage is verified against the parent farm
// resolved from dairyId.
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
// FARM ITEM FILTER
// ==========================================================
//
// IMPORTANT:
//
// There is NO `farm` field in dairy.js.
//
// Ownership is represented by:
//
//     child.assetCode === parentFarm.code
//
// The parent farm itself was resolved using:
//
//     parentFarm._id === dairyId
//
// Therefore this filter guarantees that the item belongs
// to the exact parent farm represented by `dairyId`.
//
// An item must also have an assetCode.
//
// ==========================================================

function farmItemFilter(
    dairy
) {

    return {

        assetCode:
            dairy.code

    };

}


// ==========================================================
// UNALLOCATED ITEM FILTER
// ==========================================================
//
// An available item:
//
//     belongs to the parent farm
//
// AND
//
//     has no dwellNumber
//
// Both situations are supported:
//
//     dwellNumber: null
//
// or:
//
//     dwellNumber field does not exist
//
// ==========================================================

function unallocatedItemFilter() {

    return {

        $or: [

            {
                dwellNumber:
                    null
            },

            {
                dwellNumber: {
                    $exists: false
                }
            }

        ]

    };

}


// ==========================================================
// GET STORAGE CONTENTS
// ==========================================================

async function getStorageContents({
    dairyId,
    storageId
}) {

    // ------------------------------------------------------
    // RESOLVE THE PARENT FARM BY ITS _id
    // ------------------------------------------------------

    const dairy =
        await findParentFarm(
            dairyId
        );


    // ------------------------------------------------------
    // VERIFY STORAGE BELONGS TO THAT FARM
    // ------------------------------------------------------

    const storage =
        await findStorageForFarm({

            dairy,

            storageId

        });


    // ======================================================
    // CURRENT STORAGE CONTENTS
    // ======================================================
    //
    // Every returned item must:
    //
    // 1. Have the parent farm's assetCode
    // 2. Have this storage's dwellNumber
    //
    // ======================================================

    const items =
        await Dairy.find({

            ...farmItemFilter(
                dairy
            ),

            dwellNumber:
                storage.roomNumber

        })
        .sort({

            code: 1,

            name: 1

        });


    // ======================================================
    // AVAILABLE ITEMS
    // ======================================================
    //
    // `availableItems` is NOT a schema field.
    //
    // It is a calculated result.
    //
    // Available means:
    //
    // 1. Belongs to this parent farm
    // 2. Has an assetCode
    // 3. Has no dwellNumber
    //
    // ======================================================

    const availableItems =
        await Dairy.find({

            ...farmItemFilter(
                dairy
            ),

            ...unallocatedItemFilter()

        })
        .sort({

            code: 1,

            name: 1

        });


    // ======================================================
    // TARGET STORAGE FACILITIES
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


    // ------------------------------------------------------
    // DO NOT INCLUDE CURRENT STORAGE
    // ------------------------------------------------------

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
// Returns Dairy records that:
//
//     assetCode = parent farm code
//
// AND:
//
//     dwellNumber = null
//
// or dwellNumber does not exist.
//
// ==========================================================

async function getAvailableItems({
    dairyId,
    storageId
}) {

    // ------------------------------------------------------
    // RESOLVE PARENT FARM
    // ------------------------------------------------------

    const dairy =
        await findParentFarm(
            dairyId
        );


    // ------------------------------------------------------
    // VERIFY STORAGE BELONGS TO PARENT FARM
    // ------------------------------------------------------

    await findStorageForFarm({

        dairy,

        storageId

    });


    // ------------------------------------------------------
    // FIND AVAILABLE ITEMS
    // ------------------------------------------------------

    const items =
        await Dairy.find({

            ...farmItemFilter(
                dairy
            ),

            ...unallocatedItemFilter()

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

async function addItemsToStorage({
    dairyId,
    storageId,
    itemIds
}) {

    const ids =
        validateItemIds(
            itemIds
        );


    // ------------------------------------------------------
    // RESOLVE PARENT FARM
    // ------------------------------------------------------

    const dairy =
        await findParentFarm(
            dairyId
        );


    // ------------------------------------------------------
    // VERIFY STORAGE BELONGS TO FARM
    // ------------------------------------------------------

    const storage =
        await findStorageForFarm({

            dairy,

            storageId

        });


    // ------------------------------------------------------
    // STORAGE MUST BE ACTIVE
    // ------------------------------------------------------

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
    // VERIFY EVERY SELECTED ITEM
    // ======================================================
    //
    // This is the critical ownership check.
    //
    // The selected Dairy record MUST have:
    //
    //     assetCode = dairy.code
    //
    // where `dairy` was obtained using:
    //
    //     Dairy.findById(dairyId)
    //
    // Therefore an item belonging to another farm cannot
    // pass this query.
    //
    // ======================================================

    const items =
        await Dairy.find({

            _id: {
                $in: ids
            },

            ...farmItemFilter(
                dairy
            ),

            ...unallocatedItemFilter()

        });


    // ------------------------------------------------------
    // EVERY REQUESTED ID MUST HAVE BEEN FOUND
    // ------------------------------------------------------

    if (
        items.length !==
        ids.length
    ) {

        throw createError(
            "One or more selected items are invalid, do not belong to this farm, or are already allocated.",
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

                ...farmItemFilter(
                    dairy
                ),

                ...unallocatedItemFilter()

            },

            {

                $set: {

                    dwellNumber:
                        storage.roomNumber

                }

            }

        );


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

async function omitItemsFromStorage({
    dairyId,
    storageId,
    itemIds
}) {

    const ids =
        validateItemIds(
            itemIds
        );


    // ------------------------------------------------------
    // RESOLVE PARENT FARM
    // ------------------------------------------------------

    const dairy =
        await findParentFarm(
            dairyId
        );


    // ------------------------------------------------------
    // VERIFY STORAGE BELONGS TO FARM
    // ------------------------------------------------------

    const storage =
        await findStorageForFarm({

            dairy,

            storageId

        });


    // ======================================================
    // VERIFY ITEMS
    // ======================================================
    //
    // Item must:
    //
    //     belong to this farm
    //
    // AND:
    //
    //     currently occupy this storage
    //
    // ======================================================

    const items =
        await Dairy.find({

            _id: {
                $in: ids
            },

            ...farmItemFilter(
                dairy
            ),

            dwellNumber:
                storage.roomNumber

        });


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

                ...farmItemFilter(
                    dairy
                ),

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

async function reshuffleItems({
    dairyId,
    storageId,
    targetStorageId,
    itemIds
}) {

    const ids =
        validateItemIds(
            itemIds
        );


    // ------------------------------------------------------
    // VALIDATE TARGET STORAGE ID
    // ------------------------------------------------------

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


    // ------------------------------------------------------
    // RESOLVE PARENT FARM
    // ------------------------------------------------------

    const dairy =
        await findParentFarm(
            dairyId
        );


    // ------------------------------------------------------
    // FIND CURRENT STORAGE
    // ------------------------------------------------------

    const storage =
        await findStorageForFarm({

            dairy,

            storageId

        });


    // ------------------------------------------------------
    // FIND TARGET STORAGE
    // ------------------------------------------------------

    const targetStorage =
        await findStorageForFarm({

            dairy,

            storageId:
                targetStorageId

        });


    // ------------------------------------------------------
    // CURRENT STORAGE MUST BE ACTIVE
    // ------------------------------------------------------

    if (
        storage.status !==
        "active"
    ) {

        throw createError(
            "The current storage facility is inactive.",
            400
        );

    }


    // ------------------------------------------------------
    // TARGET STORAGE MUST BE ACTIVE
    // ------------------------------------------------------

    if (
        targetStorage.status !==
        "active"
    ) {

        throw createError(
            "The target storage facility is inactive.",
            400
        );

    }


    // ------------------------------------------------------
    // STORAGE CANNOT BE THE SAME
    // ------------------------------------------------------

    if (
        String(targetStorage._id) ===
        String(storage._id)
    ) {

        throw createError(
            "The target storage facility must be different from the current storage.",
            400
        );

    }


    // ------------------------------------------------------
    // STORAGE TYPES MUST MATCH
    // ------------------------------------------------------

    if (
        String(targetStorage.type) !==
        String(storage.type)
    ) {

        throw createError(
            "Items can only be reshuffled between storage facilities of the same type.",
            400
        );

    }


    // ======================================================
    // VERIFY ITEMS
    // ======================================================
    //
    // Every item MUST:
    //
    //     belong to this parent farm
    //
    // AND:
    //
    //     currently be inside the selected storage.
    //
    // ======================================================

    const items =
        await Dairy.find({

            _id: {
                $in: ids
            },

            ...farmItemFilter(
                dairy
            ),

            dwellNumber:
                storage.roomNumber

        });


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

                ...farmItemFilter(
                    dairy
                ),

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