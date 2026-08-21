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
// IMPORTANT:
//
//     These are the ONLY valid storage types:
//
//         room
//         agroStore
//
//     Do NOT convert storage type to lowercase.
//     "agroStore" is an exact storage type.
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
// ADD ITEMS:
//
//     An item may appear in the Add Items tab ONLY when:
//
//         item.assetCode === parentFarm.code
//         AND
//         item.dwellNumber does not exist
//         OR item.dwellNumber === null
//         OR item.dwellNumber === ""
//
//     Storage structures are NEVER displayed as Add Items.
//
// AGROSTORE:
//
//     storage.type === "agroStore"
//
//     Only:
//
//         item.type === "feeds"
//
//     may be stored in an AgroStore.
//
// NORMAL ROOM:
//
//     storage.type === "room"
//
//     Feed items are NOT stored in a normal room.
//
// RESHUFFLE:
//
//     room      -> room
//     agroStore -> agroStore
//
//     Different storage types cannot be used as reshuffle
//     destinations.
//
// AGROSTORE QUANTITY:
//
//     quantity > 0
//         = update quantity
//
//     quantity === 0
//         = set quantity to 0
//         = remove dwellNumber
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

function createError(
    message,
    statusCode = 400
) {

    const error =
        new Error(message);

    error.status =
        statusCode;

    error.statusCode =
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
// STORAGE TYPE
// ==========================================================
//
// IMPORTANT:
//
//     Do NOT use toLowerCase() here.
//
// Valid values are:
//
//     room
//     agroStore
//
// ==========================================================

function getStorageType(
    storage
) {

    return typeof storage?.type === "string"
        ? storage.type.trim()
        : "";
}


// ==========================================================
// STORAGE TYPE VALIDATION
// ==========================================================

function isValidStorageType(
    storage
) {

    const type =
        getStorageType(
            storage
        );

    return (
        type === ROOM_TYPE ||
        type === AGROSTORE_TYPE
    );
}


// ==========================================================
// STORAGE TYPE CHECKS
// ==========================================================

function isAgroStore(
    storage
) {

    return (
        getStorageType(
            storage
        ) === AGROSTORE_TYPE
    );
}


function isNormalRoom(
    storage
) {

    return (
        getStorageType(
            storage
        ) === ROOM_TYPE
    );
}


// ==========================================================
// STORAGE STRUCTURE CHECK
// ==========================================================
//
// A storage facility is a Dairy record with:
//
//     recordType === "structure"
//
// ==========================================================

function isStorageStructure(
    item
) {

    return (
        item &&
        String(
            item.recordType || ""
        ).trim() ===
        STRUCTURE_RECORD_TYPE
    );
}


// ==========================================================
// FEED CHECK
// ==========================================================
//
// "feeds" is an ITEM type.
// It is NOT a storage type.
//
// ==========================================================

function isFeed(
    item
) {

    return (
        item &&
        String(
            item.type || ""
        ).trim() ===
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
        typeof storage?.status === "string" &&
        storage.status.trim() ===
            ACTIVE_STATUS
    );
}


// ==========================================================
// STORAGE ROOM NUMBER
// ==========================================================
//
// roomNumber is authoritative.
//
// Items store this value as dwellNumber.
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
        storage.roomNumber === null ||
        storage.roomNumber === undefined
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
// The URL dairyId is ALWAYS the MongoDB _id of the
// parent Dairy Farm.
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
// Current:
//
//     storageId
//
// Older compatibility:
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
// FIND STORAGE FOR FARM
// ==========================================================
//
// Storage must:
//
//     1. Exist by MongoDB _id
//     2. Be a structure
//     3. Belong to the parent farm
//     4. Have type "room" OR "agroStore"
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

    // ------------------------------------------------------
    // EXPLICIT STORAGE TYPE CHECK
    // ------------------------------------------------------

    if (
        !isValidStorageType(
            storage
        )
    ) {

        throw createError(
            "Storage type must be either room or agroStore.",
            400
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

function farmItemFilter(
    dairy
) {

    return {
        assetCode:
            dairy.code
    };
}


// ==========================================================
// NON-STRUCTURE ITEM FILTER
// ==========================================================
//
// Storage structures are never ordinary inventory items.
//
// ==========================================================

function nonStructureItemFilter() {

    return {
        recordType: {
            $ne:
                STRUCTURE_RECORD_TYPE
        }
    };
}


// ==========================================================
// STORAGE CONTENT TYPE FILTER
// ==========================================================
//
// AGROSTORE:
//
//     type === "feeds"
//
// ROOM:
//
//     type !== "feeds"
//
// Storage structures are excluded in both cases.
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
                FEED_TYPE,

            ...nonStructureItemFilter()
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
            },

            ...nonStructureItemFilter()
        };
    }

    throw createError(
        "Storage type must be either room or agroStore.",
        400
    );
}


// ==========================================================
// CURRENT CONTENT FILTER
// ==========================================================
//
// item.dwellNumber === storage.roomNumber
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
// An available item:
//
//     - belongs to the parent farm
//     - is not a structure
//     - has no dwellNumber
//     - has the correct type for the storage
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

        ...nonStructureItemFilter(),

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


    // ======================================================
    // AGROSTORE
    // ======================================================

    if (
        isAgroStore(
            storage
        )
    ) {

        filter.type =
            FEED_TYPE;

        return filter;
    }


    // ======================================================
    // NORMAL ROOM
    // ======================================================

    if (
        isNormalRoom(
            storage
        )
    ) {

        filter.type = {
            $ne:
                FEED_TYPE
        };

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
//
// room:
//
//     room -> room
//
// agroStore:
//
//     agroStore -> agroStore
//
// ==========================================================

async function getTargetStorages({
    dairy,
    storage
}) {

    const storageType =
        getStorageType(
            storage
        );

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
// room:
//
//     non-feed items
//
// agroStore:
//
//     feeds only
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
                "One or more selected items do not belong to this Dairy Farm, are already allocated, or are not feeds.",
                400
            );
        }


        throw createError(
            "One or more selected items do not belong to this Dairy Farm, are already allocated, are feeds, or are storage structures.",
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
// ONLY room.
//
// agroStore items are omitted automatically when their
// quantity reaches zero.
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


    // ------------------------------------------------------
    // AGROSTORE CANNOT BE MANUALLY OMITTED
    // ------------------------------------------------------

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


    // ------------------------------------------------------
    // MUST BE ROOM
    // ------------------------------------------------------

    if (
        !isNormalRoom(
            storage
        )
    ) {

        throw createError(
            "Storage type must be either room or agroStore.",
            400
        );
    }


    // ------------------------------------------------------
    // ACTIVE STORAGE
    // ------------------------------------------------------

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
        getStorageRoomNumber(
            storage
        );


    // ======================================================
    // VERIFY ITEMS
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
// room:
//
//     room -> room
//
// agroStore:
//
//     agroStore -> agroStore
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


    // ------------------------------------------------------
    // STORAGE TYPES
    // ------------------------------------------------------

    const currentType =
        getStorageType(
            storage
        );

    const targetType =
        getStorageType(
            targetStorage
        );


    // ======================================================
    // VALID STORAGE TYPES
    // ======================================================

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


    // ======================================================
    // SAME TYPE REQUIRED
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


    // ======================================================
    // ROOM NUMBERS
    // ======================================================

    const currentRoomNumber =
        getStorageRoomNumber(
            storage
        );

    const targetRoomNumber =
        getStorageRoomNumber(
            targetStorage
        );


    if (
        currentRoomNumber === null ||
        targetRoomNumber === null
    ) {

        throw createError(
            "Both storage facilities must have valid Room Numbers.",
            400
        );
    }


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
    // Only dwellNumber changes.
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
// ONLY:
//
//     storage.type === "agroStore"
//
// AND:
//
//     item.type === "feeds"
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


    // ======================================================
    // ACTIVE AGROSTORE
    // ======================================================

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
        const record
        of records
    ) {

        if (
            !record
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
    // ROOM / GENERAL STORAGE
    // ------------------------------------------------------

    omitItemsFromStorage,

    reshuffleItems,


    // ------------------------------------------------------
    // AGROSTORE
    // ------------------------------------------------------

    updateFeedQuantity,

    updateFeedQuantities

};