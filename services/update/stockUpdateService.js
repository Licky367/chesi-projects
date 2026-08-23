// ==========================================================
// services/update/stockUpdateService.js
// ==========================================================
//
// STOCK UPDATE SERVICE
//
// PURPOSE:
// ----------------------------------------------------------
// Handles stock updates for animal-feed / agro-store items.
//
// RESPONSIBILITIES:
//
//     • Locate the stock Dairy record
//     • Locate the AgroStore
//     • Validate the relationship between them
//     • Read the previous stock quantity
//     • Update the stock quantity
//     • Update the stock unit
//     • Create a stockUpdates history record
//     • Create an Update feed item
//     • Store updater name and profile image
//     • Store stock-update images
//
// IMPORTANT RELATIONSHIP:
//
//     AgroStore._id
//         = storageId
//
//     AgroStore.roomNumber
//         = Stock.dwellNumber
//
// The feed Update belongs to:
//
//     Update.dairy = stockDairy._id
//
// NOT:
//
//     Update.dairy = agroStore._id
//
// ==========================================================


const mongoose =
    require("mongoose");


const Dairy =
    require("../../models/dairy");


const Update =
    require("../../models/Update");


// ==========================================================
// MAXIMUM STOCK UPDATE IMAGES
// ==========================================================

const MAX_STOCK_UPDATE_IMAGES = 10;


// ==========================================================
// CREATE STOCK UPDATE
// ==========================================================

exports.createStockUpdate =
async function({

    dairyId,

    storageId,

    itemId,

    user,

    quantity,

    unit,

    stockUpdateNote,

    images

}) {

    // ======================================================
    // VALIDATE IDs
    // ======================================================

    if (
        !mongoose.Types.ObjectId.isValid(
            itemId
        )
    ) {

        throw new Error(
            "Invalid stock item."
        );

    }


    if (
        !mongoose.Types.ObjectId.isValid(
            storageId
        )
    ) {

        throw new Error(
            "Invalid storage."
        );

    }


    // ======================================================
    // VALIDATE USER
    // ======================================================

    if (
        !user
    ) {

        throw new Error(
            "You must be logged in to update stock."
        );

    }


    // ======================================================
    // QUANTITY
    // ======================================================

    const newQuantity =
        Number(
            quantity
        );


    if (
        !Number.isFinite(
            newQuantity
        )
    ) {

        throw new Error(
            "Please provide a valid stock quantity."
        );

    }


    if (
        newQuantity < 0
    ) {

        throw new Error(
            "Stock quantity cannot be negative."
        );

    }


    // ======================================================
    // UNIT
    // ======================================================

    const safeUnit =

        unit !== null &&
        unit !== undefined

            ? String(
                unit
            ).trim()

            : "";


    if (
        safeUnit.length > 50
    ) {

        throw new Error(
            "Stock unit cannot exceed 50 characters."
        );

    }


    // ======================================================
    // STOCK UPDATE NOTE
    // ======================================================

    const safeNote =

        stockUpdateNote !== null &&
        stockUpdateNote !== undefined

            ? String(
                stockUpdateNote
            ).trim()

            : "";


    if (
        safeNote.length > 5000
    ) {

        throw new Error(
            "Stock update note is too long."
        );

    }


    // ======================================================
    // FIND STOCK ITEM
    // ======================================================
    //
    // The item being updated is a Dairy document.
    //
    // itemId is therefore:
    //
    //     Dairy._id
    //
    // ======================================================

    const stockItem =
        await Dairy.findById(
            itemId
        );


    if (
        !stockItem
    ) {

        throw new Error(
            "Stock item was not found."
        );

    }


    // ======================================================
    // FIND AGROSTORE
    // ======================================================
    //
    // AgroStore is also represented by Dairy.
    //
    // storageId therefore points to:
    //
    //     Dairy._id
    //
    // ======================================================

    const agroStore =
        await Dairy.findById(
            storageId
        );


    if (
        !agroStore
    ) {

        throw new Error(
            "AgroStore was not found."
        );

    }


    // ======================================================
    // VERIFY AGROSTORE
    // ======================================================

    const storageType =

        agroStore.type
            ? String(
                agroStore.type
            ).trim()

            : "";


    if (
        storageType !== "agroStore"
    ) {

        throw new Error(
            "The selected storage is not an AgroStore."
        );

    }


    // ======================================================
    // VERIFY STOCK LOCATION
    // ======================================================
    //
    // The stock item must belong to this AgroStore.
    //
    // Relationship:
    //
    //     stockItem.dwellNumber
    //          ===
    //     agroStore.roomNumber
    //
    // ======================================================

    if (

        stockItem.dwellNumber !== null &&
        stockItem.dwellNumber !== undefined &&

        agroStore.roomNumber !== null &&
        agroStore.roomNumber !== undefined

    ) {

        if (

            Number(
                stockItem.dwellNumber
            ) !==

            Number(
                agroStore.roomNumber
            )

        ) {

            throw new Error(
                "This stock item does not belong to the selected AgroStore."
            );

        }

    }


    // ======================================================
    // PREVIOUS QUANTITY
    // ======================================================

    const previousQuantity =

        stockItem.quantity !== null &&
        stockItem.quantity !== undefined

            ? Number(
                stockItem.quantity
            )

            : 0;


    // ======================================================
    // NORMALIZE PREVIOUS QUANTITY
    // ======================================================

    const safePreviousQuantity =

        Number.isFinite(
            previousQuantity
        )

            ? previousQuantity

            : 0;


    // ======================================================
    // STOCK DIFFERENCE
    // ======================================================

    const quantityDifference =

        newQuantity -
        safePreviousQuantity;


    // ======================================================
    // IMAGES
    // ======================================================
    //
    // The controller passes req.files.
    //
    // Depending on the upload middleware, an image may expose:
    //
    //     path
    //     url
    //     location
    //
    // We normalize those into strings.
    //
    // ======================================================

    const stockImages = [];


    if (
        Array.isArray(
            images
        )
    ) {

        for (
            const image of
            images
        ) {

            if (
                !image
            ) {

                continue;

            }


            let imageValue =
                "";


            if (
                typeof image ===
                "string"
            ) {

                imageValue =
                    image;

            } else if (
                image.url
            ) {

                imageValue =
                    image.url;

            } else if (
                image.path
            ) {

                imageValue =
                    image.path;

            } else if (
                image.location
            ) {

                imageValue =
                    image.location;

            }


            imageValue =
                String(
                    imageValue
                ).trim();


            if (
                imageValue
            ) {

                stockImages.push(
                    imageValue
                );

            }

        }

    }


    const limitedImages =
        stockImages.slice(
            0,
            MAX_STOCK_UPDATE_IMAGES
        );


    // ======================================================
    // USER NAME
    // ======================================================

    let userName =
        "";


    if (
        user.name
    ) {

        userName =
            String(
                user.name
            ).trim();

    } else if (
        user.email
    ) {

        userName =
            String(
                user.email
            ).trim();

    }


    // ======================================================
    // USER PROFILE IMAGE
    // ======================================================

    let userImage =
        "";


    if (
        user.profileImage
    ) {

        userImage =
            String(
                user.profileImage
            ).trim();

    }


    // ======================================================
    // USER ROLE
    // ======================================================

    let authorRole =
        "";


    if (
        user.role
    ) {

        authorRole =
            String(
                user.role
            ).trim();

    }


    // ======================================================
    // STOCK ITEM NAME
    // ======================================================

    const feedName =

        stockItem.name

            ? String(
                stockItem.name
            ).trim()

            : "Unnamed Stock";


    // ======================================================
    // STOCK TYPE
    // ======================================================

    const feedType =

        stockItem.type

            ? String(
                stockItem.type
            ).trim()

            : "";


    // ======================================================
    // ROOM NUMBER
    // ======================================================

    const roomNumber =

        agroStore.roomNumber !== null &&
        agroStore.roomNumber !== undefined

            ? Number(
                agroStore.roomNumber
            )

            : null;


    // ======================================================
    // STORAGE UPDATE HISTORY
    // ======================================================
    //
    // IMPORTANT:
    //
    // This service expects stockItem.stockUpdates[] to exist
    // in the Dairy model.
    //
    // The history record stores the NEW quantity.
    //
    // ======================================================

    if (
        !Array.isArray(
            stockItem.stockUpdates
        )
    ) {

        stockItem.stockUpdates =
            [];

    }


    stockItem.stockUpdates.push({

        quantity:
            newQuantity,

        stockUpdateNote:
            safeNote,

        images:
            limitedImages,

        recordedBy:
            user._id ||
            user.id ||
            null,

        recordedAt:
            new Date()

    });


    // ======================================================
    // UPDATE CURRENT STOCK
    // ======================================================

    stockItem.quantity =
        newQuantity;


    // ======================================================
    // UPDATE UNIT
    // ======================================================

    if (
        safeUnit
    ) {

        stockItem.unit =
            safeUnit;

    }


    // ======================================================
    // SAVE STOCK
    // ======================================================

    await stockItem.save();


    // ======================================================
    // CREATE FEED UPDATE
    // ======================================================
    //
    // Update.dairy MUST point to the stock Dairy.
    //
    // ======================================================

    const stockUpdate =
        new Update({

            dairy:
                stockItem._id,

            user:
                user._id ||
                user.id ||
                null,

            userName:
                userName,

            userImage:
                userImage,

            authorRole:
                authorRole,

            type:
                "animalFeed",

            title:
                "Stock Updated",

            text:
                safeNote,

            images:
                limitedImages,

            animalFeed: {

                feedId:
                    stockItem._id,

                storageId:
                    agroStore._id,

                feedName:
                    feedName,

                feedType:
                    feedType,

                roomNumber:
                    roomNumber,

                quantity:
                    newQuantity,

                unit:
                    safeUnit ||
                    stockItem.unit ||
                    "",

                stockUpdateNote:
                    safeNote

            }

        });


    // ======================================================
    // SAVE FEED UPDATE
    // ======================================================

    await stockUpdate.save();


    // ======================================================
    // RESULT
    // ======================================================

    return {

        success:
            true,

        message:
            "Stock updated successfully.",

        update:
            stockUpdate,

        stock:
            stockItem,

        previousQuantity:
            safePreviousQuantity,

        quantity:
            newQuantity,

        quantityDifference:
            quantityDifference

    };

};