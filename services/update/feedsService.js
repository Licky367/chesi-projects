// ==========================================================
// services/update/feedsService.js
// ==========================================================
//
// FEED STORE SERVICE
//
// Responsibilities:
//
//     • Load dairy feed-store data
//     • Add animal feed
//     • Add veterinary medicine
//     • Update remaining quantities
//     • Calculate dairy.feedsAmount
//     • Create automatic System stock updates
//     • Prepare feed-store data for EJS
//
// ==========================================================


const mongoose =
    require("mongoose");



const Dairy =
    require("../../models/dairy");

const Update =
    require("../../models/Update");



// ==========================================================
// ENUMS
// ==========================================================
//
// These should ideally eventually be imported from the
// dairy model if the model exports them.
//
// Keeping the fallback values here also makes the service
// self-contained.
//
// ==========================================================

const FEED_TYPES = [

    "Fodder",
    "Silage",
    "Hay",
    "Dairy Meal",
    "Calf Starter",
    "Calf Grower",
    "Maize Bran",
    "Wheat Bran",
    "Pollard",
    "Maize Germ",
    "Cotton Seed Cake",
    "Sunflower Cake",
    "Soybean Meal",
    "Mineral Supplement",
    "Molasses",
    "Salt",
    "Other"

];


const VETERINARY_MEDICINES = [

    "Antibiotics",
    "Dewormer",
    "Acaricide",
    "Antiseptic",
    "Wound Treatment",
    "Mastitis Treatment",
    "Anti-inflammatory",
    "Pain Relief",
    "Vitamin Supplement",
    "Mineral Supplement",
    "Calcium Supplement",
    "Rehydration Treatment",
    "Vaccines",
    "Other"

];


const STOCK_UNITS = [

    "kg",
    "bags",
    "tonnes",
    "litres",
    "bottles",
    "packs",
    "units"

];



// ==========================================================
// HELPERS
// ==========================================================

function isValidObjectId(id) {

    return mongoose.Types.ObjectId.isValid(id);

}



function cleanString(value) {

    if (
        value === undefined ||
        value === null
    ) {

        return "";

    }


    return String(value).trim();

}



function parseNumber(value) {

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {

        return null;

    }


    const number =
        Number(value);


    if (!Number.isFinite(number)) {

        return null;

    }


    return number;

}



function getFiles(files) {

    if (!Array.isArray(files)) {

        return [];

    }


    return files
        .map(file => {

            if (!file) {
                return null;
            }


            // Multer commonly gives us .path,
            // .location or .filename depending
            // on storage configuration.

            return (
                file.path ||
                file.location ||
                file.url ||
                null
            );

        })
        .filter(Boolean);

}



// ==========================================================
// NORMALIZE STOCK NAME
// ==========================================================

function resolveStockName(body) {

    const category =
        cleanString(body.category)
            .toLowerCase();


    if (category === "medicine") {

        return cleanString(
            body.medicineName
        );

    }


    return cleanString(
        body.feedName
    );

}



// ==========================================================
// CALCULATE TOTAL STOCK VALUE
// ==========================================================
//
// IMPORTANT:
//
// feedsAmount is calculated from ALL stored stock prices.
//
// It is NOT supplied by the user.
//
// ==========================================================

function calculateFeedsAmount(feeds) {

    if (!Array.isArray(feeds)) {

        return 0;

    }


    return feeds.reduce(
        (total, feed) => {

            const price =
                parseNumber(
                    feed.price
                );


            if (
                price === null ||
                price < 0
            ) {

                return total;

            }


            return total + price;

        },
        0
    );

}



// ==========================================================
// SAVE AGGREGATE VALUE
// ==========================================================

async function recalculateFeedsAmount(dairy) {

    const total =
        calculateFeedsAmount(
            dairy.feeds
        );


    dairy.feedsAmount =
        total;


    await dairy.save();


    return total;

}



// ==========================================================
// GET FEED STORE PAGE
// ==========================================================
//
// This is where financial information is deliberately
// filtered according to the logged-in user's role.
//
// Admin:
//     receives prices + feedsAmount.
//
// Worker:
//     receives stock quantities but no financial values.
//
// ==========================================================

async function getFeedStorePage({
    dairyId,
    user
}) {

    if (!isValidObjectId(dairyId)) {

        throw new Error(
            "Invalid dairy ID."
        );

    }



    const dairy =
        await Dairy.findById(
            dairyId
        );


    if (!dairy) {

        throw new Error(
            "Dairy not found."
        );

    }



    // ------------------------------------------------------
    // LOAD STOCK UPDATES
    // ------------------------------------------------------

    const updates =
        await getFeedStoreUpdates(
            dairyId
        );



    // ------------------------------------------------------
    // ENUM OPTIONS
    // ------------------------------------------------------

    const feedTypes =
        FEED_TYPES;


    const medicineTypes =
        VETERINARY_MEDICINES;


    const stockUnits =
        STOCK_UNITS;



    // ------------------------------------------------------
    // ADMIN
    // ------------------------------------------------------

    if (
        user &&
        user.role === "admin"
    ) {

        return {

            dairy,
            user,
            updates,
            feedTypes,
            medicineTypes,
            stockUnits

        };

    }



    // ------------------------------------------------------
    // WORKER
    // ------------------------------------------------------
    //
    // Never expose prices or aggregate financial values.
    //
    // We create a sanitized copy rather than modifying
    // the Mongoose document itself.
    // ------------------------------------------------------

    const dairyObject =
        dairy.toObject
            ? dairy.toObject()
            : { ...dairy };


    if (
        Array.isArray(
            dairyObject.feeds
        )
    ) {

        dairyObject.feeds =
            dairyObject.feeds.map(
                feed => {

                    const safeFeed = {
                        ...feed
                    };


                    delete safeFeed.price;
                    delete safeFeed.cost;
                    delete safeFeed.value;
                    delete safeFeed.amount;


                    return safeFeed;

                }
            );

    }



    delete dairyObject.feedsAmount;



    return {

        dairy: dairyObject,
        user,
        updates,
        feedTypes,
        medicineTypes,
        stockUnits

    };

}



// ==========================================================
// GET FEED STORE UPDATES
// ==========================================================

async function getFeedStoreUpdates(
    dairyId
) {

    // ------------------------------------------------------
    // IMPORTANT:
    //
    // The exact Update schema may have slightly different
    // field names depending on the current project version.
    //
    // We query by dairyId and identify stock posts through
    // source/type/category.
    // ------------------------------------------------------

    const updates =
        await Update.find({
            dairyId,
            $or: [

                {
                    updateType: "stock"
                },

                {
                    type: "stock"
                },

                {
                    category: "feedstore"
                },

                {
                    category: "stock"
                },

                {
                    source: "feedstore"
                }

            ]

        })
        .sort({
            createdAt: -1
        })
        .limit(50)
        .populate(
            "userId",
            "name profileImage"
        )
        .lean();



    return updates.map(
        update => {

            if (
                update.userId &&
                typeof update.userId === "object"
            ) {

                update.user = {
                    name:
                        update.userId.name,

                    profileImage:
                        update.userId.profileImage
                };

            }


            return update;

        }
    );

}



// ==========================================================
// ADD STOCK
// ==========================================================
//
// ADMIN ONLY.
//
// Creates:
//
//     1. Feed/medicine inventory record
//     2. Updated feedsAmount
//     3. Automatic System Update
//
// ==========================================================

async function addStock({
    dairyId,
    user,
    body,
    files
}) {

    if (!isValidObjectId(dairyId)) {

        throw new Error(
            "Invalid dairy ID."
        );

    }



    if (
        !user ||
        user.role !== "admin"
    ) {

        throw new Error(
            "Only administrators can add stock."
        );

    }



    const dairy =
        await Dairy.findById(
            dairyId
        );


    if (!dairy) {

        throw new Error(
            "Dairy not found."
        );

    }



    // ------------------------------------------------------
    // CATEGORY
    // ------------------------------------------------------

    const category =
        cleanString(
            body.category
        ).toLowerCase();


    if (
        category !== "feed" &&
        category !== "medicine"
    ) {

        throw new Error(
            "Select either animal feed or veterinary medicine."
        );

    }



    // ------------------------------------------------------
    // STOCK NAME
    // ------------------------------------------------------

    const stockName =
        resolveStockName(
            body
        );


    if (!stockName) {

        throw new Error(
            "Select a feed or veterinary medicine."
        );

    }



    // ------------------------------------------------------
    // VALIDATE AGAINST ENUM
    // ------------------------------------------------------

    if (category === "feed") {

        if (
            !FEED_TYPES.includes(
                stockName
            )
        ) {

            throw new Error(
                "Invalid animal feed type."
            );

        }

    } else {

        if (
            !VETERINARY_MEDICINES.includes(
                stockName
            )
        ) {

            throw new Error(
                "Invalid veterinary medicine type."
            );

        }

    }



    // ------------------------------------------------------
    // QUANTITY
    // ------------------------------------------------------

    const quantity =
        parseNumber(
            body.quantity
        );


    if (
        quantity === null ||
        quantity < 0
    ) {

        throw new Error(
            "Enter a valid stock quantity."
        );

    }



    // ------------------------------------------------------
    // UNIT
    // ------------------------------------------------------

    const unit =
        cleanString(
            body.unit
        );


    if (
        !STOCK_UNITS.includes(
            unit
        )
    ) {

        throw new Error(
            "Select a valid stock unit."
        );

    }



    // ------------------------------------------------------
    // PRICE
    // ------------------------------------------------------

    const price =
        parseNumber(
            body.price
        );


    if (
        price === null ||
        price < 0
    ) {

        throw new Error(
            "Enter a valid stock value."
        );

    }



    // ------------------------------------------------------
    // OTHER DATA
    // ------------------------------------------------------

    const instructions =
        cleanString(
            body.instructions
        );


    const expectedDuration =
        cleanString(
            body.expectedDuration
        );


    const images =
        getFiles(
            files
        );



    // ------------------------------------------------------
    // ENSURE ARRAY
    // ------------------------------------------------------

    if (
        !Array.isArray(
            dairy.feeds
        )
    ) {

        dairy.feeds = [];

    }



    // ------------------------------------------------------
    // CREATE INVENTORY RECORD
    // ------------------------------------------------------

    const stockRecord = {

        category,

        name:
            stockName,

        quantity,

        unit,

        price,

        instructions,

        expectedDuration,

        images,

        addedAt:
            new Date(),

        updatedAt:
            new Date()

    };



    dairy.feeds.push(
        stockRecord
    );



    // ------------------------------------------------------
    // RECALCULATE TOTAL VALUE
    // ------------------------------------------------------

    const total =
        calculateFeedsAmount(
            dairy.feeds
        );


    dairy.feedsAmount =
        total;



    // ------------------------------------------------------
    // SAVE DAIRY
    // ------------------------------------------------------

    await dairy.save();



    // ------------------------------------------------------
    // AUTOMATIC SYSTEM UPDATE
    // ------------------------------------------------------

    await createSystemStockUpdate({

        dairy,
        category,
        stockName,
        quantity,
        unit,
        instructions,
        expectedDuration,
        images

    });



    return {

        dairy,
        stock: stockRecord,
        feedsAmount: total

    };

}



// ==========================================================
// UPDATE REMAINING STOCK
// ==========================================================
//
// Worker changes QUANTITY ONLY.
//
// Price remains untouched.
//
// feedsAmount remains untouched.
//
// ==========================================================

async function updateRemainingStock({
    dairyId,
    user,
    body,
    files
}) {

    if (!isValidObjectId(dairyId)) {

        throw new Error(
            "Invalid dairy ID."
        );

    }



    if (!user) {

        throw new Error(
            "Authentication required."
        );

    }



    if (
        user.role !== "dairyWorker" &&
        user.role !== "admin"
    ) {

        throw new Error(
            "You are not authorized to update stock."
        );

    }



    const dairy =
        await Dairy.findById(
            dairyId
        );


    if (!dairy) {

        throw new Error(
            "Dairy not found."
        );

    }



    // ------------------------------------------------------
    // STOCK ID
    // ------------------------------------------------------

    const stockId =
        cleanString(
            body.stockId
        );


    if (!stockId) {

        throw new Error(
            "Select the stock item being updated."
        );

    }



    // ------------------------------------------------------
    // FIND STOCK
    // ------------------------------------------------------

    const stock =
        dairy.feeds.id(
            stockId
        );


    if (!stock) {

        throw new Error(
            "The selected stock item could not be found."
        );

    }



    // ------------------------------------------------------
    // QUANTITY
    // ------------------------------------------------------

    const quantityRemaining =
        parseNumber(
            body.quantityRemaining
        );


    if (
        quantityRemaining === null ||
        quantityRemaining < 0
    ) {

        throw new Error(
            "Enter a valid remaining quantity."
        );

    }



    // ------------------------------------------------------
    // UNIT
    // ------------------------------------------------------

    const unit =
        cleanString(
            body.unit
        );


    if (
        !STOCK_UNITS.includes(
            unit
        )
    ) {

        throw new Error(
            "Select a valid stock unit."
        );

    }



    // ------------------------------------------------------
    // UPDATE INVENTORY QUANTITY
    // ------------------------------------------------------

    stock.quantity =
        quantityRemaining;


    stock.unit =
        unit;


    stock.updatedAt =
        new Date();



    // ------------------------------------------------------
    // SAVE
    // ------------------------------------------------------
    //
    // DO NOT recalculate feedsAmount here.
    //
    // A worker is changing physical quantity, not financial
    // acquisition value.
    //
    // ------------------------------------------------------

    await dairy.save();



    // ------------------------------------------------------
    // WORKER IMAGES
    // ------------------------------------------------------

    const images =
        getFiles(
            files
        );



    // ------------------------------------------------------
    // WORKER MESSAGE
    // ------------------------------------------------------

    const message =
        cleanString(
            body.message
        );



    // ------------------------------------------------------
    // CREATE NORMAL USER UPDATE
    // ------------------------------------------------------

    const update =
        await createWorkerStockUpdate({

            dairy,
            user,
            stock,
            quantityRemaining,
            unit,
            message,
            images

        });



    return {

        dairy,
        stock,
        update

    };

}



// ==========================================================
// CREATE SYSTEM STOCK UPDATE
// ==========================================================
//
// This creates the automatic post that appears as:
//
//     System
//
//     The System updated
//     Dairy Name's Foodstock
//
//     [date/time]
//
//     More Animal Feed Available
//
// or:
//
//     More Veterinary Meds Available
//
// ==========================================================

async function createSystemStockUpdate({
    dairy,
    category,
    stockName,
    quantity,
    unit,
    instructions,
    expectedDuration,
    images
}) {

    const isMedicine =
        category === "medicine";


    const title =
        isMedicine
            ? "More Veterinary Meds Available"
            : "More Animal Feed Available";



    const updateData = {

        // --------------------------------------------------
        // FEED IDENTIFICATION
        // --------------------------------------------------

        dairyId:
            dairy._id,

        dairy:
            dairy._id,



        // --------------------------------------------------
        // SYSTEM AUTHOR
        // --------------------------------------------------

        authorType:
            "system",

        source:
            "feedstore",

        updateType:
            "stock",

        type:
            "stock",

        category:
            "feedstore",

        isSystem:
            true,



        // --------------------------------------------------
        // SYSTEM DISPLAY
        // --------------------------------------------------

        userName:
            "System",

        userImage:
            "/images/h1.png",



        // --------------------------------------------------
        // CONTENT
        // --------------------------------------------------

        title,

        stockType:
            category,

        stockName,

        quantity,

        addedQuantity:
            quantity,

        unit,

        instructions,

        expectedDuration,

        images,



        // --------------------------------------------------
        // MESSAGE
        // --------------------------------------------------

        text:
            instructions || "",

        message:
            instructions || "",



        createdAt:
            new Date()

    };



    // ------------------------------------------------------
    // IMPORTANT
    //
    // We intentionally do NOT set userId to the admin.
    //
    // The post is a SYSTEM post.
    //
    // ------------------------------------------------------

    const update =
        await Update.create(
            updateData
        );


    return update;

}



// ==========================================================
// CREATE WORKER STOCK UPDATE
// ==========================================================
//
// This is NOT a System announcement.
//
// It is authored by the actual dairy worker.
//
// ==========================================================

async function createWorkerStockUpdate({
    dairy,
    user,
    stock,
    quantityRemaining,
    unit,
    message,
    images
}) {

    const updateData = {

        // --------------------------------------------------
        // DAIRY
        // --------------------------------------------------

        dairyId:
            dairy._id,

        dairy:
            dairy._id,



        // --------------------------------------------------
        // AUTHOR
        // --------------------------------------------------

        userId:
            user._id,

        authorType:
            "user",

        source:
            "feedstore",

        updateType:
            "stock",

        type:
            "stock",

        category:
            "feedstore",

        isSystem:
            false,



        // --------------------------------------------------
        // USER DISPLAY
        // --------------------------------------------------

        userName:
            user.name || "User",

        userImage:
            user.profileImage || "",



        // --------------------------------------------------
        // STOCK
        // --------------------------------------------------

        stockId:
            stock._id,

        stockType:
            stock.category,

        stockName:
            stock.name,

        quantityRemaining,

        quantity:
            quantityRemaining,

        unit,



        // --------------------------------------------------
        // CONTENT
        // --------------------------------------------------

        title:
            "Foodstock Update",

        message,

        text:
            message,

        images,



        // --------------------------------------------------
        // DATE
        // --------------------------------------------------

        createdAt:
            new Date()

    };



    const update =
        await Update.create(
            updateData
        );


    return update;

}



// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    getFeedStorePage,

    getFeedStoreUpdates,

    addStock,

    updateRemainingStock,

    calculateFeedsAmount,

    recalculateFeedsAmount,

    createSystemStockUpdate,

    createWorkerStockUpdate,

    FEED_TYPES,

    VETERINARY_MEDICINES,

    STOCK_UNITS

};