// ==========================================================
// services/storage/contents.js
// STORAGE CONTENTS SERVICE
// ==========================================================
//
// STORAGE RULES
// ----------------------------------------------------------
//
// DairyStorage.type:
//
//     "room"
//         = normal room
//
//     "agroStore"
//         = AgroStore
//
// Dairy.type:
//
//     "feeds"
//         = feed item
//
// IMPORTANT:
//
//     AgroStore may contain ONLY Dairy.type === "feeds"
//
//     Normal rooms may contain ANY farm item EXCEPT
//     Dairy.type === "feeds"
//
// These rules are enforced by the backend.
// Frontend filtering is NOT considered security.
// ==========================================================

const mongoose = require("mongoose");

const Dairy = require("../../models/dairy");

const DairyStorage = require("../../models/dairyStorage");

// ==========================================================
// ERROR HELPER
// ==========================================================

function createError(message, statusCode = 400) {

    const error =
        new Error(message);

    error.status =
        statusCode;

    return error;

}

// ==========================================================
// OBJECT ID VALIDATION
// ==========================================================

function isValidObjectId(value) {

    return Boolean(
        value &&
        mongoose.Types.ObjectId.isValid(value)
    );

}

// ==========================================================
// NORMALIZE IDS
// ==========================================================

function normalizeIdArray(value) {

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

function validateItemIds(itemIds) {

    const ids =
        normalizeIdArray(itemIds);

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
// dairyId = parent farm _id
//
// Farm:
//
//     code < 0
//
// Child records:
//
//     assetCode = parent farm code
//
// ==========================================================

async function findParentFarm(dairyId) {

    if (
        !isValidObjectId(dairyId)
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

async function findStorageForFarm({
    dairy,
    storageId
}) {

    if (
        !isValidObjectId(storageId)
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
// CHECK AGROSTORE
// ==========================================================
//
// IMPORTANT:
//
// DairyStorage.type is:
//
//     "agroStore"
//
// NOT:
//
//     "feeds"
//
// "feeds" belongs to Dairy.type.
//
// ==========================================================

function isAgroStore(storage) {

    return (
        storage &&
        String(storage.type)
            .trim()
            .toLowerCase() ===
            "agrostore"
    );

}

// ==========================================================
// CHECK NORMAL ROOM
// ==========================================================

function isNormalRoom(storage) {

    return (
        storage &&
        String(storage.type)
            .trim()
            .toLowerCase() ===
            "room"
    );

}

// ==========================================================
// CHECK FEED
// ==========================================================
//
// Dairy.type:
//
//     "feeds"
//
// ==========================================================

function isFeed(item) {

    return (
        item &&
        String(item.type || "")
            .trim()
            .toLowerCase() ===
            "feeds"
    );

}

// ==========================================================
// FARM ITEM FILTER
// ==========================================================

function farmItemFilter(dairy) {

    return {

        assetCode:
            dairy.code

    };

}

// ==========================================================
// UNALLOCATED ITEM FILTER
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
// AgroStore:
//
//     farm
//     feeds ONLY
//     unallocated
//     quantity > 0
//
// ==========================================================

function agroStoreAvailableItemFilter(dairy) {

    return {

        ...farmItemFilter(dairy),

        type:
            "feeds",

        ...unallocatedItemFilter(),

        quantity: {
            $gt: 0
        }

    };

}

// ==========================================================
// NORMAL ROOM AVAILABLE ITEM FILTER
// ==========================================================
//
// Normal room:
//
//     farm
//     unallocated
//     NOT feeds
//
// ==========================================================

function normalRoomAvailableItemFilter(dairy) {

    return {

        ...farmItemFilter(dairy),

        type: {
            $ne:
                "feeds"
        },

        ...unallocatedItemFilter()

    };

}

// ==========================================================
// GENERAL AVAILABLE ITEM FILTER
// ==========================================================
//
// This is the MAIN BACKEND GATE.
//
// AgroStore:
//
//     ONLY feeds
//
// Room:
//
//     EVERYTHING EXCEPT feeds
//
// ==========================================================

function availableItemFilter({
    dairy,
    storage
}) {

    if (
        isAgroStore(storage)
    ) {

        return agroStoreAvailableItemFilter(
            dairy
        );

    }

    if (
        isNormalRoom(storage)
    ) {

        return normalRoomAvailableItemFilter(
            dairy
        );

    }

    throw createError(
        "Invalid storage type.",
        400
    );

}

// ==========================================================
// GET STORAGE CONTENTS
// ==========================================================

async function getStorageContents({
    dairyId,
    storageId
}) {

    // ------------------------------------------------------
    // FIND FARM
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

    const currentFilter = {

        ...farmItemFilter(dairy),

        dwellNumber:
            storage.roomNumber

    };

    // ------------------------------------------------------
    // AGROSTORE
    // ------------------------------------------------------
    //
    // An AgroStore can only display feeds.
    //
    // This also protects the UI from displaying an invalid
    // non-feed record that may have been allocated by an
    // older version of the application.
    //
    // ------------------------------------------------------

    if (
        isAgroStore(storage)
    ) {

        currentFilter.type =
            "feeds";

    }

    // ------------------------------------------------------
    // NORMAL ROOM
    // ------------------------------------------------------
    //
    // Feeds must never appear as room contents.
    //
    // ------------------------------------------------------

    if (
        isNormalRoom(storage)
    ) {

        currentFilter.type = {

            $ne:
                "feeds"

        };

    }

    const items =
        await Dairy.find(
            currentFilter
        )
        .sort({

            code: 1,

            name: 1

        });

    // ======================================================
    // AVAILABLE ITEMS
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
    // TARGET STORAGES
    // ======================================================
    //
    // Only normal rooms can participate in reshuffling.
    //
    // AgroStore has no reshuffle targets.
    //
    // ======================================================

    let targetStorages = [];

    if (
        isNormalRoom(storage)
    ) {

        const storages =
            await DairyStorage.find({

                farmCode:
                    dairy.code,

                type:
                    "room",

                status:
                    "active"

            })
            .sort({

                roomNumber: 1

            });

        targetStorages =
            storages.filter(

                target =>
                    String(target._id) !==
                    String(storage._id)

            );

    }

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

        targetStorages

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

    const storage =
        await findStorageForFarm({

            dairy,

            storageId

        });

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

        storage,

        items

    };

}

// ==========================================================
// ADD ITEMS TO STORAGE
// ==========================================================
//
// BACKEND ENFORCEMENT:
//
// AgroStore
//     → feeds ONLY
//
// Room
//     → non-feeds ONLY
//
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

    // ------------------------------------------------------
    // STORAGE MUST BE ACTIVE
    // ------------------------------------------------------

    if (
        String(storage.status)
            .trim()
            .toLowerCase() !==
        "active"
    ) {

        throw createError(
            "Items cannot be added to an inactive storage facility.",
            400
        );

    }

    // ======================================================
    // VERIFY ITEMS
    // ======================================================
    //
    // IMPORTANT:
    //
    // The exact same availability filter is used here.
    //
    // Therefore a malicious request cannot bypass the
    // frontend and add the wrong type of item.
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

    if (
        items.length !==
        ids.length
    ) {

        if (
            isAgroStore(storage)
        ) {

            throw createError(
                "One or more selected items are invalid, belong to another farm, are already allocated, are not feeds, or have no remaining quantity.",
                400
            );

        }

        throw createError(
            "One or more selected items are invalid, belong to another farm, are already allocated, or are feeds. Feeds can only be added to an AgroStore.",
            400
        );

    }

    // ======================================================
    // ALLOCATE
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
// OMIT ITEMS FROM NORMAL STORAGE
// ==========================================================
//
// AgroStore:
//
//     NO manual omit
//
// Normal room:
//
//     Allowed
//
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

    // ------------------------------------------------------
    // AGROSTORE DOES NOT USE MANUAL OMIT
    // ------------------------------------------------------

    if (
        isAgroStore(storage)
    ) {

        throw createError(
            "Feeds cannot be manually omitted from an AgroStore. Set the remaining quantity to zero instead.",
            400
        );

    }

    // ======================================================
    // FIND ITEMS
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
                storage.roomNumber,

            type: {
                $ne:
                    "feeds"
            }

        });

    if (
        items.length !==
        ids.length
    ) {

        throw createError(
            "One or more selected items do not belong to this normal storage facility.",
            400
        );

    }

    // ======================================================
    // OMIT
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
                    storage.roomNumber,

                type: {
                    $ne:
                        "feeds"
                }

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
//
// NORMAL ROOM → NORMAL ROOM ONLY.
//
// AgroStore feeds cannot be reshuffled.
//
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
    // VALIDATE TARGET
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

    // ------------------------------------------------------
    // BOTH MUST BE NORMAL ROOMS
    // ------------------------------------------------------

    if (
        !isNormalRoom(storage)
    ) {

        throw createError(
            "AgroStore feeds cannot be reshuffled.",
            400
        );

    }

    if (
        !isNormalRoom(targetStorage)
    ) {

        throw createError(
            "Items can only be reshuffled into a normal room.",
            400
        );

    }

    // ------------------------------------------------------
    // CURRENT STORAGE ACTIVE
    // ------------------------------------------------------

    if (
        String(storage.status)
            .trim()
            .toLowerCase() !==
        "active"
    ) {

        throw createError(
            "The current storage facility is inactive.",
            400
        );

    }

    // ------------------------------------------------------
    // TARGET STORAGE ACTIVE
    // ------------------------------------------------------

    if (
        String(targetStorage.status)
            .trim()
            .toLowerCase() !==
        "active"
    ) {

        throw createError(
            "The target storage facility is inactive.",
            400
        );

    }

    // ------------------------------------------------------
    // SAME STORAGE
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

    // ======================================================
    // VERIFY ITEMS
    // ======================================================
    //
    // Feeds are explicitly excluded.
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
                storage.roomNumber,

            type: {
                $ne:
                    "feeds"
            }

        });

    if (
        items.length !==
        ids.length
    ) {

        throw createError(
            "One or more selected items do not belong to this normal storage facility or are feeds.",
            400
        );

    }

    // ======================================================
    // MOVE
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
                    storage.roomNumber,

                type: {
                    $ne:
                        "feeds"
                }

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
// UPDATE SINGLE FEED QUANTITY
// ==========================================================
//
// ONLY AgroStore.
//
// quantity > 0
//     → remains in AgroStore
//
// quantity === 0
//     → quantity = 0
//     → dwellNumber = null
//
// ==========================================================

async function updateFeedQuantity({
    dairyId,
    storageId,
    itemId,
    quantity
}) {

    if (
        !isValidObjectId(
            itemId
        )
    ) {

        throw createError(
            "Invalid feed item ID.",
            400
        );

    }

    const numericQuantity =
        Number(
            quantity
        );

    if (
        !Number.isFinite(
            numericQuantity
        )
    ) {

        throw createError(
            "Quantity must be a valid number.",
            400
        );

    }

    if (
        numericQuantity < 0
    ) {

        throw createError(
            "Quantity cannot be negative.",
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

    // ------------------------------------------------------
    // ONLY AGROSTORE
    // ------------------------------------------------------

    if (
        !isAgroStore(storage)
    ) {

        throw createError(
            "Feed quantity can only be updated for an AgroStore.",
            400
        );

    }

    // ======================================================
    // FIND FEED
    // ======================================================

    const feed =
        await Dairy.findOne({

            _id:
                itemId,

            ...farmItemFilter(
                dairy
            ),

            type:
                "feeds",

            dwellNumber:
                storage.roomNumber

        });

    if (!feed) {

        throw createError(
            "The selected feed was not found in this AgroStore.",
            404
        );

    }

    // ======================================================
    // ZERO = AUTOMATIC OMIT
    // ======================================================

    if (
        numericQuantity === 0
    ) {

        const updatedFeed =
            await Dairy.findOneAndUpdate(

                {

                    _id:
                        itemId,

                    ...farmItemFilter(
                        dairy
                    ),

                    type:
                        "feeds",

                    dwellNumber:
                        storage.roomNumber

                },

                {

                    $set: {

                        quantity:
                            0,

                        dwellNumber:
                            null

                    }

                },

                {

                    new:
                        true

                }

            );

        return {

            dairy,

            storage,

            item:
                updatedFeed,

            quantity:
                0,

            omitted:
                true

        };

    }

    // ======================================================
    // UPDATE REMAINING QUANTITY
    // ======================================================

    const updatedFeed =
        await Dairy.findOneAndUpdate(

            {

                _id:
                    itemId,

                ...farmItemFilter(
                    dairy
                ),

                type:
                    "feeds",

                dwellNumber:
                    storage.roomNumber

            },

            {

                $set: {

                    quantity:
                        numericQuantity

                }

            },

            {

                new:
                    true

            }

        );

    return {

        dairy,

        storage,

        item:
            updatedFeed,

        quantity:
            numericQuantity,

        omitted:
            false

    };

}

// ==========================================================
// UPDATE MULTIPLE FEED QUANTITIES
// ==========================================================

async function updateFeedQuantities({
    dairyId,
    storageId,
    records
}) {

    if (
        !Array.isArray(
            records
        ) ||
        records.length === 0
    ) {

        throw createError(
            "No feed quantities were supplied.",
            400
        );

    }

    const results = [];

    for (
        const record of records
    ) {

        if (
            !record
        ) {

            continue;

        }

        const result =
            await updateFeedQuantity({

                dairyId,

                storageId,

                itemId:
                    record.itemId,

                quantity:
                    record.quantity

            });

        results.push(
            result
        );

    }

    return {

        dairyId,

        storageId,

        results

    };

}

// ==========================================================
// EXPORT
// ==========================================================

module.exports = {

    // ------------------------------------------------------
    // CONTENTS
    // ------------------------------------------------------

    getStorageContents,

    getAvailableItems,

    addItemsToStorage,

    // ------------------------------------------------------
    // NORMAL STORAGE
    // ------------------------------------------------------

    omitItemsFromStorage,

    reshuffleItems,

    // ------------------------------------------------------
    // AGROSTORE
    // ------------------------------------------------------

    updateFeedQuantity,

    updateFeedQuantities

};