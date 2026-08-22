// ==========================================================
// services/update/storage/animalFeedsService.js
// =========================================================
//
// AGROSTORE ANIMAL FEED / STOCK SERVICE
//
// Responsibilities:
//
//     • Locate AgroStore by MongoDB _id
//     • Determine its roomNumber
//     • Find its contents using dwellNumber
//     • Return current contents
//     • Validate stock updates
//     • Update quantity
//     • Update additional stock information
//
// IMPORTANT STORAGE RELATIONSHIP:
//
//     AgroStore._id
//         = storageId
//
//     AgroStore.roomNumber
//         = negative AgroStore number
//
//     Content.dwellNumber
//         = same negative number
//
// Therefore:
//
//     content.dwellNumber === agroStore.roomNumber
//
// ==========================================================


const mongoose =
    require("mongoose");

const Dairy =
    require("../../../models/dairy");


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
// GET AGROSTORE CONTENTS
// ==========================================================
//
// This is the core relationship.
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
//     Contents:
//
//         dwellNumber:
//             -2
//
// All such contents belong to that AgroStore.
//
// ==========================================================

async function getAnimalFeeds(
    storageId
) {

    const agroStore =
        await getAgroStore(
            storageId
        );


    // ======================================================
    // FIND CONTENTS
    // ======================================================

    const feeds =
        await Dairy.find({

            // ----------------------------------------------
            // Same farm
            // ----------------------------------------------

            assetCode:
                agroStore.assetCode,


            // ----------------------------------------------
            // Contents are structures
            // ----------------------------------------------

            recordType:
                "structure",


            // ----------------------------------------------
            // The content belongs to this AgroStore
            // ----------------------------------------------

            dwellNumber:
                agroStore.roomNumber,


            // ----------------------------------------------
            // Only active contents
            // ----------------------------------------------

            status:
                "active"

        })
        .sort({

            updatedAt:
                -1,

            createdAt:
                -1

        });


    return {

        agroStore,

        feeds

    };

}


// ==========================================================
// GET ONE AGROSTORE CONTENT
// ==========================================================
//
// Verifies BOTH:
//
//     feedId
//
// AND:
//
//     feed belongs to the specified AgroStore
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

            assetCode:
                agroStore.assetCode,

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
    // SAVE THROUGH MONGOOSE
    // ======================================================
    //
    // This is important.
    //
    // We use .save() rather than blindly using updateOne()
    // so the Dairy model's validation/pre-save logic remains
    // active.
    //
    // ======================================================

    await feed.save();


    // ======================================================
    // FETCH FRESH DOCUMENT
    // ======================================================

    const updatedFeed =
        await Dairy.findById(
            feed._id
        );


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
