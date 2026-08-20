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
// dairyId is the MongoDB _id of the parent Dairy Farm.
//
// Farm:
//
//     code < 0
//
// Child assets/animals:
//
//     assetCode = parent farm code
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
// DairyStorage belongs to a farm through:
//
//     farmCode = parent farm code
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
// CHECK WHETHER STORAGE IS AGROSTORE
// ==========================================================
//
// AgroStore storage type is represented by:
//
//     type === "feeds"
//
// ==========================================================

function isAgroStore(
    storage
) {

    return (

        storage &&

        String(storage.type)
            .trim()
            .toLowerCase() ===
            "feeds"

    );

}


// ==========================================================
// FARM ITEM FILTER
// ==========================================================
//
// There is NO `farm` field in dairy.js.
//
// Ownership is established through:
//
//     assetCode === parentFarm.code
//
// The parent farm itself was resolved using:
//
//     dairyId === parentFarm._id
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
// An unallocated item has:
//
//     dwellNumber === null
//
// OR:
//
//     dwellNumber does not exist.
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
// AGROSTORE AVAILABLE ITEM FILTER
// ==========================================================
//
// An item may be considered available for an AgroStore ONLY
// when ALL THREE conditions are true:
//
//     1. assetCode belongs to parent farm
//     2. dwellNumber is empty
//     3. type === "feeds"
//
// ==========================================================

function agroStoreAvailableItemFilter(
    dairy
) {

    return {

        ...farmItemFilter(
            dairy
        ),

        type:
            "feeds",

        ...unallocatedItemFilter()

    };

}


// ==========================================================
// GENERAL AVAILABLE ITEM FILTER
// ==========================================================
//
// For non-AgroStore storage:
//
//     assetCode = parent farm code
//     dwellNumber = null/missing
//
// For AgroStore:
//
//     assetCode = parent farm code
//     dwellNumber = null/missing
//     type = feeds
//
// ==========================================================

function availableItemFilter({
    dairy,
    storage
}) {

    if (
        isAgroStore(
            storage
        )
    ) {

        return agroStoreAvailableItemFilter(
            dairy
        );

    }


    return {

        ...farmItemFilter(
            dairy
        ),

        ...unallocatedItemFilter()

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
    // FIND PARENT FARM
    // ------------------------------------------------------

    const dairy =
        await findParentFarm(
            dairyId
        );


    // ------------------------------------------------------
    // FIND STORAGE
    // ------------------------------------------------------

    const storage =
        await findStorageForFarm({

            dairy,

            storageId

        });


    // ======================================================
    // CURRENT CONTENTS
    // ======================================================
    //
    // The contents must belong to this parent farm and must
    // occupy this storage's dwellNumber.
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
    // IMPORTANT:
    //
    // `availableItems` is NOT a schema field.
    //
    // It is generated by this query.
    //
    // AgroStore:
    //
    //     assetCode = farm code
    //     no dwellNumber
    //     type = feeds
    //
    // Other storage:
    //
    //     assetCode = farm code
    //     no dwellNumber
    //
    // ======================================================

    const availableItems =
        await Dairy.find(

            availableItemFilter({

                dairy,

                storage

            })

        )
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
    // REMOVE CURRENT STORAGE
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

async function getAvailableItems({
    dairyId,
    storageId
}) {

    // ------------------------------------------------------
    // FIND PARENT FARM
    // ------------------------------------------------------

    const dairy =
        await findParentFarm(
            dairyId
        );


    // ------------------------------------------------------
    // FIND STORAGE
    // ------------------------------------------------------

    const storage =
        await findStorageForFarm({

            dairy,

            storageId

        });


    // ------------------------------------------------------
    // FIND AVAILABLE ITEMS
    // ------------------------------------------------------

    const items =
        await Dairy.find(

            availableItemFilter({

                dairy,

                storage

            })

        )
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
    // FIND PARENT FARM
    // ------------------------------------------------------

    const dairy =
        await findParentFarm(
            dairyId
        );


    // ------------------------------------------------------
    // FIND STORAGE
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
    // VERIFY SELECTED ITEMS
    // ======================================================
    //
    // This query enforces ALL rules.
    //
    // Every item must:
    //
    //     belong to this parent farm
    //
    //     AND
    //
    //     have no current allocation
    //
    // AND, if this is an AgroStore:
    //
    //     type === "feeds"
    //
    // ======================================================

    const items =
        await Dairy.find({

            _id: {
                $in: ids
            },

            ...availableItemFilter({

                dairy,

                storage

            })

        });


    // ------------------------------------------------------
    // EVERY REQUESTED ITEM MUST PASS
    // ------------------------------------------------------

    if (
        items.length !==
        ids.length
    ) {

        if (
            isAgroStore(
                storage
            )
        ) {

            throw createError(
                "One or more selected items are invalid, belong to another farm, are already allocated, or are not feeds.",
                400
            );

        }


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

                ...availableItemFilter({

                    dairy,

                    storage

                })

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
    // FIND PARENT FARM
    // ------------------------------------------------------

    const dairy =
        await findParentFarm(
            dairyId
        );


    // ------------------------------------------------------
    // FIND STORAGE
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
    //     belong to this parent farm
    //
    // AND:
    //
    //     currently occupy this storage.
    //
    // We intentionally DO NOT require type === "feeds" here.
    //
    // The item is already allocated to this storage, and the
    // operation should remain capable of removing legacy or
    // previously allocated records safely.
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
    // FIND PARENT FARM
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
    // VERIFY CURRENT ITEMS
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
    // AGROSTORE TARGET VALIDATION
    // ======================================================
    //
    // If the target is an AgroStore, EVERY item being moved
    // into it must be a feed.
    //
    // This protects against bypassing the normal "available
    // items" screen by reshuffling directly.
    //
    // ======================================================

    if (
        isAgroStore(
            targetStorage
        )
    ) {

        const invalidFeed =
            items.find(

                item =>

                    String(item.type)
                        .trim()
                        .toLowerCase() !==
                    "feeds"

            );


        if (invalidFeed) {

            throw createError(
                "Only feeds can be moved into an AgroStore.",
                400
            );

        }

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