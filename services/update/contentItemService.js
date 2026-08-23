// ==========================================================
// services/update/contentItemService.js
// ==========================================================
//
// STORAGE CONTENT CARD SERVICE
//
// PURPOSE
// ----------------------------------------------------------
//
// Retrieves the complete data required by:
//
//     views/update/content-item.ejs
//
// and allows the same prepared data to be used inside:
//
//     views/dairySet.ejs
//
// ==========================================================
//
// STORAGE RELATIONSHIP
// ----------------------------------------------------------
//
// Dairy Farm:
//
//     dairy._id
//     dairy.code
//
// AgroStore:
//
//     recordType = "structure"
//     type       = "agroStore"
//     assetCode  = dairy.code
//     roomNumber = storage identifier
//
// Content Item:
//
//     assetCode   = dairy.code
//     dwellNumber = agroStore.roomNumber
//
// Therefore:
//
//     agroStore.assetCode
//         ===
//     dairy.code
//
// AND:
//
//     contentItem.dwellNumber
//         ===
//     agroStore.roomNumber
//
// IMPORTANT
// ----------------------------------------------------------
//
// The contentItemId in:
//
//     /dairy/:dairyId/:contentItemId
//
// is the _id of the ACTUAL CONTENT ITEM.
//
// It is NOT the AgroStore _id.
//
// The AgroStore is discovered from:
//
//     dairy.code
//         +
//     contentItem.dwellNumber
//
// ==========================================================
//
// DATA PROVIDED
// ----------------------------------------------------------
//
//     dairy
//     storage
//     item
//     latestStockUpdate
//
// ==========================================================


const mongoose =
    require("mongoose");

const Dairy =
    require("../../models/dairy");


// ==========================================================
// HELPER: VALID OBJECT ID
// ==========================================================

function isValidObjectId(
    value
) {

    return mongoose.Types.ObjectId.isValid(
        value
    );

}


// ==========================================================
// HELPER: CREATE ERROR
// ==========================================================

function createError(
    message,
    status
) {

    const error =
        new Error(
            message
        );

    error.status =
        status;

    return error;

}


// ==========================================================
// HELPER: LATEST STOCK UPDATE
// ==========================================================
//
// Determines the latest update using recordedAt.
//
// It does NOT depend on the physical array position.
//
// ==========================================================

function getLatestStockUpdate(
    item
) {

    if (
        !item ||
        !Array.isArray(
            item.stockUpdates
        ) ||
        item.stockUpdates.length === 0
    ) {

        return null;

    }


    const updates =
        item.stockUpdates
            .filter(
                update =>
                    update
            )
            .slice()
            .sort(
                (a, b) => {

                    const dateA =
                        a.recordedAt
                            ? new Date(
                                a.recordedAt
                            ).getTime()
                            : 0;


                    const dateB =
                        b.recordedAt
                            ? new Date(
                                b.recordedAt
                            ).getTime()
                            : 0;


                    return dateB - dateA;

                }
            );


    return updates.length
        ? updates[0]
        : null;

}


// ==========================================================
// HELPER: PREPARE CONTENT ITEM
// ==========================================================
//
// Converts a Mongoose document / lean object into the
// object expected by the views.
//
// ==========================================================

function prepareContentItem(
    item
) {

    if (!item) {

        return null;

    }


    const latestStockUpdate =
        getLatestStockUpdate(
            item
        );


    const prepared =
        item.toObject
            ? item.toObject({
                virtuals: true
            })
            : {
                ...item
            };


    return {

        ...prepared,

        latestStockUpdate

    };

}


// ==========================================================
// HELPER: GET FARM
// ==========================================================
//
// dairyId ALWAYS identifies the Dairy Farm.
//
// We deliberately require:
//
//     recordType = "farm"
//
// This prevents an animal, AgroStore, room, or other
// structure from being accidentally accepted as the farm.
//
// ==========================================================

async function getFarm(
    dairyId
) {

    const dairy =
        await Dairy.findOne({

            _id:
                dairyId,

            recordType:
                "farm",

            status:
                "active"

        })
        .lean({
            virtuals: true
        });


    if (!dairy) {

        throw createError(
            "Dairy farm not found.",
            404
        );

    }


    return dairy;

}


// ==========================================================
// HELPER: GET STORAGE FROM CONTENT ITEM
// ==========================================================
//
// This is the important relationship.
//
// The content item tells us WHERE it lives:
//
//     contentItem.dwellNumber
//
// The farm tells us WHICH farm it belongs to:
//
//     dairy.code
//
// We then find the storage facility whose:
//
//     assetCode  = dairy.code
//
// AND:
//
//     roomNumber = contentItem.dwellNumber
//
// ==========================================================

async function getStorageForItem(
    dairy,
    item
) {

    if (
        !dairy ||
        !item
    ) {

        return null;

    }


    if (
        item.dwellNumber === null ||
        item.dwellNumber === undefined
    ) {

        return null;

    }


    // ======================================================
    // DETERMINE STORAGE TYPE FROM DWELL NUMBER
    // ======================================================
    //
    // Negative dwell:
    //
    //     AgroStore
    //
    // Non-negative dwell:
    //
    //     Normal Room
    //
    // ======================================================

    const dwellNumber =
        Number(
            item.dwellNumber
        );


    if (
        !Number.isInteger(
            dwellNumber
        )
    ) {

        return null;

    }


    const storageType =
        dwellNumber < 0
            ? "agroStore"
            : "room";


    // ======================================================
    // FIND STORAGE
    // ======================================================
    //
    // IMPORTANT:
    //
    // We DO NOT use an AgroStore ID supplied by the URL.
    //
    // We derive the storage facility from:
    //
    //     dairy.code
    //     item.dwellNumber
    //
    // ======================================================

    const storage =
        await Dairy.findOne({

            recordType:
                "structure",

            type:
                storageType,

            assetCode:
                dairy.code,

            roomNumber:
                dwellNumber,

            dwellNumber:
                null,

            status:
                "active"

        })
        .lean({
            virtuals: true
        });


    return storage;

}


// ==========================================================
// GET CONTENT ITEM
// ==========================================================
//
// ROUTE:
//
//     /dairy/:dairyId/:contentItemId
//
// PARAMETERS:
//
//     dairyId
//         = Dairy Farm._id
//
//     itemId
//         = actual content item's _id
//
// storageId is intentionally NOT required.
//
// The storage facility is derived from:
//
//     item.dwellNumber
//
// ==========================================================

exports.getContentItem =
    async function ({
        dairyId,
        itemId
    }) {


        // ==================================================
        // VALIDATE FARM ID
        // ==================================================

        if (
            !isValidObjectId(
                dairyId
            )
        ) {

            throw createError(
                "Invalid Dairy ID.",
                400
            );

        }


        // ==================================================
        // VALIDATE CONTENT ITEM ID
        // ==================================================

        if (
            !isValidObjectId(
                itemId
            )
        ) {

            throw createError(
                "Invalid content item ID.",
                400
            );

        }


        // ==================================================
        // GET FARM
        // ==================================================

        const dairy =
            await getFarm(
                dairyId
            );


        // ==================================================
        // GET CONTENT ITEM
        // ==================================================
        //
        // IMPORTANT:
        //
        // itemId identifies the ACTUAL ITEM.
        //
        // We verify:
        //
        //     item._id       = itemId
        //     item.assetCode = dairy.code
        //     item.dwellNumber != null
        //
        // ==================================================

        const item =
            await Dairy.findOne({

                _id:
                    itemId,

                recordType:
                    "structure",

                assetCode:
                    dairy.code,

                dwellNumber:
                    {
                        $ne:
                            null
                    },

                status:
                    "active"

            })
            .populate({

                path:
                    "stockUpdates.recordedBy",

                select:
                    "name email"

            })
            .lean({

                virtuals:
                    true

            });


        if (!item) {

            throw createError(
                "Storage content item not found for this Dairy Farm.",
                404
            );

        }


        // ==================================================
        // GET STORAGE
        // ==================================================
        //
        // Storage is determined from:
        //
        //     item.dwellNumber
        //
        // NOT from itemId.
        //
        // NOT from an AgroStore ID.
        //
        // ==================================================

        const storage =
            await getStorageForItem(
                dairy,
                item
            );


        if (!storage) {

            throw createError(
                "Storage facility for this content item was not found.",
                404
            );

        }


        // ==================================================
        // PREPARE ITEM
        // ==================================================

        const preparedItem =
            prepareContentItem(
                item
            );


        // ==================================================
        // RETURN
        // ==================================================

        return {

            dairy,

            storage,

            item:
                preparedItem,

            latestStockUpdate:
                preparedItem
                    ? preparedItem.latestStockUpdate
                    : null

        };

    };


// ==========================================================
// GET CONTENT ITEMS FOR A STORAGE FACILITY
// ==========================================================
//
// This method accepts storageId because the caller is
// explicitly asking for the contents of a known storage
// facility.
//
// The storage is still validated against the farm:
//
//     storage.assetCode === dairy.code
//
// Content belongs to the storage when:
//
//     item.dwellNumber === storage.roomNumber
//
// ==========================================================

exports.getStorageContentItems =
    async function ({
        dairyId,
        storageId
    }) {


        // ==================================================
        // VALIDATE FARM ID
        // ==================================================

        if (
            !isValidObjectId(
                dairyId
            )
        ) {

            throw createError(
                "Invalid Dairy ID.",
                400
            );

        }


        // ==================================================
        // VALIDATE STORAGE ID
        // ==================================================

        if (
            !isValidObjectId(
                storageId
            )
        ) {

            throw createError(
                "Invalid storage ID.",
                400
            );

        }


        // ==================================================
        // GET FARM
        // ==================================================

        const dairy =
            await getFarm(
                dairyId
            );


        // ==================================================
        // GET STORAGE
        // ==================================================

        const storage =
            await Dairy.findOne({

                _id:
                    storageId,

                recordType:
                    "structure",

                type: {
                    $in: [
                        "room",
                        "agroStore"
                    ]
                },

                assetCode:
                    dairy.code,

                roomNumber:
                    {
                        $ne:
                            null
                    },

                dwellNumber:
                    null,

                status:
                    "active"

            })
            .lean({

                virtuals:
                    true

            });


        if (!storage) {

            throw createError(
                "Storage facility not found for this Dairy Farm.",
                404
            );

        }


        // ==================================================
        // GET CONTENT
        // ==================================================
        //
        // The content belongs to the storage when:
        //
        //     contentItem.dwellNumber
        //         ===
        //     storage.roomNumber
        //
        // ==================================================

        const items =
            await Dairy.find({

                recordType:
                    "structure",

                assetCode:
                    dairy.code,

                dwellNumber:
                    storage.roomNumber,

                status:
                    "active"

            })
            .populate({

                path:
                    "stockUpdates.recordedBy",

                select:
                    "name email"

            })
            .lean({

                virtuals:
                    true

            });


        // ==================================================
        // PREPARE ITEMS
        // ==================================================

        const preparedItems =
            items.map(
                item =>
                    prepareContentItem(
                        item
                    )
            );


        // ==================================================
        // RETURN
        // ==================================================

        return {

            dairy,

            storage,

            items:
                preparedItems

        };

    };


// ==========================================================
// GET ALL FARM STORAGE CONTENT
// ==========================================================
//
// Retrieves all active content belonging to storage facilities
// of the specified Dairy Farm.
//
// Farm relationship:
//
//     item.assetCode === dairy.code
//
// Storage relationship:
//
//     item.dwellNumber === storage.roomNumber
//
// ==========================================================

exports.getFarmStorageContent =
    async function ({
        dairyId
    }) {


        // ==================================================
        // VALIDATE FARM ID
        // ==================================================

        if (
            !isValidObjectId(
                dairyId
            )
        ) {

            throw createError(
                "Invalid Dairy ID.",
                400
            );

        }


        // ==================================================
        // GET FARM
        // ==================================================

        const dairy =
            await getFarm(
                dairyId
            );


        // ==================================================
        // GET CONTENT
        // ==================================================

        const items =
            await Dairy.find({

                recordType:
                    "structure",

                assetCode:
                    dairy.code,

                dwellNumber:
                    {
                        $ne:
                            null
                    },

                status:
                    "active"

            })
            .populate({

                path:
                    "stockUpdates.recordedBy",

                select:
                    "name email"

            })
            .lean({

                virtuals:
                    true

            });


        // ==================================================
        // PREPARE CONTENT
        // ==================================================

        const preparedItems =
            items.map(
                item =>
                    prepareContentItem(
                        item
                    )
            );


        // ==================================================
        // RETURN
        // ==================================================

        return {

            dairy,

            items:
                preparedItems

        };

    };


// ==========================================================
// GET LATEST STOCK UPDATE
// ==========================================================
//
// Convenience method.
//
// This method only needs the content item's _id.
//
// ==========================================================

exports.getLatestStockUpdate =
    async function ({
        itemId
    }) {


        // ==================================================
        // VALIDATE ID
        // ==================================================

        if (
            !isValidObjectId(
                itemId
            )
        ) {

            throw createError(
                "Invalid content item ID.",
                400
            );

        }


        // ==================================================
        // GET ITEM
        // ==================================================

        const item =
            await Dairy.findById(
                itemId
            )
            .select(
                "stockUpdates"
            )
            .populate({

                path:
                    "stockUpdates.recordedBy",

                select:
                    "name email"

            })
            .lean();


        if (!item) {

            throw createError(
                "Content item not found.",
                404
            );

        }


        // ==================================================
        // RETURN LATEST
        // ==================================================

        return getLatestStockUpdate(
            item
        );

    };


// ==========================================================
// EXPORT HELPERS
// ==========================================================

exports.getLatestStockUpdateFromItem =
    getLatestStockUpdate;

exports.prepareContentItem =
    prepareContentItem;