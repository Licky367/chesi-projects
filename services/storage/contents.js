// ==========================================================
// services/storage/contents.js
// STORAGE CONTENTS SERVICE
// ==========================================================
//
// STORAGE RULES
// ----------------------------------------------------------
//
// SINGLE SOURCE OF TRUTH:
//
//     models/dairy.js
//
// STORAGE RECORD:
//
//     recordType === "structure"
//         = structure/facility record
//
// STORAGE TYPE:
//
//     type === "room"
//         = normal storage room
//
//     type === "agroStore"
//         = AgroStore
//
// FARM RELATIONSHIP:
//
//     Dairy Farm:
//         code < 0
//
//     Storage:
//         assetCode === farm.code
//
// CONTENT LOCATION:
//
//     dwellNumber === storage.dwellNumber
//
// IMPORTANT:
//
//     DairyStorage is NOT used.
//
//     Storage facilities and storage contents are all
//     represented by the Dairy model.
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
        new Error(
            message
        );

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
// NORMALIZE ITEM IDS
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
// FIND PARENT DAIRY FARM
// ==========================================================
//
// dairyId is always:
//
//     Dairy._id
//
// It is NEVER Dairy.code.
//
// Parent Dairy Farm:
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
        );


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
// The storage contents URL is:
//
//     /storage/:dairyId/contents/:itemId
//
// Therefore:
//
//     req.params.itemId
//
// identifies the STORAGE Dairy record.
//
// For compatibility, the service also accepts storageId
// when called by older controller code.
//
// ==========================================================

function getStorageId(
    options = {}
) {

    const value =
        options.itemId ||
        options.storageId;


    return String(
        value || ""
    ).trim();

}


// ==========================================================
// FIND STORAGE BELONGING TO FARM
// ==========================================================
//
// Storage is a Dairy record.
//
// Required:
//
//     recordType === "structure"
//
//     assetCode === dairy.code
//
// Storage type:
//
//     room
//     agroStore
//
// The storage MongoDB _id comes directly from the URL.
//
// ==========================================================

async function findStorageForFarm({
    dairy,
    storageId,
    itemId
}) {

    const resolvedStorageId =
        String(
            storageId ||
            itemId ||
            ""
        ).trim();


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

        });


    if (
        !storage
    ) {

        throw createError(
            "Storage facility not found for this Dairy Farm.",
            404
        );

    }


    return storage;

}


// ==========================================================
// CHECK ACTIVE STORAGE
// ==========================================================

function isActiveStorage(
    storage
) {

    return (

        String(
            storage.status || ""
        )
        .trim()
        .toLowerCase() ===
        ACTIVE_STATUS

    );

}


// ==========================================================
// CHECK AGROSTORE
// ==========================================================

function isAgroStore(
    storage
) {

    return (

        storage &&

        String(
            storage.type || ""
        )
        .trim()
        .toLowerCase() ===
        AGROSTORE_TYPE.toLowerCase()

    );

}


// ==========================================================
// CHECK NORMAL ROOM
// ==========================================================

function isNormalRoom(
    storage
) {

    return (

        storage &&

        String(
            storage.type || ""
        )
        .trim()
        .toLowerCase() ===
        ROOM_TYPE

    );

}


// ==========================================================
// CHECK FEED
// ==========================================================
//
// Feed identity:
//
//     Dairy.type === "feeds"
//
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
// FARM ITEM FILTER
// ==========================================================
//
// Every item belonging to a Dairy Farm is identified by:
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
// UNALLOCATED ITEM FILTER
// ==========================================================
//
// An item is unallocated when it has no dwellNumber.
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
                    $exists:
                        false
                }
            }

        ]

    };

}


// ==========================================================
// AGROSTORE AVAILABLE ITEMS
// ==========================================================
//
// AgroStore:
//
//     farm item
//     feeds only
//     unallocated
//     quantity > 0
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
            FEED_TYPE,

        ...unallocatedItemFilter(),

        quantity: {
            $gt:
                0
        }

    };

}


// ==========================================================
// NORMAL ROOM AVAILABLE ITEMS
// ==========================================================
//
// Normal room:
//
//     farm item
//     anything except feeds
//     unallocated
//
// ==========================================================

function normalRoomAvailableItemFilter(
    dairy
) {

    return {

        ...farmItemFilter(
            dairy
        ),

        type: {
            $ne:
                FEED_TYPE
        },

        ...unallocatedItemFilter()

    };

}


// ==========================================================
// GENERAL AVAILABLE ITEM FILTER
// ==========================================================
//
// This is the backend allocation gate.
//
// AgroStore:
//
//     feeds ONLY
//
// Room:
//
//     everything EXCEPT feeds
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


    if (
        isNormalRoom(
            storage
        )
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
// CURRENT CONTENT FILTER
// ==========================================================
//
// Storage contents are linked through:
//
//     assetCode === farm.code
//
//     dwellNumber === storage.dwellNumber
//
// ==========================================================

function currentContentFilter({
    dairy,
    storage
}) {

    const filter = {

        ...farmItemFilter(
            dairy
        ),

        dwellNumber:
            storage.dwellNumber

    };


    if (
        isAgroStore(
            storage
        )
    ) {

        filter.type =
            FEED_TYPE;

    }


    if (
        isNormalRoom(
            storage
        )
    ) {

        filter.type = {

            $ne:
                FEED_TYPE

        };

    }


    return filter;

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
    // FIND PARENT FARM
    // ------------------------------------------------------

    const dairy =
        await findParentFarm(
            dairyId
        );


    // ------------------------------------------------------
    // FIND STORAGE
    // ------------------------------------------------------
    //
    // itemId is the storage ID when using:
    //
    // /storage/:dairyId/contents/:itemId
    //
    // ------------------------------------------------------

    const storage =
        await findStorageForFarm({

            dairy,

            storageId,

            itemId

        });


    // ======================================================
    // CURRENT CONTENTS
    // ======================================================

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

            code:
                1,

            name:
                1

        })
        .lean();


    // ======================================================
    // TARGET STORAGES
    // ======================================================
    //
    // Only normal rooms can be reshuffling targets.
    //
    // AgroStore cannot participate in reshuffling.
    //
    // ======================================================

    let targetStorages = [];


    if (
        isNormalRoom(
            storage
        )
    ) {

        targetStorages =
            await Dairy.find({

                recordType:
                    STRUCTURE_RECORD_TYPE,

                assetCode:
                    dairy.code,

                type:
                    ROOM_TYPE,

                status:
                    ACTIVE_STATUS,

                _id: {
                    $ne:
                        storage._id
                }

            })
            .sort({

                dwellNumber:
                    1

            })
            .lean();

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
// BACKEND ENFORCEMENT:
//
//     AgroStore → feeds only
//
//     Room      → non-feeds only
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


    // ======================================================
    // VERIFY ITEMS
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
    //
    // The item's dwellNumber becomes the storage's
    // dwellNumber.
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
                        storage.dwellNumber

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
//     manual omission is prohibited.
//
// Normal room:
//
//     allowed.
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
    // AGROSTORE DOES NOT USE MANUAL OMIT
    // ------------------------------------------------------

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


    // ======================================================
    // STORAGE MUST BE NORMAL ROOM
    // ======================================================

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


    // ======================================================
    // FIND ITEMS
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
                storage.dwellNumber,

            type: {
                $ne:
                    FEED_TYPE
            }

        })
        .lean();


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
                    $in:
                        ids
                },

                ...farmItemFilter(
                    dairy
                ),

                dwellNumber:
                    storage.dwellNumber,

                type: {
                    $ne:
                        FEED_TYPE
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
    itemId,
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


    // ------------------------------------------------------
    // CURRENT STORAGE MUST BE NORMAL ROOM
    // ------------------------------------------------------

    if (
        !isNormalRoom(
            storage
        )
    ) {

        throw createError(
            "AgroStore feeds cannot be reshuffled.",
            400
        );

    }


    // ------------------------------------------------------
    // TARGET MUST BE NORMAL ROOM
    // ------------------------------------------------------

    if (
        !isNormalRoom(
            targetStorage
        )
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
        !isActiveStorage(
            storage
        )
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
        !isActiveStorage(
            targetStorage
        )
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
                storage.dwellNumber,

            type: {
                $ne:
                    FEED_TYPE
            }

        })
        .lean();


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
                    $in:
                        ids
                },

                ...farmItemFilter(
                    dairy
                ),

                dwellNumber:
                    storage.dwellNumber,

                type: {
                    $ne:
                        FEED_TYPE
                }

            },

            {

                $set: {

                    dwellNumber:
                        targetStorage.dwellNumber

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
                FEED_TYPE,

            dwellNumber:
                storage.dwellNumber

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
                        FEED_TYPE,

                    dwellNumber:
                        storage.dwellNumber

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
                    FEED_TYPE,

                dwellNumber:
                    storage.dwellNumber

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