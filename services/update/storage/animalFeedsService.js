// ==========================================================
// services/update/storage/animalFeedsService.js
// ==========================================================
//
// AGROSTORE ANIMAL FEED / STOCK SERVICE
//
// RESPONSIBILITIES:
//
//     • Locate AgroStore by its own MongoDB _id
//     • Read the AgroStore roomNumber
//     • Find stock/content records using dwellNumber
//     • Find updates belonging to those CONTENT records
//     • Never treat the AgroStore itself as a feed/update record
//     • Validate stock updates
//     • Update stock quantity
//     • Update stock information
//
// IMPORTANT RELATIONSHIP:
//
//     /dairy/:id
//          |
//          | id = AgroStore._id
//          v
//     AgroStore
//          |
//          | roomNumber
//          v
//     Dairy contents
//          |
//          | dwellNumber === AgroStore.roomNumber
//          v
//     Content Dairy._id
//          |
//          | Update.dairy === Content Dairy._id
//          v
//     Feed / stock updates
//
// NEVER:
//
//     Update.dairy === AgroStore._id
//
// unless the AgroStore itself actually owns that update.
// For the animal-feed page, we specifically want updates
// belonging to the AgroStore's CONTENTS.
//
// ==========================================================


const mongoose =
    require("mongoose");

const Dairy =
    require("../../../models/dairy");

const Update =
    require("../../../models/Update");


// ==========================================================
// VALIDATE MONGODB OBJECT ID
// ==========================================================

function isValidObjectId(id) {

    return mongoose.Types.ObjectId.isValid(
        id
    );

}


// ==========================================================
// GET AGROSTORE BY ITS OWN ID
// ==========================================================
//
// IMPORTANT:
//
// storageId is:
//
//     AgroStore._id
//
// It is NOT:
//
//     parentDairyId
//
// It is NOT:
//
//     assetCode
//
// It is NOT:
//
//     roomNumber
//
// ==========================================================

async function getAgroStore(
    storageId
) {

    // ======================================================
    // VALIDATE ID
    // ======================================================

    if (
        !isValidObjectId(
            storageId
        )
    ) {

        const error =
            new Error(
                "Invalid AgroStore ID."
            );

        error.status = 400;

        throw error;

    }


    // ======================================================
    // FIND THE AGROSTORE
    // ======================================================

    const agroStore =
        await Dairy.findOne({

            _id:
                storageId,

            recordType:
                "structure",

            type:
                "agroStore",

            status:
                "active",

            roomNumber: {
                $lt: 0
            }

        });


    // ======================================================
    // AGROSTORE NOT FOUND
    // ======================================================

    if (!agroStore) {

        const error =
            new Error(
                "AgroStore not found."
            );

        error.status = 404;

        throw error;

    }


    return agroStore;

}


// ==========================================================
// GET AGROSTORE CONTENTS
// ==========================================================
//
// CORE RELATIONSHIP:
//
//     AgroStore.roomNumber
//
//             ===
//
//     Content.dwellNumber
//
// The AgroStore itself is NOT returned as a feed.
//
// ==========================================================

async function getAnimalFeeds(
    storageId
) {

    // ======================================================
    // GET THE ACTUAL AGROSTORE
    // ======================================================

    const agroStore =
        await getAgroStore(
            storageId
        );


    // ======================================================
    // FIND CONTENTS
    // ======================================================
    //
    // We intentionally use dwellNumber as the relationship.
    //
    // We do NOT use:
    //
    //     assetCode
    //
    // as the storage-content relationship.
    //
    // ======================================================

    const feeds =
        await Dairy.find({

            dwellNumber:
                agroStore.roomNumber,

            recordType:
                "structure",

            status:
                "active"

        })
        .sort({

            updatedAt:
                -1,

            createdAt:
                -1

        });


    // ======================================================
    // GET CONTENT IDs
    // ======================================================
    //
    // These IDs are what Update.dairy must point to.
    //
    // ======================================================

    const feedIds =
        feeds.map(
            feed =>
                feed._id
        );


    // ======================================================
    // GET UPDATES BELONGING TO CONTENTS
    // ======================================================
    //
    // IMPORTANT:
    //
    // We query:
    //
    //     Update.dairy
    //
    // using:
    //
    //     content._id
    //
    // NOT:
    //
    //     AgroStore._id
    //
    // This prevents AgroStore updates from appearing as
    // animal-feed updates.
    //
    // ======================================================

    let feedUpdates = [];


    if (
        feedIds.length > 0
    ) {

        feedUpdates =
            await Update.find({

                dairy: {
                    $in:
                        feedIds
                }

            })
            .populate({

                path:
                    "dairy",

                select:
                    [
                        "name",
                        "type",
                        "code",
                        "roomNumber",
                        "dwellNumber",
                        "assetCode",
                        "profileImage",
                        "quantity",
                        "unit",
                        "stockUpdateNote"
                    ].join(" ")

            })
            .sort({

                createdAt:
                    -1

            });

    }


    // ======================================================
    // RETURN COMPLETE AGROSTORE DATA
    // ======================================================

    return {

        agroStore,

        feeds,

        feedUpdates

    };

}


// ==========================================================
// GET ONE AGROSTORE CONTENT
// ==========================================================
//
// Verifies that:
//
//     feedId
//
// is actually a content item belonging to:
//
//     storageId
//
// through:
//
//     feed.dwellNumber
//         ===
//     agroStore.roomNumber
//
// ==========================================================

async function getAnimalFeed(
    storageId,
    feedId
) {

    // ======================================================
    // GET AGROSTORE
    // ======================================================

    const agroStore =
        await getAgroStore(
            storageId
        );


    // ======================================================
    // VALIDATE CONTENT ID
    // ======================================================

    if (
        !isValidObjectId(
            feedId
        )
    ) {

        const error =
            new Error(
                "Invalid stock item ID."
            );

        error.status = 400;

        throw error;

    }


    // ======================================================
    // FIND CONTENT
    // ======================================================
    //
    // Again:
    //
    //     dwellNumber === agroStore.roomNumber
    //
    // is the ownership relationship.
    //
    // ======================================================

    const feed =
        await Dairy.findOne({

            _id:
                feedId,

            dwellNumber:
                agroStore.roomNumber,

            recordType:
                "structure",

            status:
                "active"

        });


    // ======================================================
    // CONTENT NOT FOUND
    // ======================================================

    if (!feed) {

        const error =
            new Error(

                "The selected stock item does not belong " +
                "to this AgroStore."

            );

        error.status = 404;

        throw error;

    }


    return {

        agroStore,

        feed

    };

}


// ==========================================================
// UPDATE ONE ANIMAL FEED / STOCK ITEM
// ==========================================================
//
// Updates:
//
//     quantity
//     stockUpdateNote
//
// ==========================================================

async function updateAnimalFeed(

    storageId,

    feedId,

    quantity,

    stockUpdateNote

) {

    // ======================================================
    // VERIFY THAT THE CONTENT BELONGS TO THE AGROSTORE
    // ======================================================

    const result =
        await getAnimalFeed(

            storageId,

            feedId

        );


    const feed =
        result.feed;


    // ======================================================
    // QUANTITY REQUIRED
    // ======================================================

    if (
        quantity === undefined ||
        quantity === null ||
        quantity === ""
    ) {

        const error =
            new Error(
                "Quantity is required."
            );

        error.status = 400;

        throw error;

    }


    // ======================================================
    // CONVERT QUANTITY TO NUMBER
    // ======================================================

    const numericQuantity =
        Number(
            quantity
        );


    // ======================================================
    // VALIDATE NUMBER
    // ======================================================

    if (
        !Number.isFinite(
            numericQuantity
        )
    ) {

        const error =
            new Error(
                "Quantity must be a valid number."
            );

        error.status = 400;

        throw error;

    }


    // ======================================================
    // PREVENT NEGATIVE QUANTITY
    // ======================================================

    if (
        numericQuantity < 0
    ) {

        const error =
            new Error(
                "Quantity cannot be negative."
            );

        error.status = 400;

        throw error;

    }


    // ======================================================
    // NORMALIZE STOCK UPDATE NOTE
    // ======================================================

    const note =
        String(
            stockUpdateNote || ""
        ).trim();


    // ======================================================
    // UPDATE QUANTITY
    // ======================================================

    feed.quantity =
        numericQuantity;


    // ======================================================
    // UPDATE ADDITIONAL INFORMATION
    // ======================================================

    feed.stockUpdateNote =
        note;


    // ======================================================
    // SAVE
    // ======================================================

    await feed.save();


    // ======================================================
    // FETCH FRESH DOCUMENT
    // ======================================================

    const updatedFeed =
        await Dairy.findById(
            feed._id
        );


    // ======================================================
    // RETURN UPDATED DATA
    // ======================================================

    return {

        agroStore:
            result.agroStore,

        feed:
            updatedFeed

    };

}


// ==========================================================
// EXPORT
// ==========================================================

module.exports = {

    getAgroStore,

    getAnimalFeeds,

    getAnimalFeed,

    updateAnimalFeed

};