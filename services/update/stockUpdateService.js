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
// RESPONSIBILITIES:
//
//     • Locate the stock Dairy record
//     • Locate the AgroStore
//     • Validate the stock/storage relationship
//     • Read the previous stock quantity
//     • Calculate the quantity change
//     • Update the current stock quantity
//     • Update the stock unit
//     • Store stock-update history
//     • Create an Update feed item
//     • Store complete historical snapshots
//     • Store stock-update images
//     • Keep stock + feed history atomic using a transaction
//
// IMPORTANT RELATIONSHIP:
//
//     AgroStore._id
//         = animalFeed.storageId
//
//     AgroStore.roomNumber
//         = Stock.dwellNumber
//
// Therefore:
//
//     stockItem.dwellNumber
//         ===
//     agroStore.roomNumber
//
// IMPORTANT:
//
//     Update.dairy
//         = stockItem._id
//
// NOT:
//
//     Update.dairy
//         = agroStore._id
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
//
// Update.js is the source of truth.
//
// Fallback to 10 in case the static property is unavailable.
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
   OBJECT ID VALIDATION
========================================================== */

function isValidObjectId(value) {

    return mongoose.Types.ObjectId.isValid(
        value
    );

}


/* ==========================================================
   SAFE STRING
========================================================== */

function safeString(
    value
) {

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

function getUserId(
    user
) {

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

function getUserName(
    user
) {

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

function getUserImage(
    user
) {

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

function getAuthorRole(
    user
) {

    if (
        !user
    ) {

        return "";

    }


    const role =
        safeString(
            user.role
        );


    // ------------------------------------------------------
    // Update.js only permits:
    //
    // admin
    // dairyWorker
    // system
    // ""
    // ------------------------------------------------------

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

function normalizeImages(
    images
) {

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
   GET EFFECTIVE UNIT
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


// ==========================================================
// CREATE STOCK UPDATE
// ==========================================================

exports.createStockUpdate =

async function({

    // ------------------------------------------------------
    // dairyId
    // ------------------------------------------------------
    //
    // Kept in the function signature for compatibility with
    // existing controllers.
    //
    // The actual stock record is identified by itemId.
    //
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
    // VALIDATE STOCK ITEM ID
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
    // VALIDATE STORAGE ID
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
    // START TRANSACTION
    // ======================================================

    const session =
        await mongoose.startSession();


    try {

        await session.withTransaction(
            async function() {

                // ==========================================
                // FIND STOCK ITEM
                // ==========================================

                const stockItem =
                    await Dairy.findById(
                        itemId
                    ).session(
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
                    ).session(
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
                // VERIFY STOCK LOCATION
                // ==========================================
                //
                // Both values must exist.
                //
                // The relationship is mandatory:
                //
                // stock.dwellNumber
                //        ===
                // agroStore.roomNumber
                //
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
                // STORAGE NAME SNAPSHOT
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
                // STOCK NAME SNAPSHOT
                // ==========================================

                const feedName =

                    safeString(
                        stockItem.name
                    ) ||

                    "Unnamed Stock";


                // ==========================================
                // STOCK TYPE SNAPSHOT
                // ==========================================

                const feedType =
                    safeString(
                        stockItem.type
                    );


                // ==========================================
                // ROOM NUMBER SNAPSHOT
                // ==========================================

                const roomNumber =
                    storageRoomNumber;


                // ==========================================
                // SINGLE OPERATION TIMESTAMP
                // ==========================================
                //
                // The exact same timestamp is used for:
                //
                //     stock history
                //     feed history
                //
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
                // CREATE STOCK HISTORY RECORD
                // ==========================================
                //
                // IMPORTANT:
                //
                // This history represents exactly what happened
                // to the actual stock record.
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
                // UPDATE CURRENT STOCK QUANTITY
                // ==========================================

                stockItem.quantity =
                    newQuantity;


                // ==========================================
                // UPDATE CURRENT STOCK UNIT
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
                // CREATE UPDATE FEED RECORD
                // ==========================================
                //
                // IMPORTANT:
                //
                // Update.dairy = STOCK DAIRY
                //
                // NOT AgroStore.
                //
                // ==========================================

                const stockUpdate =
                    new Update({

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

                        animalFeed: {

                            // ----------------------------------
                            // STOCK
                            // ----------------------------------

                            feedId:
                                stockItem._id,

                            // ----------------------------------
                            // STORAGE
                            // ----------------------------------

                            storageId:
                                agroStore._id,

                            storageName:
                                storageName,

                            // ----------------------------------
                            // STOCK SNAPSHOT
                            // ----------------------------------

                            feedName:
                                feedName,

                            feedType:
                                feedType,

                            roomNumber:
                                roomNumber,

                            // ----------------------------------
                            // QUANTITY SNAPSHOT
                            // ----------------------------------

                            previousQuantity:
                                previousQuantity,

                            quantity:
                                newQuantity,

                            quantityChange:
                                quantityChange,

                            unit:
                                effectiveUnit,

                            // ----------------------------------
                            // NOTE
                            // ----------------------------------

                            stockUpdateNote:
                                safeNote,

                            // ----------------------------------
                            // IMAGES
                            // ----------------------------------

                            images:
                                limitedImages,

                            // ----------------------------------
                            // USER SNAPSHOT
                            // ----------------------------------

                            recordedBy:
                                userId,

                            recordedByName:
                                userName,

                            recordedByImage:
                                userImage,

                            recordedAt:
                                recordedAt

                        }

                    });


                // ==========================================
                // SAVE FEED UPDATE
                // ==========================================

                await stockUpdate.save({
                    session
                });


                // ==========================================
                // STORE RESULT ON FUNCTION SCOPE
                // ==========================================

                result =
                    {

                        success:
                            true,

                        message:
                            "Stock updated successfully.",

                        update:
                            stockUpdate,

                        stock:
                            stockItem,

                        previousQuantity:
                            previousQuantity,

                        quantity:
                            newQuantity,

                        quantityChange:
                            quantityChange,

                        quantityDifference:
                            quantityChange

                    };

            }
        );


        // ==================================================
        // RETURN SUCCESS
        // ==================================================

        return result;


    } finally {

        // ==================================================
        // ALWAYS CLOSE SESSION
        // ==================================================

        await session.endSession();

    }

};