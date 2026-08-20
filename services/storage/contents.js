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
    // STORAGE PARENT MUST BE A FARM
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

async function getStorageContents({
    dairyId,
    storageId
}) {

    const dairy =
        await findParentFarm(
            dairyId
        );


    const storage =
        await findStorageForFarm({

            dairy,

            storageId

        });


    // ------------------------------------------------------
    // CURRENT CONTENTS
    // ------------------------------------------------------

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


    // ------------------------------------------------------
    // AVAILABLE ITEMS
    // ------------------------------------------------------

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


    // ------------------------------------------------------
    // SAME TYPE TARGETS
    // ------------------------------------------------------

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


    const filteredTargetStorages =
        targetStorages.filter(
            target =>
                String(target._id) !==
                String(storage._id)
        );


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

async function getAvailableItems({
    dairyId,
    storageId
}) {

    const dairy =
        await findParentFarm(
            dairyId
        );


    await findStorageForFarm({

        dairy,

        storageId

    });


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
// ADD ITEMS
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


    const dairy =
        await findParentFarm(
            dairyId
        );


    const storage =
        await findStorageForFarm({

            dairy,

            storageId

        });


    if (
        storage.status !==
        "active"
    ) {

        throw createError(
            "Items cannot be added to an inactive storage facility.",
            400
        );

    }


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


    if (
        items.length !==
        ids.length
    ) {

        throw createError(
            "One or more selected items are invalid, belong to another farm, or are already allocated.",
            400
        );

    }


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


    return {

        modifiedCount:
            result.modifiedCount,

        dairy,

        storage,

        items

    };

}


// ==========================================================
// OMIT ITEMS
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


    const dairy =
        await findParentFarm(
            dairyId
        );


    const storage =
        await findStorageForFarm({

            dairy,

            storageId

        });


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


    if (
        items.length !==
        ids.length
    ) {

        throw createError(
            "One or more selected items do not belong to this storage facility.",
            400
        );

    }


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


    const dairy =
        await findParentFarm(
            dairyId
        );


    const storage =
        await findStorageForFarm({

            dairy,

            storageId

        });


    const targetStorage =
        await findStorageForFarm({

            dairy,

            storageId:
                targetStorageId

        });


    if (
        storage.status !==
        "active"
    ) {

        throw createError(
            "The current storage facility is inactive.",
            400
        );

    }


    if (
        targetStorage.status !==
        "active"
    ) {

        throw createError(
            "The target storage facility is inactive.",
            400
        );

    }


    if (
        String(targetStorage._id) ===
        String(storage._id)
    ) {

        throw createError(
            "The target storage facility must be different from the current storage.",
            400
        );

    }


    if (
        String(targetStorage.type) !==
        String(storage.type)
    ) {

        throw createError(
            "Items can only be reshuffled between storage facilities of the same type.",
            400
        );

    }


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


    if (
        items.length !==
        ids.length
    ) {

        throw createError(
            "One or more selected items do not belong to this storage facility.",
            400
        );

    }


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