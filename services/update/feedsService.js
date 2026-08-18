// ==========================================================
// services/update/feedsService.js
// ==========================================================
//
// FEED STORE SERVICE
//
// CURRENT INVENTORY:
//
//     Dairy.feedStocks[]
//
// HISTORY / FEED:
//
//     Update.stock
//
// PIPELINE:
//
//     ADMIN RESTOCK
//
//         ↓
//
//     Dairy.feedStocks[]
//
//         +
//
//
//     Update.stock
//
//         ↓
//
//     Dairy feed
//
//
//
// WORKER STOCK UPDATE
//
//         ↓
//
//     Dairy.feedStocks[]
//
//         +
//
//
//     Update.stock
//
//         ↓
//
//     Dairy feed
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
// BASIC HELPERS
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


    if (
        !Number.isFinite(number)
    ) {

        return null;

    }


    return number;

}


function getFiles(files) {

    if (
        !Array.isArray(files)
    ) {

        return [];

    }


    return files

        .map(file => {

            if (!file) {

                return null;

            }


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
// STOCK NAME
// ==========================================================

function resolveStockName(body) {

    const category =
        cleanString(
            body.category
        ).toLowerCase();


    if (
        category === "medicine"
    ) {

        return cleanString(
            body.medicineName
        );

    }


    return cleanString(
        body.feedName
    );

}


// ==========================================================
// FINANCIAL VALUE
// ==========================================================
//
// feedsAmount represents the financial value of the current
// stock entry.
//
// It is intentionally never calculated from worker input.
//
// ==========================================================

function calculateFeedsAmount(
    feedStocks
) {

    if (
        !Array.isArray(
            feedStocks
        )
    ) {

        return 0;

    }


    return feedStocks.reduce(

        (
            total,
            stock
        ) => {

            const amount =
                parseNumber(
                    stock.feedsAmount
                );


            if (
                amount === null ||
                amount < 0
            ) {

                return total;

            }


            return total + amount;

        },

        0

    );

}


// ==========================================================
// RECALCULATE DAIRY FINANCIAL VALUE
// ==========================================================

async function recalculateFeedsAmount(
    dairy
) {

    if (!dairy) {

        throw new Error(
            "Dairy record is required."
        );

    }


    const total =
        calculateFeedsAmount(
            dairy.feedStocks
        );


    dairy.feedsAmount =
        total;


    await dairy.save();


    return total;

}


// ==========================================================
// REMAINING PERCENTAGE
// ==========================================================

function calculatePercentageRemaining(
    quantity,
    initialQuantity
) {

    const current =
        Number(quantity) || 0;


    const initial =
        Number(initialQuantity) || 0;


    if (
        initial <= 0
    ) {

        return current > 0
            ? 100
            : 0;

    }


    const percentage =
        (
            current /
            initial
        ) * 100;


    return Math.max(

        0,

        Math.min(
            100,
            percentage
        )

    );

}


// ==========================================================
// FIND DAIRY
// ==========================================================

async function getDairy(
    dairyId
) {

    if (
        !isValidObjectId(
            dairyId
        )
    ) {

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


    if (
        !Array.isArray(
            dairy.feedStocks
        )
    ) {

        dairy.feedStocks = [];

    }


    return dairy;

}


// ==========================================================
// GET FEED STORE PAGE
// ==========================================================

async function getFeedStorePage({
    dairyId,
    user
}) {

    if (!user) {

        throw new Error(
            "Authentication required."
        );

    }


    const dairy =
        await getDairy(
            dairyId
        );


    // ------------------------------------------------------
    // HISTORY
    // ------------------------------------------------------

    const updates =
        await getFeedStoreUpdates(
            dairyId
        );


    // ------------------------------------------------------
    // ADMIN
    //
    // Admin receives complete financial data.
    // ------------------------------------------------------

    if (
        user.role === "admin"
    ) {

        return {

            dairy,

            user,

            updates,

            feedTypes:
                FEED_TYPES,

            medicineTypes:
                VETERINARY_MEDICINES,

            stockUnits:
                STOCK_UNITS

        };

    }


    // ------------------------------------------------------
    // WORKER
    //
    // Create a safe copy.
    // ------------------------------------------------------

    const dairyObject =
        dairy.toObject
            ? dairy.toObject()
            : {
                ...dairy
            };


    // ------------------------------------------------------
    // REMOVE FINANCIAL DATA FROM STOCK
    // ------------------------------------------------------

    if (
        Array.isArray(
            dairyObject.feedStocks
        )
    ) {

        dairyObject.feedStocks =
            dairyObject.feedStocks.map(
                stock => {

                    const safeStock = {
                        ...stock
                    };


                    delete safeStock.price;

                    delete safeStock.feedsAmount;


                    return safeStock;

                }
            );

    }


    // ------------------------------------------------------
    // REMOVE FARM TOTAL
    // ------------------------------------------------------

    delete dairyObject.feedsAmount;


    // ------------------------------------------------------
    // RETURN WORKER DATA
    // ------------------------------------------------------

    return {

        dairy:
            dairyObject,

        user,

        updates,

        feedTypes:
            FEED_TYPES,

        medicineTypes:
            VETERINARY_MEDICINES,

        stockUnits:
            STOCK_UNITS

    };

}


// ==========================================================
// GET FEED STORE HISTORY
// ==========================================================
//
// ONLY Update.stock is returned.
//
// Current inventory remains dairy.feedStocks[].
//
// ==========================================================

async function getFeedStoreUpdates(
    dairyId
) {

    if (
        !isValidObjectId(
            dairyId
        )
    ) {

        throw new Error(
            "Invalid dairy ID."
        );

    }


    const updates =
        await Update.find({

            dairy:
                dairyId,

            type:
                "stock",

            stock: {
                $exists:
                    true
            }

        })

        .sort({

            createdAt:
                -1

        })

        .limit(100)

        .populate(

            "user",

            "name profileImage role"

        )

        .lean();


    return updates.map(
        update => {

            if (
                update.user &&
                typeof update.user ===
                    "object"
            ) {

                update.userName =
                    update.user.name ||
                    update.userName;


                update.userImage =
                    update.user.profileImage ||
                    update.userImage;

            }


            return update;

        }
    );

}


// ==========================================================
// ADMIN: ADD STOCK
// ==========================================================
//
// Creates:
//
//     1. Current inventory
//     2. Historical Update.stock
//
// ==========================================================

async function addStock({
    dairyId,
    user,
    body,
    files
}) {

    // ------------------------------------------------------
    // SECURITY
    // ------------------------------------------------------

    if (
        !user ||
        user.role !== "admin"
    ) {

        throw new Error(
            "Only administrators can add stock."
        );

    }


    const dairy =
        await getDairy(
            dairyId
        );


    body =
        body || {};


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
    // NAME
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
    // VALIDATE NAME
    // ------------------------------------------------------

    if (
        category === "feed"
    ) {

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


    const now =
        new Date();


    // ------------------------------------------------------
    // FIND EXISTING STOCK
    // ------------------------------------------------------
    //
    // Same:
    //
    //     category
    //     name
    //     unit
    //
    // = same current inventory item.
    //
    // ------------------------------------------------------

    let stock =
        dairy.feedStocks.find(

            item =>

                item.category ===
                    category &&

                item.name ===
                    stockName &&

                item.unit ===
                    unit

        );


    // ======================================================
    // EXISTING STOCK
    // ======================================================

    if (stock) {

        const oldQuantity =
            Number(
                stock.quantity
            ) || 0;


        const oldInitialQuantity =
            Number(
                stock.initialQuantity
            ) || 0;


        stock.quantity =
            oldQuantity +
            quantity;


        stock.initialQuantity =
            oldInitialQuantity +
            quantity;


        // --------------------------------------------------
        // ADMIN'S LATEST FINANCIAL VALUE
        // --------------------------------------------------

        stock.price =
            price;


        stock.feedsAmount =
            price;


        stock.instructions =
            instructions;


        stock.expectedDuration =
            expectedDuration;


        // --------------------------------------------------
        // Replace images only when new images were supplied.
        // --------------------------------------------------

        if (
            images.length > 0
        ) {

            stock.images =
                images;

        }


        stock.updatedAt =
            now;


        stock.percentageRemaining =
            calculatePercentageRemaining(

                stock.quantity,

                stock.initialQuantity

            );

    }


    // ======================================================
    // NEW STOCK
    // ======================================================

    else {

        stock = {

            category,

            name:
                stockName,

            quantity,

            initialQuantity:
                quantity,

            unit,

            percentageRemaining:
                quantity > 0
                    ? 100
                    : 0,

            price,

            feedsAmount:
                price,

            instructions,

            expectedDuration,

            images,

            addedAt:
                now,

            updatedAt:
                now

        };


        dairy.feedStocks.push(
            stock
        );

    }


    // ======================================================
    // RECALCULATE FINANCIAL TOTAL
    // ======================================================

    dairy.feedsAmount =
        calculateFeedsAmount(
            dairy.feedStocks
        );


    // ======================================================
    // SAVE CURRENT INVENTORY
    // ======================================================

    await dairy.save();


    // ======================================================
    // GET SAVED STOCK
    // ======================================================

    const savedStock =
        dairy.feedStocks.find(

            item =>

                item.category ===
                    category &&

                item.name ===
                    stockName &&

                item.unit ===
                    unit

        );


    // ======================================================
    // CREATE HISTORY / FEED UPDATE
    // ======================================================

    const update =
        await createSystemStockUpdate({

            dairy,

            category,

            stockName,

            quantity,

            unit,

            price,

            instructions,

            expectedDuration,

            images

        });


    return {

        dairy,

        stock:
            savedStock,

        update,

        feedsAmount:
            dairy.feedsAmount

    };

}


// ==========================================================
// WORKER / ADMIN: UPDATE REMAINING STOCK
// ==========================================================
//
// IMPORTANT:
//
// This function NEVER accepts:
//
//     price
//     feedsAmount
//
// from req.body.
//
// Those values remain untouched.
//
// ==========================================================

async function updateRemainingStock({
    dairyId,
    user,
    body,
    files
}) {

    // ------------------------------------------------------
    // AUTH
    // ------------------------------------------------------

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
        await getDairy(
            dairyId
        );


    body =
        body || {};


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
        dairy.feedStocks.id(
            stockId
        );


    if (!stock) {

        throw new Error(
            "The selected stock item could not be found."
        );

    }


    // ------------------------------------------------------
    // REMAINING QUANTITY
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
    // PROTECT FINANCIAL FIELDS
    // ------------------------------------------------------
    //
    // Deliberately DO NOT do:
    //
    //     stock.price = body.price
    //
    // or:
    //
    //     stock.feedsAmount = body.feedsAmount
    //
    // ------------------------------------------------------


    // ------------------------------------------------------
    // UPDATE CURRENT QUANTITY
    // ------------------------------------------------------

    stock.quantity =
        quantityRemaining;


    stock.unit =
        unit;


    stock.percentageRemaining =
        calculatePercentageRemaining(

            quantityRemaining,

            stock.initialQuantity

        );


    stock.updatedAt =
        new Date();


    // ------------------------------------------------------
    // SAVE CURRENT INVENTORY
    // ------------------------------------------------------

    await dairy.save();


    // ------------------------------------------------------
    // WORKER MESSAGE
    // ------------------------------------------------------

    const message =
        cleanString(
            body.message
        );


    // ------------------------------------------------------
    // IMAGES
    // ------------------------------------------------------

    const images =
        getFiles(
            files
        );


    // ------------------------------------------------------
    // CREATE HISTORY ENTRY
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
// SYSTEM STOCK UPDATE
// ==========================================================
//
// Created when ADMIN adds stock.
//
// This is what puts the event into:
//
//     Update.stock
//
// which is subsequently loaded by pageService and becomes
// part of the normal Dairy feed.
//
// ==========================================================

async function createSystemStockUpdate({
    dairy,
    category,
    stockName,
    quantity,
    unit,
    price,
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


    const update =
        await Update.create({

            dairy:
                dairy._id,

            user:
                null,

            userName:
                "System",

            userImage:
                "/images/h1.png",

            authorRole:
                "system",

            type:
                "stock",

            title,

            text:
                instructions || "",

            images:
                images || [],

            stock: {

                stockType:
                    category,

                action:
                    "available",

                itemName:
                    stockName,

                category:
                    category,

                quantity,

                unit,

                price,

                instructions,

                expectedDuration,

                message:
                    "",

                images:
                    images || []

            }

        });


    return update;

}


// ==========================================================
// WORKER STOCK UPDATE
// ==========================================================
//
// Created when a worker/admin records remaining stock.
//
// This is also:
//
//     Update.stock
//
// Therefore it enters the normal feed pipeline.
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

    const update =
        await Update.create({

            dairy:
                dairy._id,

            user:
                user._id,

            userName:
                user.name ||
                "User",

            userImage:
                user.profileImage ||
                "",

            authorRole:
                user.role ||
                "dairyWorker",

            type:
                "stock",

            title:
                "Foodstock Update",

            text:
                message || "",

            images:
                images || [],

            stock: {

                stockType:
                    stock.category,

                action:
                    "remainder",

                itemName:
                    stock.name,

                category:
                    stock.category,

                quantity:
                    quantityRemaining,

                unit,

                // ------------------------------------------------
                // Workers NEVER get a financial value here.
                // ------------------------------------------------

                price:
                    0,

                instructions:
                    "",

                expectedDuration:
                    "",

                message:
                    message || "",

                images:
                    images || []

            }

        });


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

    calculatePercentageRemaining,

    createSystemStockUpdate,

    createWorkerStockUpdate,

    FEED_TYPES,

    VETERINARY_MEDICINES,

    STOCK_UNITS

};