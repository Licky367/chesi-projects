// ==========================================================
// services/storage/contents.js
// STORAGE CONTENTS SERVICE
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
//
// Central business-logic layer for:
//
//     /storage/:dairyId/contents/:storageId
//
// URL CONTRACT
// ----------------------------------------------------------
//
//     dairyId
//         = parent Dairy Farm MongoDB _id
//
//     storageId
//         = storage structure MongoDB _id
//
// DATABASE MODEL
// ----------------------------------------------------------
//
// Single source of truth:
//
//     models/dairy.js
//
// PARENT FARM
// ----------------------------------------------------------
//
// The parent Dairy is identified ONLY by MongoDB _id.
//
// A parent Dairy Farm must have:
//
//     Number(code) < 0
//
// STORAGE
// ----------------------------------------------------------
//
// Every storage facility is a Dairy record with:
//
//     recordType = "structure"
//
// Valid storage types:
//
//     type = "room"
//     type = "agroStore"
//
// Storage ownership:
//
//     storage.assetCode === farm.code
//
// PHYSICAL STORAGE IDENTIFIER
// ----------------------------------------------------------
//
//     storage.roomNumber
//
// Items store their current storage location as:
//
//     item.dwellNumber
//
// Therefore:
//
//     item.dwellNumber === storage.roomNumber
//
// ITEM OWNERSHIP
// ----------------------------------------------------------
//
// Every item must belong to the same farm:
//
//     item.assetCode === farm.code
//
// AVAILABLE ITEMS
// ----------------------------------------------------------
//
// An item is available for allocation only when:
//
//     item.assetCode === farm.code
//
// AND:
//
//     dwellNumber does not exist
//     OR dwellNumber === null
//     OR dwellNumber === ""
//
// Storage structures are never available inventory items.
//
// ROOM
// ----------------------------------------------------------
//
// A normal Room accepts:
//
//     non-feed inventory
//
// It supports:
//
//     add
//     omit
//     reshuffle
//
// AGROSTORE
// ----------------------------------------------------------
//
// An AgroStore accepts:
//
//     type === "feeds"
//
// It supports:
//
//     add
//     quantity update
//
// It does NOT support:
//
//     manual omission
//     reshuffling
//
// Quantity:
//
//     > 0
//         update quantity
//
//     === 0
//         quantity becomes zero
//         dwellNumber is cleared
//         item is automatically removed from active storage
//
// SERVICE AUTHORITY
// ----------------------------------------------------------
//
// The service is the final authority.
//
// Controllers and browser JavaScript must never be trusted
// to enforce these rules.
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
    status = 400
) {

    const error =
        new Error(message);

    error.status =
        status;

    return error;

}


// ==========================================================
// OBJECT ID VALIDATION
// ==========================================================

function isValidObjectId(
    value
) {

    return Boolean(

        value !== undefined &&
        value !== null &&

        mongoose.Types.ObjectId.isValid(
            value
        )

    );

}


// ==========================================================
// REQUIRE OBJECT ID
// ==========================================================

function requireObjectId(
    value,
    message
) {

    const normalized =
        String(
            value || ""
        ).trim();


    if (
        !isValidObjectId(
            normalized
        )
    ) {

        throw createError(
            message,
            400
        );

    }


    return normalized;

}


// ==========================================================
// NORMALIZE ID ARRAY
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
                        value !== undefined &&
                        value !== null &&
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
                !isValidObjectId(
                    id
                )
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

function isRoom(
    storage
) {

    return (
        normalizeStorageType(
            storage
        ) === ROOM_TYPE
    );

}


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


// ==========================================================
// VALID STORAGE TYPE
// ==========================================================

function assertValidStorageType(
    storage
) {

    if (
        !isRoom(storage) &&
        !isAgroStore(storage)
    ) {

        throw createError(
            "Invalid storage type.",
            400
        );

    }

}


// ==========================================================
// STRUCTURE CHECK
// ==========================================================

function isStorageStructure(
    item
) {

    return (

        item &&

        String(
            item.recordType || ""
        )
        .trim()
        .toLowerCase() ===
        STRUCTURE_RECORD_TYPE

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
// roomNumber is the physical storage identifier.
//
// Items use the same value as dwellNumber.
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
        undefined ||
        storage.roomNumber ===
        null
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
// REQUIRE STORAGE ROOM NUMBER
// ==========================================================

function requireStorageRoomNumber(
    storage
) {

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


    return roomNumber;

}


// ==========================================================
// FARM ITEM FILTER
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
// NON-STRUCTURE FILTER
// ==========================================================
//
// Storage facilities are Dairy records too.
//
// They must never appear as ordinary inventory.
//
// ==========================================================

function nonStructureFilter() {

    return {

        recordType: {
            $ne:
                STRUCTURE_RECORD_TYPE
        }

    };

}


// ==========================================================
// ITEM TYPE FILTER FOR STORAGE
// ==========================================================
//
// ROOM
//
//     all non-feed inventory
//
// AGROSTORE
//
//     feeds only
//
// ==========================================================

function storageItemTypeFilter(
    storage
) {

    assertValidStorageType(
        storage
    );


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


    return {

        type: {
            $ne:
                FEED_TYPE
        }

    };

}


// ==========================================================
// CURRENT CONTENT FILTER
// ==========================================================

function currentContentFilter({
    dairy,
    storage
}) {

    const roomNumber =
        requireStorageRoomNumber(
            storage
        );


    return {

        ...farmItemFilter(
            dairy
        ),

        ...nonStructureFilter(),

        ...storageItemTypeFilter(
            storage
        ),

        dwellNumber:
            roomNumber

    };

}


// ==========================================================
// AVAILABLE ITEM FILTER
// ==========================================================
//
// An available item:
//
//     belongs to farm
//     is not a structure
//     has no active storage allocation
//
// ==========================================================

function availableItemFilter({
    dairy,
    storage
}) {

    const filter = {

        ...farmItemFilter(
            dairy
        ),

        ...nonStructureFilter(),

        $or: [

            {
                dwellNumber: {
                    $exists: false
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


    Object.assign(

        filter,

        storageItemTypeFilter(
            storage
        )

    );


    return filter;

}


// ==========================================================
// FIND PARENT DAIRY FARM
// ==========================================================
//
// dairyId ALWAYS refers to MongoDB _id.
//
// ==========================================================

async function findParentFarm(
    dairyId
) {

    const id =
        requireObjectId(

            dairyId,

            "Invalid Dairy Farm ID."

        );


    const dairy =
        await Dairy.findById(
            id
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
// FIND STORAGE FOR FARM
// ==========================================================
//
// Storage must:
//
//     exist
//     be a structure
//     belong to farm
//     be room or agroStore
//
// ==========================================================

async function findStorageForFarm({
    dairy,
    storageId
}) {

    const id =
        requireObjectId(

            storageId,

            "Invalid storage facility ID."

        );


    const storage =
        await Dairy.findOne({

            _id:
                id,

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


    assertValidStorageType(
        storage
    );


    requireStorageRoomNumber(
        storage
    );


    return storage;

}


// ==========================================================
// GET TARGET STORAGES
// ==========================================================
//
// Only same-type destinations are allowed.
//
//     room       -> room
//     agroStore  -> agroStore
//
// ==========================================================

async function getTargetStorages({
    dairy,
    storage
}) {

    assertValidStorageType(
        storage
    );


    const targetType =
        isRoom(storage)
            ? ROOM_TYPE
            : AGROSTORE_TYPE;


    return Dairy.find({

        recordType:
            STRUCTURE_RECORD_TYPE,

        assetCode:
            dairy.code,

        type:
            targetType,

        status:
            ACTIVE_STATUS,

        _id: {
            $ne:
                storage._id
        }

    })
    .sort({

        roomNumber:
            1,

        name:
            1

    })
    .lean();

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
//     dwellNumber = storage.roomNumber
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
        requireStorageRoomNumber(
            storage
        );


    const filter =
        {

            _id: {
                $in:
                    ids
            },

            ...availableItemFilter({

                dairy,

                storage

            })

        };


    const items =
        await Dairy.find(
            filter
        )
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
                "One or more selected items do not belong to this Dairy Farm, are already allocated, are storage structures, or are not feeds.",
                400
            );

        }


        throw createError(
            "One or more selected items do not belong to this Dairy Farm, are already allocated, are storage structures, or are feeds.",
            400
        );

    }


    const result =
        await Dairy.updateMany(

            filter,

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
// ROOM ONLY.
//
// AgroStore omission happens automatically when quantity
// reaches zero.
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


    if (
        isAgroStore(
            storage
        )
    ) {

        throw createError(
            "Feeds cannot be manually omitted from an AgroStore. Set the quantity to zero instead.",
            400
        );

    }


    if (
        !isRoom(
            storage
        )
    ) {

        throw createError(
            "Invalid storage type.",
            400
        );

    }


    if (
        !isActiveStorage(
            storage
        )
    ) {

        throw createError(
            "Items cannot be omitted from an inactive storage facility.",
            400
        );

    }


    const roomNumber =
        requireStorageRoomNumber(
            storage
        );


    const filter = {

        _id: {
            $in:
                ids
        },

        ...currentContentFilter({

            dairy,

            storage

        })

    };


    const items =
        await Dairy.find(
            filter
        )
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


    const result =
        await Dairy.updateMany(

            filter,

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

        items,

        roomNumber

    };

}


// ==========================================================
// RESHUFFLE ITEMS
// ==========================================================
//
// Only same-type storage is permitted.
//
//     room -> room
//
// AgroStore reshuffling is intentionally forbidden.
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


    // ======================================================
    // AGROSTORE CANNOT BE RESHUFFLED
    // ======================================================

    if (
        isAgroStore(
            storage
        )
    ) {

        throw createError(
            "AgroStore contents cannot be reshuffled.",
            400
        );

    }


    if (
        !isRoom(
            storage
        ) ||
        !isRoom(
            targetStorage
        )
    ) {

        throw createError(
            "Items can only be reshuffled between normal storage rooms.",
            400
        );

    }


    // ======================================================
    // CURRENT STORAGE
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
    // TARGET STORAGE
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
            storage._id
        ) ===
        String(
            targetStorage._id
        )
    ) {

        throw createError(
            "The target storage facility must be different from the current storage.",
            400
        );

    }


    const currentRoomNumber =
        requireStorageRoomNumber(
            storage
        );


    const targetRoomNumber =
        requireStorageRoomNumber(
            targetStorage
        );


    // ======================================================
    // VERIFY ITEMS
    // ======================================================

    const sourceFilter = {

        _id: {
            $in:
                ids
        },

        ...currentContentFilter({

            dairy,

            storage

        })

    };


    const items =
        await Dairy.find(
            sourceFilter
        )
        .lean();


    if (
        items.length !==
        ids.length
    ) {

        throw createError(
            "One or more selected items are not currently in this storage room.",
            400
        );

    }


    // ======================================================
    // MOVE ITEMS
    // ======================================================

    const result =
        await Dairy.updateMany(

            sourceFilter,

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

        items,

        currentRoomNumber,

        targetRoomNumber

    };

}


// ==========================================================
// UPDATE SINGLE FEED QUANTITY
// ==========================================================
//
// AgroStore ONLY.
//
// quantity > 0
//
//     quantity updated
//
// quantity === 0
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

    const feedId =
        requireObjectId(

            itemId,

            "Invalid feed item ID."

        );


    if (
        quantity === undefined ||
        quantity === null ||
        String(quantity).trim() === ""
    ) {

        throw createError(
            "Quantity is required.",
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
    // AGROSTORE ONLY
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


    if (
        !isActiveStorage(
            storage
        )
    ) {

        throw createError(
            "Feed quantity cannot be updated in an inactive AgroStore.",
            400
        );

    }


    const roomNumber =
        requireStorageRoomNumber(
            storage
        );


    // ======================================================
    // FIND CURRENT FEED
    // ======================================================

    const filter = {

        _id:
            feedId,

        ...farmItemFilter(
            dairy
        ),

        ...nonStructureFilter(),

        type:
            FEED_TYPE,

        dwellNumber:
            roomNumber

    };


    const existingFeed =
        await Dairy.findOne(
            filter
        );


    if (
        !existingFeed
    ) {

        throw createError(
            "The selected feed was not found in this AgroStore.",
            404
        );

    }


    // ======================================================
    // BUILD UPDATE
    // ======================================================

    const setValues = {

        quantity:
            numericQuantity

    };


    if (
        unit !== undefined &&
        unit !== null &&
        String(unit).trim() !== ""
    ) {

        setValues.unit =
            String(
                unit
            ).trim();

    }


    // ======================================================
    // ZERO QUANTITY
    // ======================================================
    //
    // Clearing dwellNumber removes the item from active
    // AgroStore contents.
    //
    // Quantity remains explicitly stored as zero.
    //
    // ======================================================

    if (
        numericQuantity === 0
    ) {

        setValues.dwellNumber =
            null;

    }


    // ======================================================
    // UPDATE
    // ======================================================

    const updatedFeed =
        await Dairy.findOneAndUpdate(

            filter,

            {

                $set:
                    setValues

            },

            {

                new:
                    true,

                runValidators:
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
//
// Expected:
//
//     records: [
//         {
//             itemId,
//             quantity,
//             unit
//         }
//     ]
//
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
        const record
        of records
    ) {

        if (
            !record ||
            typeof record !== "object"
        ) {

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
// CREATE ITEM DIRECTLY IN STORAGE
// ==========================================================
//
// This is included because your controller already calls:
//
//     storageContentsService.createItemInStorage()
//
// IMPORTANT:
//
// The service determines the storage location.
//
// The browser must NOT be allowed to choose dwellNumber.
//
// The new item is created with:
//
//     assetCode = parent farm code
//     dwellNumber = storage.roomNumber
//
// For AgroStore:
//
//     type must be feeds
//
// For Room:
//
//     type must NOT be feeds
//
// recordType is forced away from "structure".
//
// ==========================================================

async function createItemInStorage({
    dairyId,
    storageId,
    data = {}
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


    if (
        !isActiveStorage(
            storage
        )
    ) {

        throw createError(
            "Items cannot be created in an inactive storage facility.",
            400
        );

    }


    const roomNumber =
        requireStorageRoomNumber(
            storage
        );


    const input =
        data &&
        typeof data === "object"
            ? data
            : {};


    // ======================================================
    // COPY USER DATA
    // ======================================================

    const itemData = {

        ...input

    };


    // ======================================================
    // SECURITY
    // ======================================================
    //
    // These values are controlled by the service.
    //
    // The client cannot select another farm, another
    // storage location, or create a structure.
    //
    // ======================================================

    itemData.assetCode =
        dairy.code;


    itemData.dwellNumber =
        roomNumber;


    itemData.recordType =
        "item";


    // ======================================================
    // STORAGE TYPE RULE
    // ======================================================

    if (
        isAgroStore(
            storage
        )
    ) {

        if (
            !isFeed(
                itemData
            )
        ) {

            throw createError(
                "Only feed items can be created directly inside an AgroStore.",
                400
            );

        }

    }


    if (
        isRoom(
            storage
        )
    ) {

        if (
            isFeed(
                itemData
            )
        ) {

            throw createError(
                "Feed items cannot be created directly inside a normal storage room.",
                400
            );

        }

    }


    // ======================================================
    // PREVENT CLIENT FROM CREATING A STORAGE STRUCTURE
    // ======================================================

    if (
        isStorageStructure(
            itemData
        )
    ) {

        throw createError(
            "Storage structures cannot be created as storage contents.",
            400
        );

    }


    // ======================================================
    // CREATE
    // ======================================================

    const item =
        await Dairy.create(
            itemData
        );


    return {

        dairy,

        storage,

        item

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


    // ------------------------------------------------------
    // ALLOCATION
    // ------------------------------------------------------

    addItemsToStorage,


    // ------------------------------------------------------
    // NORMAL ROOM
    // ------------------------------------------------------

    omitItemsFromStorage,

    reshuffleItems,


    // ------------------------------------------------------
    // AGROSTORE
    // ------------------------------------------------------

    updateFeedQuantity,

    updateFeedQuantities,


    // ------------------------------------------------------
    // DIRECT ITEM CREATION
    // ------------------------------------------------------

    createItemInStorage

};