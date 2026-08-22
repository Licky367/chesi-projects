// ==========================================================
// services/update/storage/animalFeedsService.js
// ==========================================================
//
// AGROSTORE ANIMAL FEED / STOCK SERVICE
//
// Responsibilities:
//
//     • Locate AgroStore by MongoDB _id
//     • Determine its roomNumber
//     • Find Dairy records whose dwellingNumber matches
//       the AgroStore roomNumber
//     • Load updates belonging to those Dairy records
//     • Return those updates for feed cards
//     • Validate stock updates
//     • Update quantity
//     • Update additional stock information
//
// IMPORTANT:
//
//     The AgroStore itself is ONLY the context.
//
//     It is NOT a feed card.
//
// RELATIONSHIP:
//
//     /dairy/:agroStoreId
//              │
//              ▼
//     AgroStore._id
//              │
//              ▼
//     AgroStore.roomNumber
//              │
//              ▼
//     Dairy.dwellingNumber
//              │
//              ▼
//     Matching Dairy records
//              │
//              ▼
//     Update.dairy
//              │
//              ▼
//     Feed cards
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
// GET AGROSTORE BY ID
// ==========================================================
//
// storageId is ALWAYS:
//
//     AgroStore._id
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
    // FIND AGROSTORE
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
    // NOT FOUND
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
// GET AGROSTORE FEED UPDATES
// ==========================================================
//
// IMPORTANT:
//
// This function does NOT return the AgroStore's stock
// contents.
//
// It returns UPDATE records belonging to Dairy records
// located in the AgroStore's room.
//
// Example:
//
//     AgroStore:
//
//         _id:
//             ABC123
//
//         roomNumber:
//             -2
//
//     Dairy records:
//
//         dwellingNumber:
//             -2
//
//     Updates:
//
//         Update.dairy === matching Dairy._id
//
// Those Update records become the feed cards.
//
// ==========================================================

async function getAnimalFeeds(
    storageId
) {

    // ======================================================
    // GET THE CURRENT AGROSTORE
    // ======================================================

    const agroStore =
        await getAgroStore(
            storageId
        );


    // ======================================================
    // AGROSTORE ROOM NUMBER
    // ======================================================

    const roomNumber =
        Number(
            agroStore.roomNumber
        );


    // ======================================================
    // VALIDATE ROOM NUMBER
    // ======================================================

    if (
        !Number.isFinite(
            roomNumber
        )
    ) {

        return {

            agroStore,

            feeds: []

        };

    }


    // ======================================================
    // FIND DAIRY RECORDS IN THIS AGROSTORE ROOM
    // ======================================================
    //
    // THIS IS THE IMPORTANT RELATIONSHIP.
    //
    // We deliberately DO NOT use:
    //
    //     assetCode
    //
    // because the feed is determined by:
    //
    //     dwellingNumber === AgroStore.roomNumber
    //
    // ======================================================

    const roomDairies =
        await Dairy.find({

            dwellingNumber:
                roomNumber,

            status:
                "active"

        })
        .select(
            "_id name code type recordType assetCode dwellingNumber profileImage"
        );


    // ======================================================
    // NO DAIRIES IN THIS ROOM
    // ======================================================

    if (
        roomDairies.length === 0
    ) {

        return {

            agroStore,

            feeds: []

        };

    }


    // ======================================================
    // COLLECT DAIRY IDS
    // ======================================================

    const dairyIds =
        roomDairies.map(
            dairy => dairy._id
        );


    // ======================================================
    // FIND UPDATES BELONGING TO THOSE DAIRIES
    // ======================================================
    //
    // The AgroStore is NOT queried here.
    //
    // Only the matching Dairy records can supply feed
    // cards.
    //
    // ======================================================

    const updates =
        await Update.find({

            dairy: {

                $in:
                    dairyIds

            }

        })
        .populate({

            path:
                "dairy",

            select:
                "_id name code type recordType assetCode dwellingNumber profileImage"

        })
        .sort({

            createdAt:
                -1

        });


    // ======================================================
    // RETURN
    // ======================================================

    return {

        agroStore,

        feeds:
            updates

    };

}


// ==========================================================
// GET ONE AGROSTORE CONTENT
// ==========================================================
//
// This function is for the actual stock-management side.
//
// It verifies:
//
//     feedId
//
// AND:
//
//     feed belongs to the specified AgroStore.
//
// ==========================================================

async function getAnimalFeed(
    storageId,
    feedId
) {

    // ======================================================
    // GET STORAGE
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

    const feed =
        await Dairy.findOne({

            _id:
                feedId,

            recordType:
                "structure",

            dwellNumber:
                agroStore.roomNumber,

            status:
                "active"

        });


    // ======================================================
    // NOT FOUND
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
// UPDATE ANIMAL FEED
// ==========================================================
//
// Updates:
//
//     quantity
//
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
    // GET AND VERIFY CONTENT
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
        Number(quantity);


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
    // NO NEGATIVE QUANTITY
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
    // NORMALIZE ADDITIONAL INFORMATION
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
    // RETURN
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