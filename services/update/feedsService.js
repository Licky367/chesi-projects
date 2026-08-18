// ==========================================================
// services/update/feedsService.js
// ==========================================================
//
// FEED STORE SERVICE
//
// Responsibilities:
//
//     • Load current feed-store inventory
//     • Add animal feed
//     • Add veterinary medicine
//     • Update remaining stock
//     • Calculate dairy.feedsAmount
//     • Create automatic System stock updates
//     • Create worker stock updates
//     • Keep financial information away from workers
//
// CURRENT INVENTORY:
//
//     dairy.feedStocks[]
//
// HISTORY:
//
//     Update.stock
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
// RESOLVE STOCK NAME
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
// CALCULATE TOTAL FINANCIAL VALUE
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
// RECALCULATE DAIRY FEEDS AMOUNT
// ==========================================================

async function recalculateFeedsAmount(
    dairy
) {

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
// CALCULATE REMAINING PERCENTAGE
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
// GET FEED STORE PAGE
// ==========================================================

async function getFeedStorePage({
    dairyId,
    user
}) {

    if (
        !isValidObjectId(
            dairyId
        )
    ) {

        throw new Error(
            "Invalid dairy ID."
        );

    }


    if (!user) {

        throw new Error(
            "Authentication required."
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
    // GUARANTEE CURRENT STOCK ARRAY
    // ------------------------------------------------------

    if (
        !Array.isArray(
            dairy.feedStocks
        )
    ) {

        dairy.feedStocks = [];

    }


    // ------------------------------------------------------
    // STOCK HISTORY
    // ------------------------------------------------------

    const updates =
        await getFeedStoreUpdates(
            dairyId
        );


    // ------------------------------------------------------
    // OPTIONS
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
    // Never expose financial information.
    // ------------------------------------------------------

    const dairyObject =
        dairy.toObject
            ? dairy.toObject()
            : { ...dairy };


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


    delete dairyObject.feedsAmount;


    return {

        dairy:
            dairyObject,

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
//
// Historical activity comes from:
//
//     Update.stock
//
// Current availability does NOT come from here.
//
// ==========================================================

async function getFeedStoreUpdates(
    dairyId
) {

    const updates =
        await Update.find({

            dairy: dairyId,

            type: "stock",

            stock: {
                $exists: true
            }

        })

        .sort({

            createdAt: -1

        })

        .limit(50)

        .populate(

            "user",

            "name profileImage"

        )

        .lean();


    return updates.map(
        update => {

            if (
                update.user &&
                typeof update.user === "object"
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
// ADD STOCK
// ==========================================================
//
// ADMIN ONLY.
//
// This creates CURRENT inventory:
//
//     dairy.feedStocks[]
//
// and a HISTORY entry:
//
//     Update.stock
//
// ==========================================================

async function addStock({
    dairyId,
    user,
    body,
    files
}) {

    if (
        !isValidObjectId(
            dairyId
        )
    ) {

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


    // ------------------------------------------------------
    // ENSURE CURRENT INVENTORY ARRAY
    // ------------------------------------------------------

    if (
        !Array.isArray(
            dairy.feedStocks
        )
    ) {

        dairy.feedStocks = [];

    }


    // ------------------------------------------------------
    // CHECK WHETHER SAME STOCK ALREADY EXISTS
    // ------------------------------------------------------
    //
    // If the same feed/medicine already exists, add the new
    // quantity to the existing current inventory instead of
    // creating duplicate current-stock entries.
    //
    // ------------------------------------------------------

    let stock =
        dairy.feedStocks.find(

            item => (

                item.category === category &&

                item.name === stockName &&

                item.unit === unit

            )

        );


    const now =
        new Date();


    // ------------------------------------------------------
    // EXISTING STOCK
    // ------------------------------------------------------

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


        stock.price =
            price;


        stock.feedsAmount =
            price;


        stock.instructions =
            instructions;


        stock.expectedDuration =
            expectedDuration;


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


    // ------------------------------------------------------
    // NEW STOCK
    // ------------------------------------------------------

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

            feedsAmount:
                price,

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


    // ------------------------------------------------------
    // RECALCULATE TOTAL
    // ------------------------------------------------------

    dairy.feedsAmount =
        calculateFeedsAmount(
            dairy.feedStocks
        );


    // ------------------------------------------------------
    // SAVE CURRENT INVENTORY
    // ------------------------------------------------------

    await dairy.save();


    // ------------------------------------------------------
    // FIND SAVED STOCK
    // ------------------------------------------------------

    const savedStock =
        dairy.feedStocks.find(

            item => (

                item.category === category &&

                item.name === stockName &&

                item.unit === unit

            )

        );


    // ------------------------------------------------------
    // CREATE HISTORY UPDATE
    // ------------------------------------------------------

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
// UPDATE REMAINING STOCK
// ==========================================================
//
// Worker updates CURRENT inventory.
//
// ==========================================================

async function updateRemainingStock({
    dairyId,
    user,
    body,
    files
}) {

    if (
        !isValidObjectId(
            dairyId
        )
    ) {

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
    // FIND CURRENT STOCK
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
    // UPDATE CURRENT INVENTORY
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
    // SAVE
    // ------------------------------------------------------

    await dairy.save();


    // ------------------------------------------------------
    // WORKER FILES
    // ------------------------------------------------------

    const images =
        getFiles(
            files
        );


    // ------------------------------------------------------
    // MESSAGE
    // ------------------------------------------------------

    const message =
        cleanString(
            body.message
        );


    // ------------------------------------------------------
    // HISTORY ENTRY
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
// IMPORTANT:
//
// This now matches models/Update.js exactly.
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
// CREATE WORKER STOCK UPDATE
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
                user.name || "User",


            userImage:
                user.profileImage || "",


            authorRole:
                user.role || "dairyWorker",


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

    createSystemStockUpdate,

    createWorkerStockUpdate,

    FEED_TYPES,

    VETERINARY_MEDICINES,

    STOCK_UNITS

};