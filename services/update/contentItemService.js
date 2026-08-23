// ==========================================================
// services/update/contentItemService.js
// ==========================================================
//
// STORAGE CONTENT ITEM SERVICE
//
// ROUTE
// ----------------------------------------------------------
//
//     /dairy/:contentItemId/:dwellNumber
//
// IDENTIFICATION
// ----------------------------------------------------------
//
//     contentItemId
//         = MongoDB _id of the CONTENT ITEM
//
//     dwellNumber
//         = dwellNumber belonging to that CONTENT ITEM
//
// IMPORTANT
// ----------------------------------------------------------
//
// The CONTENT ITEM itself is the primary record.
//
// We DO NOT:
//
//     • resolve a Dairy Farm from assetCode
//     • require a farm lookup
//     • use dairy.code to identify the item
//     • require a parent farm to exist
//
// The item is found directly using:
//
//     _id
//     dwellNumber
//
// ==========================================================


const mongoose =
    require("mongoose");

const Dairy =
    require("../../models/dairy");


// ==========================================================
// OBJECT ID VALIDATION
// ==========================================================

function isValidObjectId(
    value
) {

    return mongoose.Types.ObjectId.isValid(
        value
    );

}


// ==========================================================
// DWELL NUMBER
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
// LATEST STOCK UPDATE
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
// PREPARE CONTENT ITEM
// ==========================================================

function prepareContentItem(
    item
) {

    if (!item) {

        return null;

    }


    const object =
        typeof item.toObject === "function"

            ? item.toObject({
                virtuals: true
            })

            : {
                ...item
            };


    const latestStockUpdate =
        getLatestStockUpdate(
            object
        );


    return {

        ...object,

        latestStockUpdate

    };

}


// ==========================================================
// NORMALIZE IMAGES
// ==========================================================
//
// Multer files may contain:
//
//     path
//     filename
//     location
//     url
//
// We store a simple usable representation.
//
// ==========================================================

function normalizeImages(
    files
) {

    if (
        !Array.isArray(files)
    ) {

        return [];

    }


    return files
        .map(
            file => {

                if (!file) {

                    return null;

                }


                if (
                    file.location
                ) {

                    return file.location;

                }


                if (
                    file.url
                ) {

                    return file.url;

                }


                if (
                    file.path
                ) {

                    return file.path;

                }


                if (
                    file.filename
                ) {

                    return file.filename;

                }


                return null;

            }
        )
        .filter(
            image =>
                image
        );

}


// ==========================================================
// GET CONTENT ITEM
// ==========================================================
//
// ROUTE:
//
//     GET /dairy/:contentItemId/:dwellNumber
//
// LOOKUP:
//
//     _id           = contentItemId
//     dwellNumber   = dwellNumber
//
// NO FARM LOOKUP.
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
        // FIND THE CONTENT ITEM DIRECTLY
        // ==================================================
        //
        // THIS IS THE IMPORTANT PART.
        //
        // contentItemId IS THE ITEM ID.
        //
        // We do not convert it into a Dairy Farm ID.
        //
        // ==================================================

        const item =
            await Dairy.findOne({

                _id:
                    contentItemId,

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


        // ==================================================
        // ITEM NOT FOUND
        // ==================================================

        if (!item) {

            const error =
                new Error(
                    "Storage content item not found."
                );

            error.status = 404;

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
        //
        // There is deliberately NO dairy farm lookup.
        //
        // The content item itself is the record requested
        // by the URL.
        //
        // ==================================================

        return {

            dairy:
                null,

            storage:
                null,

            item:
                preparedItem,

            latestStockUpdate:
                preparedItem
                    ? preparedItem.latestStockUpdate
                    : null

        };

    };


// ==========================================================
// UPDATE CONTENT ITEM
// ==========================================================
//
// ROUTE:
//
//     POST /dairy/:contentItemId/:dwellNumber
//
// PARAMETERS:
//
//     contentItemId
//     dwellNumber
//
// BODY:
//
//     quantity
//     unit
//     stockUpdateNote
//
// FILES:
//
//     images
//
// IMPORTANT
// ----------------------------------------------------------
//
// The item is located directly by:
//
//     _id
//     dwellNumber
//
// ==========================================================

exports.updateContentItem =
    async function ({
        contentItemId,
        dwellNumber,
        data,
        images,
        userId,
        userName
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
        // FIND CONTENT ITEM DIRECTLY
        // ==================================================

        const item =
            await Dairy.findOne({

                _id:
                    contentItemId,

                dwellNumber:
                    requestedDwellNumber,

                status:
                    "active"

            });


        // ==================================================
        // ITEM NOT FOUND
        // ==================================================

        if (!item) {

            const error =
                new Error(
                    "Storage content item not found."
                );

            error.status = 404;

            throw error;

        }


        // ==================================================
        // REQUEST DATA
        // ==================================================

        const rawQuantity =
            data &&
            data.quantity !== undefined
                ? data.quantity
                : null;


        const unit =
            data &&
            data.unit !== undefined
                ? String(
                    data.unit
                ).trim()
                : "";


        const stockUpdateNote =
            data &&
            data.stockUpdateNote !== undefined
                ? String(
                    data.stockUpdateNote
                ).trim()
                : "";


        // ==================================================
        // VALIDATE QUANTITY
        // ==================================================

        const quantity =
            Number(
                rawQuantity
            );


        if (
            rawQuantity === null ||
            rawQuantity === "" ||
            !Number.isFinite(
                quantity
            ) ||
            quantity < 0
        ) {

            const error =
                new Error(
                    "A valid non-negative quantity is required."
                );

            error.status = 400;

            throw error;

        }


        // ==================================================
        // NORMALIZE IMAGES
        // ==================================================

        const normalizedImages =
            normalizeImages(
                images
            );


        // ==================================================
        // UPDATE CURRENT STOCK
        // ==================================================

        item.quantity =
            quantity;


        // ==================================================
        // UPDATE UNIT
        // ==================================================

        if (
            unit
        ) {

            item.unit =
                unit;

        }


        // ==================================================
        // STOCK UPDATE HISTORY
        // ==================================================
        //
        // Keep the existing history.
        //
        // Each submission creates a new stock update record.
        //
        // ==================================================

        if (
            !Array.isArray(
                item.stockUpdates
            )
        ) {

            item.stockUpdates =
                [];

        }


        const stockUpdate = {

            quantity,

            stockUpdateNote,

            images:
                normalizedImages,

            recordedAt:
                new Date()

        };


        // ==================================================
        // RECORDED BY
        // ==================================================

        if (
            userId &&
            isValidObjectId(
                userId
            )
        ) {

            stockUpdate.recordedBy =
                userId;

        }


        // ==================================================
        // SAVE USER NAME IF SUPPORTED
        // ==================================================
        //
        // Only add this field when the schema allows it.
        //
        // Mongoose strict mode will otherwise ignore unknown
        // fields.
        //
        // ==================================================

        if (
            userName
        ) {

            stockUpdate.userName =
                String(
                    userName
                );

        }


        // ==================================================
        // ADD STOCK UPDATE
        // ==================================================

        item.stockUpdates.push(
            stockUpdate
        );


        // ==================================================
        // SAVE
        // ==================================================

        await item.save();


        // ==================================================
        // PREPARE RESULT
        // ==================================================

        const savedItem =
            await Dairy.findById(
                item._id
            )
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


        const preparedItem =
            prepareContentItem(
                savedItem
            );


        // ==================================================
        // RETURN
        // ==================================================

        return {

            success:
                true,

            message:
                "Stock updated successfully.",

            item:
                preparedItem,

            latestStockUpdate:
                preparedItem
                    ? preparedItem.latestStockUpdate
                    : null,

            // IMPORTANT:
            //
            // Redirect back to the EXACT route that was
            // submitted.
            //
            redirect:
                `/dairy/${contentItemId}/${requestedDwellNumber}`

        };

    };


// ==========================================================
// GET STORAGE CONTENT ITEMS
// ==========================================================
//
// This method is retained for other parts of the application.
//
// It requires a known storage facility.
//
// ==========================================================

exports.getStorageContentItems =
    async function ({
        dairyId,
        storageId
    }) {


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


        const storage =
            await Dairy.findOne({

                _id:
                    storageId,

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


        const items =
            await Dairy.find({

                assetCode:
                    storage.assetCode,

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


        const preparedItems =
            items.map(
                item =>
                    prepareContentItem(
                        item
                    )
            );


        return {

            dairy:
                null,

            storage,

            items:
                preparedItems

        };

    };


// ==========================================================
// GET FARM STORAGE CONTENT
// ==========================================================
//
// Retained for compatibility with other services/pages.
//
// ==========================================================

exports.getFarmStorageContent =
    async function ({
        dairyId
    }) {


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


        const dairy =
            await Dairy.findById(
                dairyId
            )
            .lean({

                virtuals:
                    true

            });


        if (!dairy) {

            const error =
                new Error(
                    "Dairy record not found."
                );

            error.status = 404;

            throw error;

        }


        const items =
            await Dairy.find({

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


        const preparedItems =
            items.map(
                item =>
                    prepareContentItem(
                        item
                    )
            );


        return {

            dairy,

            items:
                preparedItems

        };

    };


// ==========================================================
// GET LATEST STOCK UPDATE
// ==========================================================

exports.getLatestStockUpdate =
    async function ({
        itemId
    }) {


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


        return getLatestStockUpdate(
            item
        );

    };


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    getContentItem:
        exports.getContentItem,

    updateContentItem:
        exports.updateContentItem,

    getStorageContentItems:
        exports.getStorageContentItems,

    getFarmStorageContent:
        exports.getFarmStorageContent,

    getLatestStockUpdate:
        exports.getLatestStockUpdate

};