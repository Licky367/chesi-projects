// ==========================================================
// services/storage/contents.js
// STORAGE CONTENTS SERVICE
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
//
// Handles everything allocated inside a DairyStorage facility.
//
// STORAGE ARCHITECTURE:
//
//     NORMAL ROOM
//         - contains normal Dairy assets/entities
//         - add
//         - omit
//         - reshuffle
//
//     AGROSTORE
//         - DairyStorage.type === "agroStore"
//         - contains Dairy.type === "feeds"
//         - quantity must be > 0 while allocated
//         - quantity can only be reduced
//         - quantity === 0 automatically removes the feed
//         - no manual omit
//         - no reshuffle
//
// IMPORTANT DISTINCTION:
//
//     DairyStorage.type
//         "room"
//         "agroStore"
//
//     Dairy.type
//         "feeds"
//         ...other Dairy types
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
// FIND PARENT FARM
// ==========================================================
//
// dairyId = Dairy._id
//
// Parent farm:
//
//     Dairy._id
//          ↓
//     Dairy.code
//
// Farm code MUST be negative.
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


    if (

        dairy.code === null ||

        dairy.code === undefined

    ) {

        throw createError(
            "The selected Dairy Farm does not have a farm code.",
            422
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
            "The selected Dairy record is not a valid Dairy Farm.",
            400
        );

    }


    return dairy;

}


// ==========================================================
// FIND STORAGE BELONGING TO FARM
// ==========================================================
//
// IMPORTANT:
//
// The storageId is always checked together with:
//
//     farmCode
//
// Therefore a storage belonging to another farm cannot be
// accessed simply by changing the storage ObjectId.
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
                Number(
                    dairy.code
                )

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
// CHECK AGROSTORE
// ==========================================================
//
// IMPORTANT:
//
// DairyStorage uses:
//
//     type === "agroStore"
//
// NOT:
//
//     type === "feeds"
//
// "feeds" belongs to Dairy.type.
//
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
        "agrostore"

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
        "room"

    );

}


// ==========================================================
// FARM ITEM FILTER
// ==========================================================
//
// Every child Dairy item belonging to this farm must have:
//
//     assetCode === farmCode
//
// ==========================================================

function farmItemFilter(
    dairy
) {

    return {

        assetCode:
            Number(
                dairy.code
            )

    };

}


// ==========================================================
// UNALLOCATED ITEM FILTER
// ==========================================================
//
// An item is available when it has no dwellNumber.
//
// Supports both:
//
//     dwellNumber: null
//
// and:
//
//     dwellNumber does not exist
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
// AGROSTORE CONTENT FILTER
// ==========================================================
//
// An AgroStore contains ONLY:
//
//     same farm
//     type = feeds
//     dwellNumber = AgroStore roomNumber
//     quantity > 0
//
// ==========================================================

function agroStoreContentFilter(
    dairy,
    storage
) {

    return {

        ...farmItemFilter(
            dairy
        ),

        type:
            "feeds",

        dwellNumber:
            Number(
                storage.roomNumber
            ),

        quantity: {

            $gt:
                0

        }

    };

}


// ==========================================================
// AGROSTORE AVAILABLE ITEM FILTER
// ==========================================================
//
// Only unallocated feeds with positive quantity may be added
// to an AgroStore.
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

        ...unallocatedItemFilter(),

        quantity: {

            $gt:
                0

        }

    };

}


// ==========================================================
// NORMAL ROOM CONTENT FILTER
// ==========================================================
//
// A normal Room contains the farm's allocated Dairy entities.
//
// ==========================================================

function normalStorageContentFilter(
    dairy,
    storage
) {

    return {

        ...farmItemFilter(
            dairy
        ),

        dwellNumber:
            Number(
                storage.roomNumber
            )

    };

}


// ==========================================================
// GENERAL AVAILABLE ITEM FILTER
// ==========================================================
//
// AgroStore:
//
//     farm
//     type = feeds
//     unallocated
//     quantity > 0
//
// Room:
//
//     farm
//     unallocated
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
    // CURRENT CONTENTS
    // ======================================================

    let currentFilter;


    if (
        isAgroStore(
            storage
        )
    ) {

        // --------------------------------------------------
        // AGROSTORE
        // --------------------------------------------------
        //
        // Only positive-quantity feeds.
        //
        currentFilter =
            agroStoreContentFilter(
                dairy,
                storage
            );

    }

    else {

        // --------------------------------------------------
        // NORMAL ROOM
        // --------------------------------------------------

        currentFilter =
            normalStorageContentFilter(
                dairy,
                storage
            );

    }


    const items =
        await Dairy.find(
            currentFilter
        )
        .sort({

            code:
                1,

            name:
                1

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

            code:
                1,

            name:
                1

        );


    // ======================================================
    // TARGET STORAGES
    // ==========================================================
    //
    // Only normal rooms may have reshuffle targets.
    //
    // AgroStores have NO reshuffle targets.
    //
    // ======================================================

    let targetStorages =
        [];


    if (
        isNormalRoom(
            storage
        )
    ) {

        const storages =
            await DairyStorage.find({

                farmCode:
                    Number(
                        dairy.code
                    ),

                type:
                    "room",

                status:
                    "active"

            })
            .sort({

                roomNumber:
                    1

            });


        targetStorages =
            storages.filter(

                target =>

                    String(
                        target._id
                    ) !==
                    String(
                        storage._id
                    )

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

            code:
                1,

            name:
                1

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
// NORMAL ROOM:
//
//     Farm item
//     Unallocated
//
// AGROSTORE:
//
//     Farm item
//     type = feeds
//     Unallocated
//     quantity > 0
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


    // ======================================================
    // STORAGE MUST BE ACTIVE
    // ======================================================

    if (
        String(
            storage.status || ""
        )
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
    // AGROSTORE
    // ======================================================

    if (
        isAgroStore(
            storage
        )
    ) {

        const items =
            await Dairy.find({

                _id: {

                    $in:
                        ids

                },

                ...agroStoreAvailableItemFilter(
                    dairy
                )

            });


        if (
            items.length !==
            ids.length
        ) {

            throw createError(
                "One or more selected items are invalid, already allocated, are not feeds, or have no remaining quantity.",
                400
            );

        }


        // --------------------------------------------------
        // ALLOCATE FEEDS
        // --------------------------------------------------

        const result =
            await Dairy.updateMany(

                {

                    _id: {

                        $in:
                            ids

                    },

                    ...agroStoreAvailableItemFilter(
                        dairy
                    )

                },

                {

                    $set: {

                        dwellNumber:
                            Number(
                                storage.roomNumber
                            )

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


    // ======================================================
    // NORMAL ROOM
    // ======================================================

    if (
        !isNormalRoom(
            storage
        )
    ) {

        throw createError(
            "Invalid storage facility type.",
            400
        );

    }


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


    // ------------------------------------------------------
    // ALLOCATE TO ROOM
    // ------------------------------------------------------

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
                        Number(
                            storage.roomNumber
                        )

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
//     NO manual omission.
//
// Normal Room:
//
//     dwellNumber -> null
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


    // ======================================================
    // AGROSTORE
    // ======================================================

    if (
        isAgroStore(
            storage
        )
    ) {

        throw createError(
            "Feeds cannot be manually omitted from an AgroStore. Reduce the feed quantity to zero instead.",
            400
        );

    }


    // ======================================================
    // MUST BE NORMAL ROOM
    // ======================================================

    if (
        !isNormalRoom(
            storage
        )
    ) {

        throw createError(
            "Items can only be omitted from a normal Room.",
            400
        );

    }


    // ======================================================
    // FIND ROOM ITEMS
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
                Number(
                    storage.roomNumber
                )

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
    // OMIT FROM ROOM
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
                    Number(
                        storage.roomNumber
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
// Only normal Rooms.
//
// AgroStores cannot be involved.
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


    // ======================================================
    // VALIDATE TARGET ID
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
    // CURRENT STORAGE MUST BE ROOM
    // ======================================================

    if (
        !isNormalRoom(
            storage
        )
    ) {

        throw createError(
            "AgroStore contents cannot be reshuffled.",
            400
        );

    }


    // ======================================================
    // TARGET STORAGE MUST BE ROOM
    // ======================================================

    if (
        !isNormalRoom(
            targetStorage
        )
    ) {

        throw createError(
            "Items can only be reshuffled into a normal Room.",
            400
        );

    }


    // ======================================================
    // CURRENT STORAGE ACTIVE
    // ======================================================

    if (
        String(
            storage.status || ""
        )
        .trim()
        .toLowerCase() !==
        "active"
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
        String(
            targetStorage.status || ""
        )
        .trim()
        .toLowerCase() !==
        "active"
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
                Number(
                    storage.roomNumber
                )

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

                    $in:
                        ids

                },

                ...farmItemFilter(
                    dairy
                ),

                dwellNumber:
                    Number(
                        storage.roomNumber
                    )

            },

            {

                $set: {

                    dwellNumber:
                        Number(
                            targetStorage.roomNumber
                        )

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
// AGROSTORE ONLY.
//
// Rules:
//
//     Current 100 -> 80   YES
//     Current 100 -> 50   YES
//     Current 100 -> 0    YES
//
//     Current 100 -> 100  NO
//     Current 100 -> 120  NO
//
// When quantity reaches zero:
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

    // ======================================================
    // VALIDATE ITEM ID
    // ======================================================

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


    // ======================================================
    // VALIDATE QUANTITY
    // ======================================================

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
    // STORAGE MUST BE AGROSTORE
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
    // STORAGE MUST BE ACTIVE
    // ======================================================

    if (
        String(
            storage.status || ""
        )
        .trim()
        .toLowerCase() !==
        "active"
    ) {

        throw createError(
            "Feed quantity cannot be updated in an inactive AgroStore.",
            400
        );

    }


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
                "feeds",

            dwellNumber:
                Number(
                    storage.roomNumber
                ),

            quantity: {

                $gt:
                    0

            }

        });


    if (
        !feed
    ) {

        throw createError(
            "The selected feed was not found in this AgroStore or has no remaining quantity.",
            404
        );

    }


    // ======================================================
    // CURRENT QUANTITY
    // ======================================================

    const currentQuantity =
        Number(
            feed.quantity || 0
        );


    // ======================================================
    // QUANTITY MUST DECREASE
    // ======================================================

    if (
        numericQuantity >=
        currentQuantity
    ) {

        if (
            numericQuantity ===
            currentQuantity
        ) {

            throw createError(
                "The new quantity must be lower than the current quantity.",
                400
            );

        }


        throw createError(
            "Feed quantity can only be reduced. You cannot add quantity through this form.",
            400
        );

    }


    // ======================================================
    // UNIT VALIDATION
    // ======================================================
    //
    // The existing feed unit cannot be changed while
    // reducing quantity.
    //
    // ======================================================

    if (

        unit !== undefined &&

        unit !== null &&

        String(unit).trim() !== ""

    ) {

        const submittedUnit =
            String(
                unit
            )
            .trim()
            .toLowerCase();


        const currentUnit =
            String(
                feed.unit || ""
            )
            .trim()
            .toLowerCase();


        if (

            currentUnit &&

            submittedUnit !==
            currentUnit

        ) {

            throw createError(
                `The feed unit is ${currentUnit}. The unit cannot be changed while reducing quantity.`,
                400
            );

        }

    }


    // ======================================================
    // ZERO = AUTOMATICALLY REMOVE FROM AGROSTORE
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
                        Number(
                            storage.roomNumber
                        ),

                    quantity: {

                        $gt:
                            0

                    }

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


        if (
            !updatedFeed
        ) {

            throw createError(
                "The feed could not be updated. Please refresh the page and try again.",
                409
            );

        }


        return {

            dairy,

            storage,

            item:
                updatedFeed,

            previousQuantity:
                currentQuantity,

            quantity:
                0,

            reducedBy:
                currentQuantity,

            omitted:
                true

        };

    }


    // ======================================================
    // REDUCE QUANTITY
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
                    Number(
                        storage.roomNumber
                    ),

                quantity: {

                    $gt:
                        numericQuantity

                }

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


    // ======================================================
    // CONCURRENT UPDATE SAFETY
    // ======================================================

    if (
        !updatedFeed
    ) {

        throw createError(
            "The feed quantity could not be reduced. Please refresh the page and try again.",
            409
        );

    }


    return {

        dairy,

        storage,

        item:
            updatedFeed,

        previousQuantity:
            currentQuantity,

        quantity:
            numericQuantity,

        reducedBy:
            currentQuantity -
            numericQuantity,

        omitted:
            false

    };

}


// ==========================================================
// UPDATE MULTIPLE FEED QUANTITIES
// ==========================================================
//
// records:
//
// [
//     {
//         itemId,
//         quantity,
//         unit
//     }
// ]
//
// Each feed is independently validated.
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


    const results =
        [];


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


    if (
        results.length === 0
    ) {

        throw createError(
            "No valid feed quantity records were supplied.",
            400
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
    // NORMAL ROOM STORAGE
    // ------------------------------------------------------

    omitItemsFromStorage,

    reshuffleItems,


    // ------------------------------------------------------
    // AGROSTORE
    // ------------------------------------------------------

    updateFeedQuantity,

    updateFeedQuantities

};