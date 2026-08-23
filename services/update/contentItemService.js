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
//     = roomNumber of the storage facility
//
// RELATIONSHIP
// ----------------------------------------------------------
//
// CONTENT ITEM
//     contentItem._id
//         |
//         |
//     contentItem.assetCode
//         |
//         v
// DAIRY FARM
//     farm.code
//         |
//         |
//     storage.assetCode
//         |
//         v
// STORAGE FACILITY / AGROSTORE
//     storage.roomNumber
//         |
//         |
//     contentItem.dwellNumber
//
// ==========================================================


const mongoose =
    require("mongoose");

const Dairy =
    require("../../models/dairy");


// ==========================================================
// HELPER
// ==========================================================
//
// Check MongoDB ObjectId.
//
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
// Parse dwellNumber.
//
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
// HELPER
// ==========================================================
//
// Get latest stock update.
//
// IMPORTANT
// ----------------------------------------------------------
//
// Latest means the update with the newest recordedAt.
//
// It does NOT depend on array position.
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
// Prepare content item.
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
//
// Convert uploaded files into values suitable for the
// stockUpdates.images array.
//
// Supports common multer properties.
//
// ==========================================================

function prepareImages(
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


                /*
                --------------------------------------------------
                If the upload middleware already provides a URL.
                --------------------------------------------------
                */

                if (
                    file.url
                ) {

                    return file.url;

                }


                /*
                --------------------------------------------------
                Cloudinary-style secure URL.
                --------------------------------------------------
                */

                if (
                    file.secure_url
                ) {

                    return file.secure_url;

                }


                /*
                --------------------------------------------------
                Local uploaded file path.
                --------------------------------------------------
                */

                if (
                    file.path
                ) {

                    return file.path;

                }


                /*
                --------------------------------------------------
                Multer destination + filename.
                --------------------------------------------------
                */

                if (
                    file.destination &&
                    file.filename
                ) {

                    return (
                        file.destination +
                        "/" +
                        file.filename
                    );

                }


                /*
                --------------------------------------------------
                Filename fallback.
                --------------------------------------------------
                */

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
// HELPER
// ==========================================================
//
// Resolve the farm belonging to a content item.
//
// RELATIONSHIP:
//
//     contentItem.assetCode === farm.code
//
// ==========================================================

async function resolveFarmFromContentItem(
    item
) {

    if (
        !item
    ) {

        const error =
            new Error(
                "Content item was not supplied."
            );

        error.status = 404;

        throw error;

    }


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


    const dairy =
        await Dairy.findOne({

            code:
                farmCode,

            /*
            ------------------------------------------------------
            Farm identity.
            ------------------------------------------------------
            */

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
                "Dairy farm belonging to this content item was not found."
            );

        error.status = 404;

        throw error;

    }


    return dairy;

}


// ==========================================================
// HELPER
// ==========================================================
//
// Resolve storage facility.
//
// RELATIONSHIP:
//
//     storage.assetCode === farm.code
//
// AND:
//
//     storage.roomNumber === item.dwellNumber
//
// ==========================================================

async function resolveStorageFromContentItem(
    item,
    dairy,
    dwellNumber
) {

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


    /*
    ------------------------------------------------------------
    The content item itself must point to the requested
    storage location.
    ------------------------------------------------------------
    */

    if (
        Number(item.dwellNumber) !==
        requestedDwellNumber
    ) {

        const error =
            new Error(
                "Content item does not belong to the requested storage location."
            );

        error.status = 409;

        throw error;

    }


    /*
    ------------------------------------------------------------
    Find the storage facility.

    Farm ownership:
        storage.assetCode === dairy.code

    Storage identity:
        storage.roomNumber === dwellNumber

    Storage must NOT itself be another content item.
    ------------------------------------------------------------
    */

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


    /*
    ------------------------------------------------------------
    Explicit relationship verification.
    ------------------------------------------------------------
    */

    if (
        Number(storage.assetCode) !==
        Number(dairy.code)
    ) {

        const error =
            new Error(
                "Storage facility does not belong to the Dairy Farm."
            );

        error.status = 409;

        throw error;

    }


    if (
        Number(storage.roomNumber) !==
        Number(item.dwellNumber)
    ) {

        const error =
            new Error(
                "Content item does not belong to the resolved storage facility."
            );

        error.status = 409;

        throw error;

    }


    return storage;

}


// ==========================================================
// GET CONTENT ITEM
// ==========================================================
//
// ROUTE:
//
//     GET /dairy/:contentItemId/:dwellNumber
//
// contentItemId
//     = content item _id
//
// dwellNumber
//     = storage roomNumber
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
        // RESOLVE FARM
        // ==================================================

        const dairy =
            await resolveFarmFromContentItem(
                item
            );


        // ==================================================
        // RESOLVE STORAGE
        // ==================================================

        const storage =
            await resolveStorageFromContentItem(
                item,
                dairy,
                requestedDwellNumber
            );


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
// UPDATE CONTENT ITEM
// ==========================================================
//
// THIS FUNCTION FIXES:
//
//     contentItemService.updateContentItem is not a function
//
// ROUTE:
//
//     POST /dairy/:contentItemId/:dwellNumber
//
// RELATIONSHIP:
//
//     contentItemId
//         |
//         v
//     contentItem._id
//         |
//         | assetCode
//         v
//     farm.code
//         |
//         | assetCode
//         v
//     storage.roomNumber
//         |
//         | dwellNumber
//         v
//     contentItem
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
        // GET CONTENT ITEM
        // ==================================================
        //
        // IMPORTANT:
        //
        // contentItemId is the item's _id.
        //
        // It is NOT the farm ID.
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
        // RESOLVE FARM
        // ==================================================

        const dairy =
            await resolveFarmFromContentItem(
                item
            );


        // ==================================================
        // RESOLVE STORAGE
        // ==================================================

        const storage =
            await resolveStorageFromContentItem(
                item,
                dairy,
                requestedDwellNumber
            );


        // ==================================================
        // NORMALIZE DATA
        // ==================================================

        const quantityValue =
            data &&
            data.quantity !== null &&
            data.quantity !== undefined &&
            String(data.quantity).trim() !== ""
                ? Number(
                    data.quantity
                )
                : null;


        if (
            quantityValue !== null &&
            !Number.isFinite(
                quantityValue
            )
        ) {

            const error =
                new Error(
                    "Invalid quantity."
                );

            error.status = 400;

            throw error;

        }


        if (
            quantityValue !== null &&
            quantityValue < 0
        ) {

            const error =
                new Error(
                    "Quantity cannot be negative."
                );

            error.status = 400;

            throw error;

        }


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
        // PREPARE IMAGES
        // ==================================================

        const preparedImages =
            prepareImages(
                images
            );


        // ==================================================
        // UPDATE CURRENT STOCK
        // ==================================================

        if (
            quantityValue !== null
        ) {

            item.quantity =
                quantityValue;

        }


        // ==================================================
        // UPDATE UNIT
        // ==================================================

        if (
            unit !== ""
        ) {

            item.unit =
                unit;

        }


        // ==================================================
        // CREATE STOCK UPDATE RECORD
        // ==================================================

        const stockUpdate = {

            quantity:
                quantityValue !== null
                    ? quantityValue
                    : item.quantity,

            stockUpdateNote,

            images:
                preparedImages,

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
        // OPTIONAL USER NAME
        // ==================================================
        //
        // Only set this if the schema accepts it.
        //
        // Since existing architecture uses recordedBy,
        // the authenticated User remains the source of identity.
        //
        // ==================================================

        if (
            userName &&
            typeof userName === "string"
        ) {

            /*
            --------------------------------------------------
            Do not force userName into the document unless
            the schema defines such a field.
            --------------------------------------------------
            */

        }


        // ==================================================
        // PUSH STOCK UPDATE
        // ==================================================

        if (
            !Array.isArray(
                item.stockUpdates
            )
        ) {

            item.stockUpdates =
                [];

        }


        item.stockUpdates.push(
            stockUpdate
        );


        // ==================================================
        // SAVE
        // ==================================================

        await item.save();


        // ==================================================
        // GET UPDATED ITEM
        // ==================================================

        const updatedItem =
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


        // ==================================================
        // PREPARE UPDATED ITEM
        // ==================================================

        const preparedItem =
            prepareContentItem(
                updatedItem
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
                    : null,

            /*
            --------------------------------------------------
            Redirect back to the exact content-item URL.
            --------------------------------------------------
            */

            redirect:
                `/dairy/${contentItemId}/${requestedDwellNumber}`

        };

    };


// ==========================================================
// GET CONTENT ITEMS FOR A STORAGE FACILITY
// ==========================================================
//
// This method is retained for pages that already know:
//
//     dairyId
//     storageId
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
// Retrieves every active content item belonging to a farm's
// storage facilities.
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
        // GET CONTENT
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


// ==========================================================
// EXPORTS
// ==========================================================
//
// updateContentItem is explicitly exported above.
//
// Therefore:
//
//     contentItemService.updateContentItem
//
// is now a valid function.
//
// ==========================================================