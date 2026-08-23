// ==========================================================
// services/update/stockUpdateService.js
// ==========================================================
//
// STOCK UPDATE SERVICE
//
// PURPOSE:
// ----------------------------------------------------------
// Handles stock updates for animal-feed / agro-store stock.
//
// ONE STOCK EVENT → THREE FEED VISIBILITIES
// ----------------------------------------------------------
//
// Every successful stock update creates:
//
//     1. STOCK ITEM UPDATE
//        Update.dairy = stockItem._id
//
//     2. AGROSTORE UPDATE
//        Update.dairy = agroStore._id
//
//     3. PARENT FARM UPDATE
//        Update.dairy = parentFarm._id
//
// All three Update documents contain the SAME historical
// animalFeed snapshot and the SAME recordedAt timestamp.
//
// Therefore the same stock event can appear on:
//
//     • AgroStore page
//     • Stock/item page
//     • Parent farm page
//
// IMPORTANT:
//
// The actual stock quantity is changed ONLY ONCE.
//
// The three Update records are feed/history representations
// of that same stock event.
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

const MAX_STOCK_UPDATE_IMAGES =

    Number.isFinite(
        Number(
            Update.MAX_STOCK_UPDATE_IMAGES
        )
    )

        ? Number(
            Update.MAX_STOCK_UPDATE_IMAGES
        )

        : 10;


// ==========================================================
// HELPERS
// ==========================================================


/* ==========================================================
   OBJECT ID
========================================================== */

function isValidObjectId(value) {

    return mongoose.Types.ObjectId.isValid(
        value
    );

}


/* ==========================================================
   SAFE STRING
========================================================== */

function safeString(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }

    return String(
        value
    ).trim();

}


/* ==========================================================
   SAFE NUMBER
========================================================== */

function toFiniteNumber(
    value,
    fallback = 0
) {

    const number =
        Number(
            value
        );


    return Number.isFinite(
        number
    )

        ? number

        : fallback;

}


/* ==========================================================
   USER ID
========================================================== */

function getUserId(user) {

    if (
        !user
    ) {

        return null;

    }


    if (
        user._id &&
        isValidObjectId(
            user._id
        )
    ) {

        return user._id;

    }


    if (
        user.id &&
        isValidObjectId(
            user.id
        )
    ) {

        return user.id;

    }


    return null;

}


/* ==========================================================
   USER NAME
========================================================== */

function getUserName(user) {

    if (
        !user
    ) {

        return "";

    }


    const name =
        safeString(
            user.name
        );


    if (
        name
    ) {

        return name;

    }


    return safeString(
        user.email
    );

}


/* ==========================================================
   USER IMAGE
========================================================== */

function getUserImage(user) {

    if (
        !user
    ) {

        return "";

    }


    return safeString(
        user.profileImage
    );

}


/* ==========================================================
   USER ROLE
========================================================== */

function getAuthorRole(user) {

    if (
        !user
    ) {

        return "";

    }


    const role =
        safeString(
            user.role
        );


    if (
        role === "admin" ||
        role === "dairyWorker" ||
        role === "system"
    ) {

        return role;

    }


    return "";

}


/* ==========================================================
   NORMALIZE IMAGES
========================================================== */

function normalizeImages(images) {

    if (
        !Array.isArray(
            images
        )
    ) {

        return [];

    }


    const result = [];


    for (
        const image of images
    ) {

        if (
            !image
        ) {

            continue;

        }


        let value =
            "";


        // --------------------------------------------------
        // Plain string
        // --------------------------------------------------

        if (
            typeof image === "string"
        ) {

            value =
                image;

        }


        // --------------------------------------------------
        // Upload object
        // --------------------------------------------------

        else if (
            typeof image === "object"
        ) {

            if (
                image.url
            ) {

                value =
                    image.url;

            }

            else if (
                image.path
            ) {

                value =
                    image.path;

            }

            else if (
                image.location
            ) {

                value =
                    image.location;

            }

            else if (
                image.secure_url
            ) {

                value =
                    image.secure_url;

            }

        }


        value =
            safeString(
                value
            );


        if (
            value
        ) {

            result.push(
                value
            );

        }


        if (
            result.length >=
            MAX_STOCK_UPDATE_IMAGES
        ) {

            break;

        }

    }


    return result;

}


/* ==========================================================
   EFFECTIVE UNIT
========================================================== */

function getEffectiveUnit(
    requestedUnit,
    currentUnit
) {

    const newUnit =
        safeString(
            requestedUnit
        );


    if (
        newUnit
    ) {

        return newUnit;

    }


    return safeString(
        currentUnit
    );

}


/* ==========================================================
   FIND PARENT FARM ID
==========================================================
//
// Priority:
//
//     1. Explicit dairyId supplied by controller
//     2. stockItem.parentDairyId
//     3. stockItem.parentFarmId
//     4. stockItem.parentDairy
//     5. stockItem.farmId
//
// ========================================================== */

function getParentFarmId(
    dairyId,
    stockItem
) {

    const candidates = [

        dairyId,

        stockItem &&
        stockItem.parentDairyId,

        stockItem &&
        stockItem.parentFarmId,

        stockItem &&
        stockItem.parentDairy,

        stockItem &&
        stockItem.farmId

    ];


    for (
        const candidate of
        candidates
    ) {

        if (
            candidate &&
            isValidObjectId(
                candidate
            )
        ) {

            return candidate;

        }

    }


    return null;

}


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
    // VALIDATE USER
    // ======================================================

    if (
        !user
    ) {

        throw new Error(
            "You must be logged in to update stock."
        );

    }


    const userId =
        getUserId(
            user
        );


    if (
        !userId
    ) {

        throw new Error(
            "Invalid user."
        );

    }


    // ======================================================
    // VALIDATE STOCK ITEM
    // ======================================================

    if (
        !isValidObjectId(
            itemId
        )
    ) {

        throw new Error(
            "Invalid stock item."
        );

    }


    // ======================================================
    // VALIDATE STORAGE
    // ======================================================

    if (
        !isValidObjectId(
            storageId
        )
    ) {

        throw new Error(
            "Invalid storage."
        );

    }


    // ======================================================
    // VALIDATE QUANTITY
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

    const requestedUnit =
        safeString(
            unit
        );


    if (
        requestedUnit.length > 50
    ) {

        throw new Error(
            "Stock unit cannot exceed 50 characters."
        );

    }


    // ======================================================
    // NOTE
    // ======================================================

    const safeNote =
        safeString(
            stockUpdateNote
        );


    if (
        safeNote.length > 5000
    ) {

        throw new Error(
            "Stock update note is too long."
        );

    }


    // ======================================================
    // IMAGES
    // ======================================================

    const limitedImages =
        normalizeImages(
            images
        );


    // ======================================================
    // USER SNAPSHOT
    // ======================================================

    const userName =
        getUserName(
            user
        );


    const userImage =
        getUserImage(
            user
        );


    const authorRole =
        getAuthorRole(
            user
        );


    // ======================================================
    // START MONGODB TRANSACTION
    // ======================================================

    const session =
        await mongoose.startSession();


    let result;


    try {

        await session.withTransaction(

            async function() {


                // ==========================================
                // FIND STOCK
                // ==========================================

                const stockItem =
                    await Dairy.findById(
                        itemId
                    )
                    .session(
                        session
                    );


                if (
                    !stockItem
                ) {

                    throw new Error(
                        "Stock item was not found."
                    );

                }


                // ==========================================
                // FIND AGROSTORE
                // ==========================================

                const agroStore =
                    await Dairy.findById(
                        storageId
                    )
                    .session(
                        session
                    );


                if (
                    !agroStore
                ) {

                    throw new Error(
                        "AgroStore was not found."
                    );

                }


                // ==========================================
                // VERIFY AGROSTORE
                // ==========================================

                const storageType =
                    safeString(
                        agroStore.type
                    );


                if (
                    storageType !==
                    "agroStore"
                ) {

                    throw new Error(
                        "The selected storage is not an AgroStore."
                    );

                }


                // ==========================================
                // VERIFY STOCK / STORAGE RELATIONSHIP
                // ==========================================

                const stockDwellNumber =
                    Number(
                        stockItem.dwellNumber
                    );


                const storageRoomNumber =
                    Number(
                        agroStore.roomNumber
                    );


                if (
                    !Number.isFinite(
                        stockDwellNumber
                    )
                ) {

                    throw new Error(
                        "The stock item does not have a valid dwell number."
                    );

                }


                if (
                    !Number.isFinite(
                        storageRoomNumber
                    )
                ) {

                    throw new Error(
                        "The AgroStore does not have a valid room number."
                    );

                }


                if (
                    stockDwellNumber !==
                    storageRoomNumber
                ) {

                    throw new Error(
                        "This stock item does not belong to the selected AgroStore."
                    );

                }


                // ==========================================
                // FIND PARENT FARM
                // ==========================================

                const parentFarmId =
                    getParentFarmId(
                        dairyId,
                        stockItem
                    );


                if (
                    !parentFarmId
                ) {

                    throw new Error(
                        "The parent farm for this stock item could not be determined."
                    );

                }


                // ==========================================
                // FIND PARENT FARM
                // ==========================================

                const parentFarm =
                    await Dairy.findById(
                        parentFarmId
                    )
                    .session(
                        session
                    );


                if (
                    !parentFarm
                ) {

                    throw new Error(
                        "The parent farm was not found."
                    );

                }


                // ==========================================
                // VALIDATE PARENT FARM
                // ==========================================
                //
                // A farm is represented by a negative/positive
                // code depending on the project's existing
                // Dairy identity rules.
                //
                // We do not enforce code sign here because
                // the existing application may use additional
                // farm classification rules.
                //
                // ==========================================


                // ==========================================
                // PREVIOUS QUANTITY
                // ==========================================

                const previousQuantity =
                    toFiniteNumber(
                        stockItem.quantity,
                        0
                    );


                if (
                    previousQuantity < 0
                ) {

                    throw new Error(
                        "The current stock quantity is invalid."
                    );

                }


                // ==========================================
                // QUANTITY CHANGE
                // ==========================================

                const quantityChange =
                    newQuantity -
                    previousQuantity;


                // ==========================================
                // EFFECTIVE UNIT
                // ==========================================

                const effectiveUnit =
                    getEffectiveUnit(
                        requestedUnit,
                        stockItem.unit
                    );


                // ==========================================
                // STORAGE NAME
                // ==========================================

                const storageName =

                    safeString(
                        agroStore.name
                    ) ||

                    safeString(
                        agroStore.title
                    ) ||

                    "AgroStore";


                // ==========================================
                // STOCK NAME
                // ==========================================

                const feedName =

                    safeString(
                        stockItem.name
                    ) ||

                    "Unnamed Stock";


                // ==========================================
                // STOCK TYPE
                // ==========================================

                const feedType =
                    safeString(
                        stockItem.type
                    );


                // ==========================================
                // PARENT FARM NAME
                // ==========================================

                const parentFarmName =

                    safeString(
                        parentFarm.name
                    ) ||

                    safeString(
                        parentFarm.title
                    ) ||

                    "Parent Farm";


                // ==========================================
                // SINGLE EVENT TIMESTAMP
                // ==========================================

                const recordedAt =
                    new Date();


                // ==========================================
                // ENSURE STOCK HISTORY ARRAY
                // ==========================================

                if (
                    !Array.isArray(
                        stockItem.stockUpdates
                    )
                ) {

                    stockItem.stockUpdates =
                        [];

                }


                // ==========================================
                // STOCK HISTORY
                // ==========================================
                //
                // Only ONE stock history record is created.
                //
                // ==========================================

                stockItem.stockUpdates.push({

                    previousQuantity:
                        previousQuantity,

                    quantity:
                        newQuantity,

                    quantityChange:
                        quantityChange,

                    unit:
                        effectiveUnit,

                    stockUpdateNote:
                        safeNote,

                    images:
                        limitedImages,

                    recordedBy:
                        userId,

                    recordedByName:
                        userName,

                    recordedByImage:
                        userImage,

                    recordedAt:
                        recordedAt

                });


                // ==========================================
                // UPDATE CURRENT STOCK
                // ==========================================

                stockItem.quantity =
                    newQuantity;


                // ==========================================
                // UPDATE UNIT
                // ==========================================

                if (
                    effectiveUnit
                ) {

                    stockItem.unit =
                        effectiveUnit;

                }


                // ==========================================
                // SAVE STOCK
                // ==========================================

                await stockItem.save({
                    session
                });


                // ==========================================
                // COMMON FEED SNAPSHOT
                // ==========================================
                //
                // All three Update documents receive the
                // EXACT SAME snapshot.
                //
                // ==========================================

                const animalFeedSnapshot = {

                    feedId:
                        stockItem._id,

                    storageId:
                        agroStore._id,

                    storageName:
                        storageName,

                    feedName:
                        feedName,

                    feedType:
                        feedType,

                    roomNumber:
                        storageRoomNumber,

                    previousQuantity:
                        previousQuantity,

                    quantity:
                        newQuantity,

                    quantityChange:
                        quantityChange,

                    unit:
                        effectiveUnit,

                    stockUpdateNote:
                        safeNote,

                    images:
                        limitedImages,

                    recordedBy:
                        userId,

                    recordedByName:
                        userName,

                    recordedByImage:
                        userImage,

                    recordedAt:
                        recordedAt

                };


                // ==========================================
                // CREATE THREE FEED UPDATES
                // ==========================================
                //
                // 1. STOCK ITEM
                // 2. AGROSTORE
                // 3. PARENT FARM
                //
                // ==========================================

                const updateDocuments = [

                    // ======================================
                    // STOCK ITEM FEED
                    // ======================================

                    {

                        dairy:
                            stockItem._id,

                        user:
                            userId,

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

                        animalFeed:
                            animalFeedSnapshot

                    },


                    // ======================================
                    // AGROSTORE FEED
                    // ======================================

                    {

                        dairy:
                            agroStore._id,

                        user:
                            userId,

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

                        animalFeed:
                            animalFeedSnapshot

                    },


                    // ======================================
                    // PARENT FARM FEED
                    // ======================================

                    {

                        dairy:
                            parentFarm._id,

                        user:
                            userId,

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

                        animalFeed:
                            animalFeedSnapshot

                    }

                ];


                // ==========================================
                // INSERT ALL FEED RECORDS
                // ==========================================
                //
                // insertMany makes the three feed records part
                // of the same transaction.
                //
                // ==========================================

                const createdUpdates =
                    await Update.insertMany(
                        updateDocuments,
                        {
                            session
                        }
                    );


                // ==========================================
                // SAFETY CHECK
                // ==========================================

                if (
                    !createdUpdates ||
                    createdUpdates.length !== 3
                ) {

                    throw new Error(
                        "The stock was updated, but the complete feed history could not be created."
                    );

                }


                // ==========================================
                // RESULT
                // ==========================================

                result = {

                    success:
                        true,

                    message:
                        "Stock updated successfully.",

                    stock:
                        stockItem,

                    update:
                        createdUpdates[0],

                    updates:
                        createdUpdates,

                    stockUpdate:
                        createdUpdates[0],

                    stockFeedUpdate:
                        createdUpdates[0],

                    agroStoreFeedUpdate:
                        createdUpdates[1],

                    parentFarmFeedUpdate:
                        createdUpdates[2],

                    stockItemId:
                        stockItem._id,

                    storageId:
                        agroStore._id,

                    parentFarmId:
                        parentFarm._id,

                    parentFarmName:
                        parentFarmName,

                    previousQuantity:
                        previousQuantity,

                    quantity:
                        newQuantity,

                    quantityChange:
                        quantityChange,

                    quantityDifference:
                        quantityChange,

                    unit:
                        effectiveUnit,

                    recordedAt:
                        recordedAt

                };

            }

        );


        // ==================================================
        // RETURN
        // ==================================================

        return result;


    }

    finally {

        // ==================================================
        // END SESSION
        // ==================================================

        await session.endSession();

    }

};