// ==========================================================
// services/storage/contents.js
// STORAGE CONTENTS SERVICE
// ==========================================================
//
// SINGLE SOURCE OF TRUTH:
//
//     models/dairy.js
//
// URL:
//
//     /storage/:dairyId/contents/:storageId
//
// ----------------------------------------------------------
// STORAGE TYPES
// ----------------------------------------------------------
//
//     room
//     agroStore
//
// ----------------------------------------------------------
// RECORD TYPES
// ----------------------------------------------------------
//
// STORAGE STRUCTURE:
//
//     recordType === "structure"
//
// NORMAL ROOM ITEM:
//
//     recordType !== "structure"
//     type !== "feeds"
//
// AGROSTORE FEED:
//
//     recordType !== "structure"
//     type === "feeds"
//     dwellNumber === storage.roomNumber
//     quantity > 0
//
// IMPORTANT:
//
//     AgroStore contents are REAL Dairy records.
//     Nothing is hardcoded.
//
// ==========================================================

const mongoose = require("mongoose");

const Dairy = require("../../models/dairy");


// ==========================================================
// CONSTANTS
// ==========================================================

const STRUCTURE_RECORD_TYPE = "structure";

const ROOM_TYPE = "room";

const AGROSTORE_TYPE = "agroStore";

const FEED_TYPE = "feeds";

const ACTIVE_STATUS = "active";


// ==========================================================
// ERROR HELPER
// ==========================================================

function createError(message, statusCode = 400) {

    const error = new Error(message);

    error.status = statusCode;

    error.statusCode = statusCode;

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
            : (
                value !== undefined &&
                value !== null &&
                String(value).trim() !== ""
            )
                ? [value]
                : [];

    return [
        ...new Set(
            values
                .filter(
                    value =>
                        value !== null &&
                        value !== undefined &&
                        String(value).trim() !== ""
                )
                .map(
                    value =>
                        String(value).trim()
                )
        )
    ];
}


// ==========================================================
// VALIDATE ITEM IDS
// ==========================================================

function validateItemIds(itemIds) {

    const ids =
        normalizeIdArray(itemIds);

    if (ids.length === 0) {

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
// STORAGE TYPE
// ==========================================================

function getStorageType(storage) {

    return typeof storage?.type === "string"
        ? storage.type.trim()
        : "";
}


// ==========================================================
// VALID STORAGE TYPE
// ==========================================================

function isValidStorageType(storage) {

    const type =
        getStorageType(storage);

    return (
        type === ROOM_TYPE ||
        type === AGROSTORE_TYPE
    );
}


// ==========================================================
// AGROSTORE CHECK
// ==========================================================

function isAgroStore(storage) {

    return (
        getStorageType(storage) ===
        AGROSTORE_TYPE
    );
}


// ==========================================================
// NORMAL ROOM CHECK
// ==========================================================

function isNormalRoom(storage) {

    return (
        getStorageType(storage) ===
        ROOM_TYPE
    );
}


// ==========================================================
// STORAGE STRUCTURE CHECK
// ==========================================================

function isStorageStructure(item) {

    return Boolean(
        item &&
        String(item.recordType || "").trim() ===
        STRUCTURE_RECORD_TYPE
    );
}


// ==========================================================
// FEED CHECK
// ==========================================================
//
// Accept both:
//
//     feeds
//     feed
//
// This keeps the service compatible with existing records.
//
// ==========================================================

function isFeed(item) {

    if (!item) {

        return false;
    }

    const type =
        String(item.type || "")
            .trim()
            .toLowerCase();

    return (
        type === "feeds" ||
        type === "feed"
    );
}


// ==========================================================
// AGROSTORE ITEM CHECK
// ==========================================================
//
// AgroStore content eligibility:
//
//     dwellNumber === storage.roomNumber
//     quantity > 0
//     recordType !== structure
//     type === feeds/feed
//
// ==========================================================

function isAgroStoreItem(
    item,
    roomNumber = null
) {

    if (!item) {

        return false;
    }

    if (isStorageStructure(item)) {

        return false;
    }

    if (!isFeed(item)) {

        return false;
    }

    if (
        roomNumber !== null &&
        roomNumber !== undefined
    ) {

        if (
            String(item.dwellNumber ?? "").trim() !==
            String(roomNumber).trim()
        ) {

            return false;
        }
    }

    const quantity =
        Number(item.quantity);

    return (
        Number.isFinite(quantity) &&
        quantity > 0
    );
}


// ==========================================================
// ACTIVE STORAGE CHECK
// ==========================================================

function isActiveStorage(storage) {

    return (
        typeof storage?.status === "string" &&
        storage.status.trim() === ACTIVE_STATUS
    );
}


// ==========================================================
// STORAGE ROOM NUMBER
// ==========================================================

function getStorageRoomNumber(storage) {

    if (!storage) {

        return null;
    }

    if (
        storage.roomNumber === null ||
        storage.roomNumber === undefined
    ) {

        return null;
    }

    const value =
        String(storage.roomNumber).trim();

    return value !== ""
        ? value
        : null;
}


// ==========================================================
// FIND PARENT FARM
// ==========================================================

async function findParentFarm(dairyId) {

    if (!isValidObjectId(dairyId)) {

        throw createError(
            "Invalid Dairy Farm ID.",
            400
        );
    }

    const dairy =
        await Dairy.findById(dairyId)
            .lean();

    if (!dairy) {

        throw createError(
            "Dairy Farm not found.",
            404
        );
    }

    const farmCode =
        Number(dairy.code);

    if (
        !Number.isInteger(farmCode) ||
        farmCode >= 0
    ) {

        throw createError(
            "The selected Dairy record is not a Dairy Farm.",
            400
        );
    }

    return dairy;
}


// ==========================================================
// GET STORAGE ID
// ==========================================================

function getStorageId(options = {}) {

    const value =
        options.storageId ||
        options.itemId;

    return String(value || "").trim();
}


// ==========================================================
// FIND STORAGE FOR FARM
// ==========================================================

async function findStorageForFarm({
    dairy,
    storageId,
    itemId
}) {

    const resolvedStorageId =
        getStorageId({
            storageId,
            itemId
        });

    if (!isValidObjectId(resolvedStorageId)) {

        throw createError(
            "Invalid storage facility ID.",
            400
        );
    }

    const storage =
        await Dairy.findOne({

            _id:
                resolvedStorageId,

            recordType:
                STRUCTURE_RECORD_TYPE,

            assetCode:
                dairy.code,

            type: {
                $in: [
                    ROOM_TYPE,
                    AGROSTORE_TYPE
                ]
            }

        })
        .lean();

    if (!storage) {

        throw createError(
            "Storage facility not found for this Dairy Farm.",
            404
        );
    }

    if (!isStorageStructure(storage)) {

        throw createError(
            "The selected storage facility is not a structure.",
            400
        );
    }

    if (!isValidStorageType(storage)) {

        throw createError(
            "Storage type must be either room or agroStore.",
            400
        );
    }

    const roomNumber =
        getStorageRoomNumber(storage);

    if (roomNumber === null) {

        throw createError(
            "The selected storage facility does not have a valid Room Number.",
            400
        );
    }

    return storage;
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
// NORMAL ROOM ITEM FILTER
// ==========================================================

function normalRoomItemFilter() {

    return {

        type: {
            $ne:
                FEED_TYPE
        },

        recordType: {
            $ne:
                STRUCTURE_RECORD_TYPE
        }

    };
}


// ==========================================================
// AGROSTORE ITEM FILTER
// ==========================================================
//
// THIS IS THE IMPORTANT FIX.
//
// AgroStore contents MUST explicitly select feed records.
//
//     dwellNumber === roomNumber
//     quantity > 0
//     type === feeds
//     recordType !== structure
//
// ==========================================================

function agroStoreItemFilter(roomNumber) {

    return {

        dwellNumber:
            roomNumber,

        quantity: {
            $gt:
                0
        },

        type: {
            $in: [
                "feeds",
                "feed"
            ]
        },

        recordType: {
            $ne:
                STRUCTURE_RECORD_TYPE
        }

    };
}


// ==========================================================
// AGROSTORE CONTENT FILTER
// ==========================================================

function agroStoreContentFilter(roomNumber) {

    return agroStoreItemFilter(
        roomNumber
    );
}


// ==========================================================
// STORAGE CONTENT TYPE FILTER
// ==========================================================

function storageItemTypeFilter(storage) {

    if (isAgroStore(storage)) {

        const roomNumber =
            getStorageRoomNumber(storage);

        return agroStoreContentFilter(
            roomNumber
        );
    }

    if (isNormalRoom(storage)) {

        return normalRoomItemFilter();
    }

    throw createError(
        "Storage type must be either room or agroStore.",
        400
    );
}


// ==========================================================
// CURRENT CONTENT FILTER
// ==========================================================

function currentContentFilter({
    dairy,
    storage
}) {

    const roomNumber =
        getStorageRoomNumber(storage);

    if (roomNumber === null) {

        throw createError(
            "Storage Room Number is missing.",
            400
        );
    }

    return {

        ...farmItemFilter(dairy),

        ...storageItemTypeFilter(storage)

    };
}


// ==========================================================
// AVAILABLE ITEM FILTER
// ==========================================================
//
// Items which are not currently allocated.
//
// For AgroStore this remains the available pool from which
// feeds can be selected.
//
// ==========================================================

function availableItemFilter({
    dairy,
    storage
}) {

    const filter = {

        ...farmItemFilter(dairy),

        $or: [

            {
                dwellNumber: {
                    $exists:
                        false
                }
            },

            {
                dwellNumber:
                    null
            },

            {
                dwellNumber:
                    ""
            }

        ]

    };

    if (isAgroStore(storage)) {

        Object.assign(
            filter,
            {
                type: {
                    $in: [
                        "feeds",
                        "feed"
                    ]
                },

                recordType: {
                    $ne:
                        STRUCTURE_RECORD_TYPE
                }
            }
        );

        return filter;
    }

    if (isNormalRoom(storage)) {

        Object.assign(
            filter,
            normalRoomItemFilter()
        );

        return filter;
    }

    throw createError(
        "Storage type must be either room or agroStore.",
        400
    );
}


// ==========================================================
// GET TARGET STORAGES
// ==========================================================

async function getTargetStorages({
    dairy,
    storage
}) {

    const storageType =
        getStorageType(storage);

    if (
        storageType !== ROOM_TYPE &&
        storageType !== AGROSTORE_TYPE
    ) {

        throw createError(
            "Storage type must be either room or agroStore.",
            400
        );
    }

    const targetStorages =
        await Dairy.find({

            recordType:
                STRUCTURE_RECORD_TYPE,

            assetCode:
                dairy.code,

            type:
                storageType,

            status:
                ACTIVE_STATUS,

            _id: {
                $ne:
                    storage._id
            }

        })
        .sort({
            roomNumber:
                1
        })
        .lean();

    return targetStorages;
}


// ==========================================================
// GET STORAGE CONTENTS
// ==========================================================

async function getStorageContents({
    dairyId,
    storageId,
    itemId
}) {

    const dairy =
        await findParentFarm(
            dairyId
        );

    const storage =
        await findStorageForFarm({

            dairy,

            storageId,

            itemId

        });

    const items =
        await Dairy.find(
            currentContentFilter({

                dairy,

                storage

            })
        )
        .sort({

            code:
                1,

            name:
                1

        })
        .lean();


    // ------------------------------------------------------
    // SAFETY FILTER
    // ------------------------------------------------------
    //
    // The database query already filters these records.
    // This additional check guarantees that the returned
    // AgroStore list contains only genuine positive-quantity
    // feeds.
    //
    // ------------------------------------------------------

    const finalItems =
        isAgroStore(storage)

            ? items.filter(
                item =>
                    isAgroStoreItem(
                        item,
                        getStorageRoomNumber(storage)
                    )
            )

            : items;


    const availableItems =
        await Dairy.find(
            availableItemFilter({

                dairy,

                storage

            })
        )
        .sort({

            code:
                1,

            name:
                1

        })
        .lean();


    const targetStorages =
        await getTargetStorages({

            dairy,

            storage

        });


    return {

        dairy,

        storage,

        items:
            finalItems,

        itemCount:
            finalItems.length,

        availableItems,

        targetStorages

    };
}


// ==========================================================
// GET SINGLE CONTENT ITEM DETAILS
// ==========================================================

async function getContentItemDetails({
    dairyId,
    storageId,
    itemId
}) {

    if (!isValidObjectId(itemId)) {

        throw createError(
            "Invalid content item ID.",
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

    const contentFilter =
        currentContentFilter({

            dairy,

            storage

        });

    const item =
        await Dairy.findOne({

            _id:
                itemId,

            ...contentFilter

        })
        .lean();

    if (!item) {

        throw createError(
            "The selected item was not found in this storage facility.",
            404
        );
    }

    return {

        dairy,

        storage,

        item

    };
}


// ==========================================================
// GET AVAILABLE ITEMS
// ==========================================================

async function getAvailableItems({
    dairyId,
    storageId,
    itemId
}) {

    const dairy =
        await findParentFarm(
            dairyId
        );

    const storage =
        await findStorageForFarm({

            dairy,

            storageId,

            itemId

        });

    const items =
        await Dairy.find(
            availableItemFilter({

                dairy,

                storage

            })
        )
        .sort({

            code:
                1,

            name:
                1

        })
        .lean();

    return {

        dairy,

        storage,

        items

    };
}


// ==========================================================
// ADD ITEMS TO STORAGE
// ==========================================================

async function addItemsToStorage({
    dairyId,
    storageId,
    itemId,
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

            storageId,

            itemId

        });

    if (!isActiveStorage(storage)) {

        throw createError(
            "Items cannot be added to an inactive storage facility.",
            400
        );
    }

    const roomNumber =
        getStorageRoomNumber(storage);

    const items =
        await Dairy.find({

            _id: {
                $in:
                    ids
            },

            ...availableItemFilter({

                dairy,

                storage

            })

        })
        .lean();

    if (items.length !== ids.length) {

        if (isAgroStore(storage)) {

            throw createError(
                "One or more selected items do not belong to this Dairy Farm, are not feeds, or are already allocated.",
                400
            );
        }

        throw createError(
            "One or more selected items do not belong to this Dairy Farm, are already allocated, are feeds, or are storage structures.",
            400
        );
    }

    const result =
        await Dairy.updateMany(

            {

                _id: {
                    $in:
                        ids
                },

                ...availableItemFilter({

                    dairy,

                    storage

                })

            },

            {

                $set: {

                    dwellNumber:
                        roomNumber

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
    itemId,
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

            storageId,

            itemId

        });

    if (isAgroStore(storage)) {

        throw createError(
            "Feeds cannot be manually omitted from an AgroStore. Set the quantity to zero instead.",
            400
        );
    }

    if (!isNormalRoom(storage)) {

        throw createError(
            "Storage type must be either room or agroStore.",
            400
        );
    }

    if (!isActiveStorage(storage)) {

        throw createError(
            "Items cannot be omitted from an inactive storage facility.",
            400
        );
    }

    const roomNumber =
        getStorageRoomNumber(storage);

    const items =
        await Dairy.find({

            _id: {
                $in:
                    ids
            },

            ...farmItemFilter(
                dairy
            ),

            dwellNumber:
                roomNumber,

            ...normalRoomItemFilter()

        })
        .lean();

    if (items.length !== ids.length) {

        throw createError(
            "One or more selected items are not currently in this storage facility.",
            400
        );
    }

    const result =
        await Dairy.updateMany(

            {

                _id: {
                    $in:
                        ids
                },

                ...farmItemFilter(
                    dairy
                ),

                dwellNumber:
                    roomNumber,

                ...normalRoomItemFilter()

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
    itemId,
    targetStorageId,
    itemIds
}) {

    const ids =
        validateItemIds(
            itemIds
        );

    if (!isValidObjectId(targetStorageId)) {

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

            storageId,

            itemId

        });

    const targetStorage =
        await findStorageForFarm({

            dairy,

            storageId:
                targetStorageId

        });

    const currentType =
        getStorageType(storage);

    const targetType =
        getStorageType(targetStorage);

    if (
        currentType !== ROOM_TYPE &&
        currentType !== AGROSTORE_TYPE
    ) {

        throw createError(
            "Storage type must be either room or agroStore.",
            400
        );
    }

    if (
        targetType !== ROOM_TYPE &&
        targetType !== AGROSTORE_TYPE
    ) {

        throw createError(
            "Storage type must be either room or agroStore.",
            400
        );
    }

    if (currentType !== targetType) {

        throw createError(
            "Items can only be reshuffled into a storage facility of the same type.",
            400
        );
    }

    if (!isActiveStorage(storage)) {

        throw createError(
            "The current storage facility is inactive.",
            400
        );
    }

    if (!isActiveStorage(targetStorage)) {

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

    const currentRoomNumber =
        getStorageRoomNumber(storage);

    const targetRoomNumber =
        getStorageRoomNumber(targetStorage);

    if (
        currentRoomNumber === null ||
        targetRoomNumber === null
    ) {

        throw createError(
            "Both storage facilities must have valid Room Numbers.",
            400
        );
    }

    const items =
        await Dairy.find({

            _id: {
                $in:
                    ids
            },

            ...farmItemFilter(
                dairy
            ),

            ...storageItemTypeFilter(
                storage
            )

        })
        .lean();

    if (items.length !== ids.length) {

        if (isAgroStore(storage)) {

            throw createError(
                "One or more selected items are not valid feeds currently stored in this AgroStore.",
                400
            );
        }

        throw createError(
            "One or more selected items are not currently in this storage room.",
            400
        );
    }

    const result =
        await Dairy.updateMany(

            {

                _id: {
                    $in:
                        ids
                },

                ...farmItemFilter(
                    dairy
                ),

                ...storageItemTypeFilter(
                    storage
                )

            },

            {

                $set: {

                    dwellNumber:
                        targetRoomNumber

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

async function updateFeedQuantity({
    dairyId,
    storageId,
    itemId,
    quantity,
    unit
}) {

    if (!isValidObjectId(itemId)) {

        throw createError(
            "Invalid feed item ID.",
            400
        );
    }

    const numericQuantity =
        Number(quantity);

    if (!Number.isFinite(numericQuantity)) {

        throw createError(
            "Quantity must be a valid number.",
            400
        );
    }

    if (numericQuantity < 0) {

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

    if (!isAgroStore(storage)) {

        throw createError(
            "Feed quantity can only be updated for an AgroStore.",
            400
        );
    }

    if (!isActiveStorage(storage)) {

        throw createError(
            "Feed quantity cannot be updated in an inactive AgroStore.",
            400
        );
    }

    const roomNumber =
        getStorageRoomNumber(storage);

    const feed =
        await Dairy.findOne({

            _id:
                itemId,

            ...farmItemFilter(
                dairy
            ),

            dwellNumber:
                roomNumber,

            type: {
                $in: [
                    "feeds",
                    "feed"
                ]
            },

            recordType: {
                $ne:
                    STRUCTURE_RECORD_TYPE
            }

        });

    if (!feed) {

        throw createError(
            "The selected feed was not found in this AgroStore.",
            404
        );
    }

    const update = {

        $set: {

            quantity:
                numericQuantity

        }

    };

    if (
        unit !== undefined &&
        unit !== null &&
        String(unit).trim() !== ""
    ) {

        update.$set.unit =
            String(unit).trim();
    }

    if (numericQuantity === 0) {

        update.$set.dwellNumber =
            null;
    }

    const updatedFeed =
        await Dairy.findOneAndUpdate(

            {

                _id:
                    itemId,

                ...farmItemFilter(
                    dairy
                ),

                dwellNumber:
                    roomNumber,

                type: {
                    $in: [
                        "feeds",
                        "feed"
                    ]
                },

                recordType: {
                    $ne:
                        STRUCTURE_RECORD_TYPE
                }

            },

            update,

            {
                new:
                    true
            }

        )
        .lean();

    if (!updatedFeed) {

        throw createError(
            "The feed could not be updated because its storage allocation changed.",
            409
        );
    }

    return {

        dairy,

        storage,

        item:
            updatedFeed,

        quantity:
            numericQuantity,

        omitted:
            numericQuantity === 0

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
        !Array.isArray(records) ||
        records.length === 0
    ) {

        throw createError(
            "No feed quantities were supplied.",
            400
        );
    }

    const results = [];

    for (const record of records) {

        if (!record) {

            throw createError(
                "One or more feed quantity records are invalid.",
                400
            );
        }

        const result =
            await updateFeedQuantity({

                dairyId,

                storageId,

                itemId:
                    record.itemId,

                quantity:
                    record.quantity,

                unit:
                    record.unit

            });

        results.push(result);
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

    getStorageContents,

    getContentItemDetails,

    getAvailableItems,

    addItemsToStorage,

    omitItemsFromStorage,

    reshuffleItems,

    updateFeedQuantity,

    updateFeedQuantities

};