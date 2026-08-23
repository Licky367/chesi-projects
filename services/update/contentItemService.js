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
//     views/storage/content-item.ejs
//
// and allows the same prepared data to be used inside:
//
//     views/dairySet.ejs
//
// DATA PROVIDED
// ----------------------------------------------------------
//
//     dairy
//     storage
//     item
//     latestStockUpdate
//
// STOCK UPDATE ARCHITECTURE
// ----------------------------------------------------------
//
// item.stockUpdates[]
//
// Each update contains:
//
//     quantity
//     stockUpdateNote
//     images
//     recordedBy
//     recordedAt
//
// recordedBy is populated from User.
//
// IMPORTANT
// ----------------------------------------------------------
//
// The latest stock update is determined using recordedAt,
// rather than relying on the physical position of the item
// inside stockUpdates[].
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
// Prepare a storage item without changing the original
// database document.
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


    return {

        ...item.toObject
            ? item.toObject({
                virtuals: true
            })
            : item,

        latestStockUpdate

    };

}


// ==========================================================
// GET CONTENT ITEM
// ==========================================================
//
// Retrieves:
//
//     dairy
//     storage
//     item
//
// and populates:
//
//     item.stockUpdates.recordedBy
//
// PARAMETERS
// ----------------------------------------------------------
//
//     dairyId
//     storageId
//     itemId
//
// ==========================================================

exports.getContentItem =
    async function ({
        dairyId,
        storageId,
        itemId
    }) {


        // ==================================================
        // VALIDATE IDS
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
        // GET DAIRY
        // ==================================================

        const dairy =
            await Dairy.findById(
                dairyId
            ).lean({
                virtuals: true
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
        //
        // Storage is represented by a Dairy document whose:
        //
        //     recordType = structure
        //
        // and:
        //
        //     type = room
        //
        // OR:
        //
        //     type = agroStore
        //
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

                status:
                    "active"

            })
            .lean({
                virtuals: true
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
        // GET CONTENT ITEM
        // ==================================================
        //
        // The item must:
        //
        //     belong to the same farm
        //
        //     have the requested dwellNumber
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
                virtuals: true
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
        // PREPARE ITEM
        // ==================================================

        const preparedItem =
            prepareContentItem(
                item
            );


        // ==================================================
        // RETURN CARD DATA
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
// This method is useful for dairySet.ejs when the card needs
// to display multiple storage contents.
//
// ==========================================================

exports.getStorageContentItems =
    async function ({
        dairyId,
        storageId
    }) {


        // ==================================================
        // VALIDATE IDS
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
        // GET DAIRY
        // ==================================================

        const dairy =
            await Dairy.findById(
                dairyId
            ).lean({
                virtuals: true
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

                status:
                    "active"

            })
            .lean({
                virtuals: true
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
// Retrieves all active content allocated to either:
//
//     Room
//
// or:
//
//     AgroStore
//
// belonging to a particular Dairy farm.
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
            await Dairy.findById(
                dairyId
            ).lean({

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

                assetCode:
                    dairy.code,

                dwellNumber:
                    {
                        $ne:
                            null
                    },

                status:
                    "active",

                recordType:
                    "structure"

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