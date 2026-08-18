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
// ADMIN:
//
//     Add animal feed
//     Add veterinary medicine
//     Add/increase current stock
//     Set stock financial value
//
// DAIRY WORKER:
//
//     Update remaining quantity
//     Update unit
//     Add message
//     Add images
//
// ADMIN / WORKER HISTORY:
//
//     Every stock action creates Update.stock
//
// ==========================================================


const mongoose =
    require("mongoose");


const Dairy =
    require("../../models/dairy");


const Update =
    require("../../models/Update");


// ==========================================================
// CONSTANTS
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

        .map(function (file) {

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
// STOCK NAME FROM CURRENT STOCK
// ==========================================================

function getStockName(stock) {

    if (!stock) {

        return "";

    }


    return cleanString(

        stock.name ||

        stock.feedName ||

        stock.medicineName ||

        stock.stockName ||

        stock.productName

    );

}


// ==========================================================
// STOCK CATEGORY
// ==========================================================

function getStockCategory(stock) {

    if (!stock) {

        return "";

    }


    return cleanString(

        stock.category ||

        stock.stockType ||

        stock.type

    ).toLowerCase();

}


// ==========================================================
// FINANCIAL VALUE
// ==========================================================
//
// feedsAmount is the financial value of current inventory.
//
// Worker updates NEVER modify it.
//
// ==========================================================

function calculateFeedsAmount(
    feedStocks
) {

    if (
        !Array.isArray(feedStocks)
    ) {

        return 0;

    }


    return feedStocks.reduce(

        function (
            total,
            stock
        ) {

            if (!stock) {

                return total;

            }


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
// RECALCULATE FINANCIAL VALUE
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
//
// Returns exactly the variables expected by:
//
//     views/update/feeds-store.ejs
//
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


    const updates =
        await getFeedStoreUpdates(
            dairyId
        );


    // ======================================================
    // ADMIN
    // ======================================================

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


    // ======================================================
    // WORKER
    // ======================================================

    const dairyObject =
        dairy.toObject
            ? dairy.toObject()
            : {
                ...dairy
            };


    // ------------------------------------------------------
    // Remove financial information from worker stock data.
    // ------------------------------------------------------

    if (
        Array.isArray(
            dairyObject.feedStocks
        )
    ) {

        dairyObject.feedStocks =
            dairyObject.feedStocks.map(
                function (stock) {

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
    // Remove total financial value.
    // ------------------------------------------------------

    delete dairyObject.feedsAmount;


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
// GET STOCK HISTORY
// ==========================================================
//
// Only Update documents containing:
//
//     type: "stock"
//     stock: {...}
//
// are returned.
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
        function (update) {

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
//     dairy.feedStocks[]
//
// AND:
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

    // ======================================================
    // SECURITY
    // ======================================================

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


    // ======================================================
    // CATEGORY
    // ======================================================

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


    // ======================================================
    // NAME
    // ======================================================

    const stockName =
        resolveStockName(
            body
        );


    if (!stockName) {

        throw new Error(
            "Select a feed or veterinary medicine."
        );

    }


    // ======================================================
    // VALIDATE NAME
    // ======================================================

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


    // ======================================================
    // QUANTITY
    // ======================================================

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


    // ======================================================
    // UNIT
    // ======================================================

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


    // ======================================================
    // PRICE
    // ======================================================

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


    // ======================================================
    // OTHER DATA
    // ======================================================

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


    // ======================================================
    // FIND EXISTING STOCK
    // ======================================================

    let stock =
        dairy.feedStocks.find(
            function (item) {

                return (

                    getStockCategory(item) ===
                        category &&

                    getStockName(item) ===
                        stockName &&

                    cleanString(item.unit) ===
                        unit

                );

            }
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
        // ADMIN FINANCIAL VALUE
        // --------------------------------------------------

        stock.price =
            price;


        stock.feedsAmount =
            price;


        // --------------------------------------------------
        // Additional stock information
        // --------------------------------------------------

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
    // FINANCIAL TOTAL
    // ======================================================

    dairy.feedsAmount =
        calculateFeedsAmount(
            dairy.feedStocks
        );


    // ======================================================
    // SAVE INVENTORY
    // ======================================================

    await dairy.save();


    // ======================================================
    // GET SAVED STOCK
    // ======================================================

    const savedStock =
        dairy.feedStocks.find(
            function (item) {

                return (

                    getStockCategory(item) ===
                        category &&

                    getStockName(item) ===
                        stockName &&

                    cleanString(item.unit) ===
                        unit

                );

            }
        );


    // ======================================================
    // CREATE HISTORY EVENT
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
// The following values are deliberately NOT accepted:
//
//     body.price
//     body.feedsAmount
//
// ==========================================================

async function updateRemainingStock({
    dairyId,
    user,
    body,
    files
}) {

    // ======================================================
    // AUTH
    // ======================================================

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


    // ======================================================
    // STOCK ID
    // ======================================================

    const stockId =
        cleanString(
            body.stockId
        );


    if (!stockId) {

        throw new Error(
            "Select the stock item being updated."
        );

    }


    // ======================================================
    // FIND STOCK
    // ======================================================

    const stock =
        dairy.feedStocks.id(
            stockId
        );


    if (!stock) {

        throw new Error(
            "The selected stock item could not be found."
        );

    }


    // ======================================================
    // QUANTITY
    // ======================================================

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


    // ======================================================
    // UNIT
    // ======================================================

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


    // ======================================================
    // UPDATE INVENTORY
    // ======================================================
    //
    // FINANCIAL DATA IS LEFT UNTOUCHED.
    //
    // ======================================================

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


    // ======================================================
    // SAVE INVENTORY
    // ======================================================

    await dairy.save();


    // ======================================================
    // MESSAGE
    // ======================================================

    const message =
        cleanString(
            body.message
        );


    // ======================================================
    // IMAGES
    // ======================================================

    const images =
        getFiles(
            files
        );


    // ======================================================
    // HISTORY EVENT
    // ======================================================

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
// ADMIN RESTOCK EVENT.
//
// Update:
//
//     type = "stock"
//
//     authorRole = "system"
//
//     stock.action = "available"
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
// CREATE WORKER / ADMIN REMAINING STOCK UPDATE
// ==========================================================
//
// Update:
//
//     type = "stock"
//
//     stock.action = "remainder"
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

    if (!user) {

        throw new Error(
            "User is required to create a stock update."
        );

    }


    const stockCategory =
        getStockCategory(
            stock
        );


    const stockName =
        getStockName(
            stock
        );


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
                    stockCategory,

                action:
                    "remainder",

                itemName:
                    stockName,

                category:
                    stockCategory,

                quantity:
                    quantityRemaining,

                unit,

                // ------------------------------------------------
                // No financial value is exposed in worker event.
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