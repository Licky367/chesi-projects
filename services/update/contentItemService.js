// ==========================================================
// services/update/contentItemService.js
// ==========================================================
//
// STORAGE CONTENT CARD SERVICE
//
// ROUTE
// ----------------------------------------------------------
//
//     /dairy/:contentItemId/:dwellNumber
//
// IMPORTANT
// ----------------------------------------------------------
//
// contentItemId
//     = MongoDB _id of the storage CONTENT ITEM
//
// dwellNumber
//     = storage location identifier
//
// The service determines the Dairy Farm and Storage Facility
// from the content item's ownership relationship.
//
// RELATIONSHIP
// ----------------------------------------------------------
//
//     CONTENT ITEM
//         |
//         | assetCode
//         v
//     DAIRY FARM.code
//         |
//         | assetCode
//         v
//     STORAGE FACILITY
//         |
//         | roomNumber
//         v
//     CONTENT ITEM.dwellNumber
//
// EXAMPLE
// ----------------------------------------------------------
//
// Farm:
//
//     code = -100
//
// AgroStore:
//
//     assetCode = -100
//     roomNumber = -5
//
// Feed:
//
//     assetCode = -100
//     dwellNumber = -5
//
// Therefore:
//
//     /dairy/<feedId>/-5
//
// resolves to:
//
//     feed
//         -> farm -100
//         -> AgroStore roomNumber -5
//
// ==========================================================


const mongoose =
    require("mongoose");

const Dairy =
    require("../../models/dairy");


// ==========================================================
// HELPER
// ==========================================================

function isValidObjectId(
    value
) {

    return mongoose.Types.ObjectId.isValid(
        value
    );

}


// ==========================================================
// HELPER
// ==========================================================
//
// Safely determine the latest stock update.
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
// HELPER
// ==========================================================
//
// Prepare a storage item.
//
// Works with both:
//
//     Mongoose document
//
// and:
//
//     lean object
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


    const object =
        typeof item.toObject === "function"

            ? item.toObject({
                virtuals: true
            })

            : item;


    return {

        ...object,

        latestStockUpdate

    };

}


// ==========================================================
// HELPER
// ==========================================================
// Parse dwellNumber safely.
// ==========================================================

function parseDwellNumber(
    value
) {

    const number =
        Number(value);


    if (
        !Number.isInteger(number)
    ) {

        return null;

    }


    return number;

}


// ==========================================================
// GET CONTENT ITEM
// ==========================================================
//
// ROUTE PARAMETERS
// ----------------------------------------------------------
//
//     contentItemId
//     dwellNumber
//
// IMPORTANT
// ----------------------------------------------------------
//
// The farm is NOT supplied by the route.
//
// The farm is found from:
//
//     contentItem.assetCode
//
// The storage facility is then found from:
//
//     storage.assetCode === farm.code
//
// and:
//
//     storage.roomNumber === contentItem.dwellNumber
//
// ==========================================================

exports.getContentItem =
    async function ({
        contentItemId,
        dwellNumber
    }) {


        // ==================================================
        // VALIDATE CONTENT ITEM ID
        // ==================================================

        if (
            !isValidObjectId(
                contentItemId
            )
        ) {

            const error =
                new Error(
                    "Invalid content item ID."
                );

            error.status = 400;

            throw error;

        }


        // ==================================================
        // VALIDATE DWELL NUMBER
        // ==================================================

        const requestedDwellNumber =
            parseDwellNumber(
                dwellNumber
            );


        if (
            requestedDwellNumber === null
        ) {

            const error =
                new Error(
                    "Invalid dwell number."
                );

            error.status = 400;

            throw error;

        }


        // ==================================================
        // GET CONTENT ITEM
        // ==================================================
        //
        // The content item is the FIRST route identifier.
        //
        // /dairy/:contentItemId/:dwellNumber
        //
        // Therefore we start here.
        //
        // ==================================================

        const item =
            await Dairy.findOne({

                _id:
                    contentItemId,

                recordType:
                    "structure",

                dwellNumber:
                    requestedDwellNumber,

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

            const error =
                new Error(
                    "Storage content item not found."
                );

            error.status = 404;

            throw error;

        }


        // ==================================================
        // CONTENT ITEM MUST BELONG TO A FARM
        // ==================================================
        //
        // An assigned content item has:
        //
        //     assetCode = negative farm code
        //
        // ==================================================

        if (
            item.assetCode === null ||
            item.assetCode === undefined
        ) {

            const error =
                new Error(
                    "Storage content item does not belong to a Dairy Farm."
                );

            error.status = 404;

            throw error;

        }


        const farmCode =
            Number(
                item.assetCode
            );


        if (
            !Number.isInteger(
                farmCode
            ) ||
            farmCode >= 0
        ) {

            const error =
                new Error(
                    "Storage content item has an invalid parent Dairy Farm code."
                );

            error.status = 400;

            throw error;

        }


        // ==================================================
        // GET DAIRY FARM
        // ==================================================
        //
        // IMPORTANT:
        //
        // We DO NOT use contentItemId as the farm ID.
        //
        // We use:
        //
        //     item.assetCode
        //
        // to find:
        //
        //     farm.code
        //
        // ==================================================

        const dairy =
            await Dairy.findOne({

                recordType:
                    "farm",

                code:
                    farmCode,

                status:
                    "active"

            })
            .lean({

                virtuals:
                    true

            });


        if (!dairy) {

            const error =
                new Error(
                    "Dairy farm belonging to this content item was not found."
                );

            error.status = 404;

            throw error;

        }


        // ==================================================
        // VERIFY FARM RELATIONSHIP
        // ==================================================
        //
        // The content item must point to this farm.
        //
        // ==================================================

        if (
            Number(item.assetCode) !==
            Number(dairy.code)
        ) {

            const error =
                new Error(
                    "Content item does not belong to the resolved Dairy Farm."
                );

            error.status = 409;

            throw error;

        }


        // ==================================================
        // GET STORAGE FACILITY
        // ==================================================
        //
        // THIS IS THE IMPORTANT RELATIONSHIP.
        //
        // A storage facility belongs to the farm when:
        //
        //     storage.assetCode === farm.code
        //
        // A content item belongs to that storage facility when:
        //
        //     contentItem.dwellNumber === storage.roomNumber
        //
        // ==================================================

        const storage =
            await Dairy.findOne({

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
                    requestedDwellNumber,

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

            const error =
                new Error(
                    "Storage facility for this content item was not found."
                );

            error.status = 404;

            throw error;

        }


        // ==================================================
        // VERIFY CONTENT -> STORAGE RELATIONSHIP
        // ==================================================
        //
        // This check makes the relationship explicit:
        //
        //     item.dwellNumber
        //         ===
        //     storage.roomNumber
        //
        // ==================================================

        if (
            Number(item.dwellNumber) !==
            Number(storage.roomNumber)
        ) {

            const error =
                new Error(
                    "Content item does not belong to the resolved storage facility."
                );

            error.status = 409;

            throw error;

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
// Parameters:
//
//     dairyId
//     storageId
//
// This method remains useful internally for pages that already
// know the farm and storage facility.
//
// ==========================================================

exports.getStorageContentItems =
    async function ({
        dairyId,
        storageId
    }) {


        // ==================================================
        // VALIDATE DAIRY ID
        // ==================================================

        if (
            !isValidObjectId(
                dairyId
            )
        ) {

            const error =
                new Error(
                    "Invalid Dairy ID."
                );

            error.status = 400;

            throw error;

        }


        // ==================================================
        // VALIDATE STORAGE ID
        // ==================================================

        if (
            !isValidObjectId(
                storageId
            )
        ) {

            const error =
                new Error(
                    "Invalid storage ID."
                );

            error.status = 400;

            throw error;

        }


        // ==================================================
        // GET FARM
        // ==================================================

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

                virtuals:
                    true

            });


        if (!dairy) {

            const error =
                new Error(
                    "Dairy farm not found."
                );

            error.status = 404;

            throw error;

        }


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

            const error =
                new Error(
                    "Storage facility not found."
                );

            error.status = 404;

            throw error;

        }


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
// Gets all active content belonging to the farm's storage
// facilities.
//
// ==========================================================

exports.getFarmStorageContent =
    async function ({
        dairyId
    }) {


        // ==================================================
        // VALIDATE ID
        // ==================================================

        if (
            !isValidObjectId(
                dairyId
            )
        ) {

            const error =
                new Error(
                    "Invalid Dairy ID."
                );

            error.status = 400;

            throw error;

        }


        // ==================================================
        // GET FARM
        // ==================================================

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

                virtuals:
                    true

            });


        if (!dairy) {

            const error =
                new Error(
                    "Dairy farm not found."
                );

            error.status = 404;

            throw error;

        }


        // ==================================================
        // GET ALL STORAGE CONTENT
        // ==================================================

        const items =
            await Dairy.find({

                recordType:
                    "structure",

                assetCode:
                    dairy.code,

                dwellNumber: {
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

            const error =
                new Error(
                    "Invalid content item ID."
                );

            error.status = 400;

            throw error;

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

            const error =
                new Error(
                    "Content item not found."
                );

            error.status = 404;

            throw error;

        }


        // ==================================================
        // RETURN LATEST
        // ==================================================

        return getLatestStockUpdate(
            item
        );

    };