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
// CHECK AGROSTORE
// ==========================================================
//
// AgroStore:
//
//     type === "feeds"
//
// ==========================================================

function isAgroStore(
    storage
) {

    return (

        storage &&

        String(storage.type || "")
            .trim()
            .toLowerCase() ===
            "feeds"

    );

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
// AGROSTORE CONTENT FILTER
// ==========================================================
//
// AgroStore may contain:
//
//     type = feeds
//     quantity > 0
//     dwellNumber = AgroStore number
//
// Nothing else.
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

        dwellNumber:
            storage.roomNumber,

        type:
            "feeds",

        quantity: {
            $gt: 0
        }

    };

}


// ==========================================================
// AGROSTORE AVAILABLE ITEM FILTER
// ==========================================================
//
// Only unallocated feeds with positive quantity can be
// added to an AgroStore.
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
            $gt: 0
        }

    };

}


// ==========================================================
// NORMAL STORAGE CONTENT FILTER
// ==========================================================
//
// Normal Rooms can contain the farm's allocated animals/assets.
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
            storage.roomNumber

    };

}


// ==========================================================
// GENERAL AVAILABLE ITEM FILTER
// ==========================================================
//
// AgroStore:
//
//     farm
//     feeds
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

    let currentFilter;


    if (
        isAgroStore(
            storage
        )
    ) {

        // --------------------------------------------------
        // AGROSTORE:
        // ONLY POSITIVE-QUANTITY FEEDS
        // --------------------------------------------------

        currentFilter =
            agroStoreContentFilter(
                dairy,
                storage
            );

    } else {

        // --------------------------------------------------
        // NORMAL ROOM:
        // EXISTING ROOM LOGIC
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

        );


    // ======================================================
    // TARGET STORAGES
    // ======================================================
    //
    // ONLY NORMAL ROOMS GET RESHUFFLE TARGETS.
    //
    // AgroStore receives no targets.
    //
    // ======================================================

    let targetStorages = [];


    if (
        !isAgroStore(
            storage
        )
    ) {

        const storages =
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
// NORMAL ROOM:
//
//     Existing room allocation logic.
//
// AGROSTORE:
//
//     ONLY feeds
//     ONLY quantity > 0
//     ONLY unallocated feeds
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
        String(storage.status || "")
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
                    $in: ids
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
        // ADD FEEDS TO AGROSTORE
        // --------------------------------------------------

        const result =
            await Dairy.updateMany(

                {

                    _id: {
                        $in: ids
                    },

                    ...agroStoreAvailableItemFilter(
                        dairy
                    )

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


    // ======================================================
    // NORMAL ROOM
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
// IMPORTANT:
//
// Omit exists ONLY for normal Rooms.
//
// AgroStore feeds cannot be manually omitted.
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
    // AGROSTORE DOES NOT USE OMIT
    // ------------------------------------------------------

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
    // FIND ROOM ITEMS
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
    // OMIT FROM ROOM
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
//
// Reshuffling applies ONLY to normal Rooms.
//
// AgroStores cannot be reshuffled into or out of.
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


    // ======================================================
    // AGROSTORE CANNOT RESHUFFLE
    // ======================================================

    if (
        isAgroStore(
            storage
        ) ||
        isAgroStore(
            targetStorage
        )
    ) {

        throw createError(
            "AgroStore feeds cannot be reshuffled. Reduce the feed quantity instead.",
            400
        );

    }


    // ======================================================
    // CURRENT STORAGE ACTIVE
    // ======================================================

    if (
        String(storage.status || "")
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
        String(targetStorage.status || "")
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
        String(targetStorage._id) ===
        String(storage._id)
    ) {

        throw createError(
            "The target storage facility must be different from the current storage.",
            400
        );

    }


    // ======================================================
    // STORAGE TYPES MUST MATCH
    // ======================================================

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
    // VERIFY ROOM ITEMS
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
// UPDATE SINGLE FEED QUANTITY
// ==========================================================
//
// AGROSTORE ONLY.
//
// IMPORTANT:
//
// The quantity may ONLY decrease.
//
// Example:
//
//     Current = 100
//     New     = 70   ✅
//
//     Current = 100
//     New     = 100  ❌ no increase/change
//
//     Current = 100
//     New     = 120  ❌ rejected
//
//     Current = 100
//     New     = 0    ✅ feed removed from AgroStore
//
// The service enforces this server-side.
// Therefore changing the HTML input manually cannot bypass it.
//
// ==========================================================

async function updateFeedQuantity({
    dairyId,
    storageId,
    itemId,
    quantity,
    unit
}) {

    // ------------------------------------------------------
    // VALIDATE ITEM ID
    // ------------------------------------------------------

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


    // ------------------------------------------------------
    // VALIDATE QUANTITY
    // ------------------------------------------------------

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
                storage.roomNumber,

            quantity: {
                $gt: 0
            }

        });


    if (!feed) {

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
    // DO NOT ALLOW ADDING QUANTITY
    // ======================================================

    if (
        numericQuantity >=
        currentQuantity
    ) {

        throw createError(
            numericQuantity === currentQuantity
                ? "The new quantity must be lower than the current quantity."
                : "Feed quantity can only be reduced. You cannot add quantity through this form.",
            400
        );

    }


    // ======================================================
    // UNIT
    // ======================================================
    //
    // The quantity belongs to the existing unit.
    //
    // We do not allow:
    //
    //     100 kg -> 50 bags
    //
    // because that would change the meaning of the stored
    // quantity rather than simply reducing it.
    //
    // ======================================================

    if (
        unit !== undefined &&
        unit !== null &&
        String(unit).trim() !== ""
    ) {

        const submittedUnit =
            String(unit)
                .trim()
                .toLowerCase();


        const currentUnit =
            String(feed.unit || "")
                .trim()
                .toLowerCase();


        if (
            currentUnit &&
            submittedUnit !== currentUnit
        ) {

            throw createError(
                `The feed unit is ${currentUnit}. The unit cannot be changed while reducing quantity.`,
                400
            );

        }

    }


    // ======================================================
    // ZERO = REMOVE FROM AGROSTORE
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
                        storage.roomNumber,

                    quantity: {
                        $gt: 0
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
                    storage.roomNumber,

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


    // ------------------------------------------------------
    // SAFETY CHECK
    // ------------------------------------------------------

    if (!updatedFeed) {

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
// Each feed is independently checked.
//
// No record can increase its quantity.
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