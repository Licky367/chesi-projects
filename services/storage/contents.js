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
// URL PARAMETERS:
//
//     dairyId
//         = MongoDB _id of the parent Dairy Farm
//
//     storageId
//         = MongoDB _id of the storage structure
//
// STORAGE RECORD:
//
//     recordType === "structure"
//
// STORAGE TYPES:
//
//     type === "room"
//         = Normal Storage Room
//
//     type === "agroStore"
//         = AgroStore
//
// FARM RELATIONSHIP:
//
//     storage.assetCode === farm.code
//
// ITEM/FARM RELATIONSHIP:
//
//     item.assetCode === farm.code
//
// CONTENT LOCATION:
//
//     item.dwellNumber === storage.roomNumber
//
// IMPORTANT:
//
//     roomNumber is the physical storage identifier.
//
//     dwellNumber on an item stores the roomNumber of the
//     storage in which the item currently resides.
//
// ==========================================================


const mongoose =
    require("mongoose");

const Dairy =
    require("../../models/dairy");


// ==========================================================
// CONSTANTS
// ==========================================================

const STRUCTURE_RECORD_TYPE =
    "structure";

const ROOM_TYPE =
    "room";

const AGROSTORE_TYPE =
    "agroStore";

const FEED_TYPE =
    "feeds";

const ACTIVE_STATUS =
    "active";


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

            : value !== undefined &&
              value !== null &&
              String(value).trim() !== ""

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


    if (
        invalidId
    ) {

        throw createError(
            "One or more selected item IDs are invalid.",
            400
        );

    }


    return ids;

}


// ==========================================================
// NORMALIZE STORAGE TYPE
// ==========================================================

function normalizeStorageType(
    storage
) {

    return String(
        storage &&
        storage.type
            ? storage.type
            : ""
    )
    .trim()
    .toLowerCase();

}


// ==========================================================
// STORAGE TYPE CHECKS
// ==========================================================

function isAgroStore(
    storage
) {

    return (

        normalizeStorageType(
            storage
        ) ===
        AGROSTORE_TYPE.toLowerCase()

    );

}


function isNormalRoom(
    storage
) {

    return (

        normalizeStorageType(
            storage
        ) ===
        ROOM_TYPE

    );

}


// ==========================================================
// FEED CHECK
// ==========================================================

function isFeed(
    item
) {

    return (

        item &&

        String(
            item.type || ""
        )
        .trim()
        .toLowerCase() ===
        FEED_TYPE

    );

}


// ==========================================================
// ACTIVE STORAGE CHECK
// ==========================================================

function isActiveStorage(
    storage
) {

    return (

        String(
            storage &&
            storage.status
                ? storage.status
                : ""
        )
        .trim()
        .toLowerCase() ===
        ACTIVE_STATUS

    );

}


// ==========================================================
// STORAGE ROOM NUMBER
// ==========================================================
//
// roomNumber is authoritative.
//
// An item stores this value in dwellNumber.
//
// ==========================================================

function getStorageRoomNumber(
    storage
) {

    if (
        !storage
    ) {

        return null;

    }


    if (
        storage.roomNumber ===
        null ||
        storage.roomNumber ===
        undefined
    ) {

        return null;

    }


    const value =
        String(
            storage.roomNumber
        ).trim();


    return value !== ""
        ? value
        : null;

}


// ==========================================================
// FIND PARENT DAIRY FARM
// ==========================================================
//
// The first URL ID is ALWAYS the MongoDB _id of the
// Dairy Farm.
//
// Dairy Farm:
//
//     code < 0
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
        )
        .lean();


    if (
        !dairy
    ) {

        throw createError(
            "Dairy Farm not found.",
            404
        );

    }


    const farmCode =
        Number(
            dairy.code
        );


    if (
        !Number.isInteger(
            farmCode
        ) ||
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
//
// New URL:
//
//     /storage/:dairyId/contents/:storageId
//
// Older controller compatibility:
//
//     itemId
//
// ==========================================================

function getStorageId(
    options = {}
) {

    const value =
        options.storageId ||
        options.itemId;


    return String(
        value || ""
    ).trim();

}


// ==========================================================
// FIND STORAGE
// ==========================================================
//
// Storage must:
//
//     1. Exist by MongoDB _id
//     2. Be a structure
//     3. Belong to the parent farm
//     4. Be either room or agroStore
//
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


    if (
        !isValidObjectId(
            resolvedStorageId
        )
    ) {

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


    if (
        !storage
    ) {

        throw createError(
            "Storage facility not found for this Dairy Farm.",
            404
        );

    }


    const roomNumber =
        getStorageRoomNumber(
            storage
        );


    if (
        roomNumber === null
    ) {

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
//
// Every farm-owned item is identified by:
//
//     assetCode === farm.code
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
// STORAGE CONTENT TYPE FILTER
// ==========================================================
//
// AgroStore:
//
//     feeds ONLY
//
// Normal Room:
//
//     everything EXCEPT feeds
//
// ==========================================================

function storageItemTypeFilter(
    storage
) {

    if (
        isAgroStore(
            storage
        )
    ) {

        return {

            type:
                FEED_TYPE

        };

    }


    if (
        isNormalRoom(
            storage
        )
    ) {

        return {

            type: {
                $ne:
                    FEED_TYPE
            }

        };

    }


    throw createError(
        "Invalid storage type.",
        400
    );

}


// ==========================================================
// CURRENT CONTENT FILTER
// ==========================================================
//
// THE IMPORTANT LOCATION RULE:
//
//     item.dwellNumber === storage.roomNumber
//
// ==========================================================

function currentContentFilter({
    dairy,
    storage
}) {

    const roomNumber =
        getStorageRoomNumber(
            storage
        );


    if (
        roomNumber === null
    ) {

        throw createError(
            "Storage Room Number is missing.",
            400
        );

    }


    return {

        ...farmItemFilter(
            dairy
        ),

        dwellNumber:
            roomNumber,

        ...storageItemTypeFilter(
            storage
        )

    };

}


// ==========================================================
// AVAILABLE ITEM FILTER
// ==========================================================
//
// "Add Items" is based on farm ownership:
//
//     assetCode === farm.code
//
// AgroStore:
//
//     type === "feeds"
//
// Normal room:
//
//     type !== "feeds"
//
// NOTE:
//
// No dwellNumber condition is applied here.
//
// The requested Add Items list therefore contains ALL
// farm-owned eligible dairies, regardless of their current
// dwellNumber.
//
// ==========================================================

function availableItemFilter({
    dairy,
    storage
}) {

    return {

        ...farmItemFilter(
            dairy
        ),

        ...storageItemTypeFilter(
            storage
        )

    };

}


// ==========================================================
// GET TARGET STORAGES
// ==========================================================
//
// Reshuffle destination:
//
//     SAME TYPE AS CURRENT STORAGE
//
// Room:
//
//     room → room
//
// AgroStore:
//
//     agroStore → agroStore
//
// Target storage must belong to the same farm.
//
// ==========================================================

async function getTargetStorages({
    dairy,
    storage
}) {

    const storageType =
        normalizeStorageType(
            storage
        );


    if (
        storageType !== ROOM_TYPE &&
        storageType !== AGROSTORE_TYPE
    ) {

        throw createError(
            "Invalid storage type.",
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
                storageType ===
                AGROSTORE_TYPE

                    ? AGROSTORE_TYPE
                    : ROOM_TYPE,

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

    // ------------------------------------------------------
    // PARENT FARM
    // ------------------------------------------------------

    const dairy =
        await findParentFarm(
            dairyId
        );


    // ------------------------------------------------------
    // STORAGE
    // ------------------------------------------------------

    const storage =
        await findStorageForFarm({

            dairy,

            storageId,

            itemId

        });


    // ------------------------------------------------------
    // CURRENT CONTENTS
    // ------------------------------------------------------

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
    // AVAILABLE ITEMS
    // ------------------------------------------------------

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


    // ------------------------------------------------------
    // RESHUFFLE TARGETS
    // ------------------------------------------------------

    const targetStorages =
        await getTargetStorages({

            dairy,

            storage

        });


    // ------------------------------------------------------
    // RETURN
    // ------------------------------------------------------

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
//
// Allocation:
//
//     item.dwellNumber = storage.roomNumber
//
// AgroStore:
//
//     ONLY type === "feeds"
//
// Normal room:
//
//     ONLY non-feeds
//
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


    // ------------------------------------------------------
    // STORAGE MUST BE ACTIVE
    // ------------------------------------------------------

    if (
        !isActiveStorage(
            storage
        )
    ) {

        throw createError(
            "Items cannot be added to an inactive storage facility.",
            400
        );

    }


    const roomNumber =
        getStorageRoomNumber(
            storage
        );


    // ======================================================
    // VERIFY SELECTED ITEMS
    // ======================================================

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
                "One or more selected items do not belong to this Dairy Farm or are not feeds.",
                400
            );

        }


        throw createError(
            "One or more selected items do not belong to this Dairy Farm or are feeds. Feeds can only be added to an AgroStore.",
            400
        );

    }


    // ======================================================
    // ALLOCATE
    // ======================================================
    //
    // IMPORTANT:
    //
    // We deliberately do NOT check the old dwellNumber.
    //
    // Add Items displays all farm-owned eligible items.
    // Selecting an item assigns it to this storage.
    //
    // ======================================================

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
//
// The omission rule is simple:
//
//     selected item.dwellNumber = null
//
// AgroStore:
//
//     manual omit is not allowed.
//
// Quantity zero is the AgroStore omission mechanism.
//
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


    if (
        isAgroStore(
            storage
        )
    ) {

        throw createError(
            "Feeds cannot be manually omitted from an AgroStore. Set the remaining quantity to zero instead.",
            400
        );

    }


    if (
        !isNormalRoom(
            storage
        )
    ) {

        throw createError(
            "Invalid storage type.",
            400
        );

    }


    const roomNumber =
        getStorageRoomNumber(
            storage
        );


    // ======================================================
    // VERIFY ITEMS ARE CURRENTLY IN THIS STORAGE
    // ======================================================

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

            ...storageItemTypeFilter(
                storage
            )

        })
        .lean();


    if (
        items.length !==
        ids.length
    ) {

        throw createError(
            "One or more selected items are not currently in this storage facility.",
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
                    $in:
                        ids
                },

                ...farmItemFilter(
                    dairy
                ),

                dwellNumber:
                    roomNumber,

                ...storageItemTypeFilter(
                    storage
                )

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
// Current storage type MUST equal target storage type.
//
// ROOM:
//
//     room → room
//
// AGROSTORE:
//
//     agroStore → agroStore
//
// The selected item's dwellNumber becomes the target
// storage's roomNumber.
//
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


    // ------------------------------------------------------
    // TARGET STORAGE ID
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
    // PARENT FARM
    // ------------------------------------------------------

    const dairy =
        await findParentFarm(
            dairyId
        );


    // ------------------------------------------------------
    // CURRENT STORAGE
    // ------------------------------------------------------

    const storage =
        await findStorageForFarm({

            dairy,

            storageId,

            itemId

        });


    // ------------------------------------------------------
    // TARGET STORAGE
    // ------------------------------------------------------

    const targetStorage =
        await findStorageForFarm({

            dairy,

            storageId:
                targetStorageId

        });


    // ======================================================
    // CURRENT STORAGE TYPE
    // ======================================================

    const currentType =
        normalizeStorageType(
            storage
        );


    const targetType =
        normalizeStorageType(
            targetStorage
        );


    // ======================================================
    // TYPES MUST MATCH
    // ======================================================

    if (
        currentType !==
        targetType
    ) {

        throw createError(
            "Items can only be reshuffled into a storage facility of the same type.",
            400
        );

    }


    // ======================================================
    // VALID STORAGE TYPES
    // ======================================================

    if (
        currentType !== ROOM_TYPE &&
        currentType !== AGROSTORE_TYPE
    ) {

        throw createError(
            "Invalid storage type.",
            400
        );

    }


    // ======================================================
    // CURRENT STORAGE ACTIVE
    // ======================================================

    if (
        !isActiveStorage(
            storage
        )
    ) {

        throw createError(
            "The current storage facility is inactive.",
            400
        );

    }


    // ======================================================
    // TARGET STORAGE ACTIVE
    // ======================================================

    if (
        !isActiveStorage(
            targetStorage
        )
    ) {

        throw createError(
            "The target storage facility is inactive.",
            400
        );

    }


    // ======================================================
    // SAME STORAGE
    // ======================================================

    if (
        String(
            targetStorage._id
        ) ===
        String(
            storage._id
        )
    ) {

        throw createError(
            "The target storage facility must be different from the current storage.",
            400
        );

    }


    const currentRoomNumber =
        getStorageRoomNumber(
            storage
        );


    const targetRoomNumber =
        getStorageRoomNumber(
            targetStorage
        );


    // ======================================================
    // VERIFY SELECTED ITEMS
    // ======================================================

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
                currentRoomNumber,

            ...storageItemTypeFilter(
                storage
            )

        })
        .lean();


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
                "One or more selected items are not feeds currently stored in this AgroStore.",
                400
            );

        }


        throw createError(
            "One or more selected items are not currently in this storage room.",
            400
        );

    }


    // ======================================================
    // RESHUFFLE
    // ======================================================
    //
    // The only location field changed is dwellNumber.
    //
    // It becomes targetStorage.roomNumber.
    //
    // ======================================================

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
                    currentRoomNumber,

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
//
// ONLY AgroStore.
//
// The feed must:
//
//     assetCode === farm.code
//     type === "feeds"
//     dwellNumber === storage.roomNumber
//
// quantity > 0:
//
//     quantity is updated
//
// quantity === 0:
//
//     quantity = 0
//     dwellNumber = null
//
// ==========================================================

async function updateFeedQuantity({
    dairyId,
    storageId,
    itemId,
    quantity,
    unit
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


    // ======================================================
    // ONLY AGROSTORE
    // ======================================================

    if (
        !isAgroStore(
            storage
        )
    ) {

        throw createError(
            "Feed quantity can only be updated for an AgroStore.",
            400
        );

    }


    const roomNumber =
        getStorageRoomNumber(
            storage
        );


    // ======================================================
    // FIND CURRENT FEED
    // ======================================================

    const feed =
        await Dairy.findOne({

            _id:
                itemId,

            ...farmItemFilter(
                dairy
            ),

            type:
                FEED_TYPE,

            dwellNumber:
                roomNumber

        });


    if (
        !feed
    ) {

        throw createError(
            "The selected feed was not found in this AgroStore.",
            404
        );

    }


    // ======================================================
    // PREPARE UPDATE
    // ======================================================

    const update = {

        $set: {

            quantity:
                numericQuantity

        }

    };


    // ------------------------------------------------------
    // UNIT
    // ------------------------------------------------------

    if (
        unit !== undefined &&
        unit !== null &&
        String(unit).trim() !== ""
    ) {

        update.$set.unit =
            String(
                unit
            ).trim();

    }


    // ======================================================
    // ZERO = OMIT
    // ======================================================

    if (
        numericQuantity === 0
    ) {

        update.$set.dwellNumber =
            null;

    }


    // ======================================================
    // UPDATE
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
                    FEED_TYPE,

                dwellNumber:
                    roomNumber

            },

            update,

            {

                new:
                    true

            }

        )
        .lean();


    if (
        !updatedFeed
    ) {

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
                    record.quantity,

                unit:
                    record.unit

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
    // NORMAL STORAGE / GENERAL STORAGE MANAGEMENT
    // ------------------------------------------------------

    omitItemsFromStorage,

    reshuffleItems,

    // ------------------------------------------------------
    // AGROSTORE
    // ------------------------------------------------------

    updateFeedQuantity,

    updateFeedQuantities

};