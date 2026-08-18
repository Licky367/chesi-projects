// ==========================================================
// services/update/feedsService.js
// ==========================================================
//
// FEED STORE SERVICE
//
// CURRENT INVENTORY:
//
//     Dairy.feeds[]
//
// HISTORY:
//
//     Update.stock
//
// HISTORY ACTIONS:
//
//     available
//         Created when ADMIN adds/restocks feed or medicine.
//
//     remainder
//         Created when ADMIN or DAIRY WORKER updates
//         the remaining quantity.
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
    "units",
    "bales",
    "containers",
    "packets",
    "boxes"

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

        .map(function(file) {

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
// GET STOCK NAME
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

        stock.productName ||

        stock.itemName

    );

}


// ==========================================================
// GET STOCK CATEGORY
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
// GET CURRENT STOCK QUANTITY
// ==========================================================
//
// CURRENT INVENTORY FIELD:
//
//     dairy.feeds[].quantity
//
// There is intentionally NO feedStocks fallback here.
//
// The new database structure uses `feeds`.
//
// ==========================================================

function getCurrentStockQuantity(stock) {

    if (!stock) {

        return 0;

    }


    const quantity =
        Number(
            stock.quantity
        );


    if (
        Number.isFinite(quantity)
    ) {

        return Math.max(
            0,
            quantity
        );

    }


    return 0;

}


// ==========================================================
// GET INITIAL QUANTITY
// ==========================================================
//
// The current model does NOT contain initialQuantity.
//
// Therefore initial quantity is not fabricated.
//
// For the current system:
//
//     current quantity = stock.quantity
//
// Percentage remaining is therefore based on the quantity
// supplied during the current stock operation.
//
// ==========================================================

function getInitialQuantity(stock) {

    if (!stock) {

        return 0;

    }


    const initial =
        Number(
            stock.initialQuantity
        );


    if (
        Number.isFinite(initial) &&
        initial >= 0
    ) {

        return initial;

    }


    return getCurrentStockQuantity(
        stock
    );

}


// ==========================================================
// GET STOCK UNIT
// ==========================================================

function getStockUnit(stock) {

    if (!stock) {

        return "";

    }


    return cleanString(

        stock.unit ||

        stock.stockUnit

    );

}


// ==========================================================
// FINANCIAL VALUE
// ==========================================================
//
// CURRENT INVENTORY:
//
//     dairy.feeds[]
//
// TOTAL:
//
//     feeds[].price
//
// ==========================================================

function calculateFeedsAmount(
    feeds
) {

    if (
        !Array.isArray(feeds)
    ) {

        return 0;

    }


    return feeds.reduce(

        function(
            total,
            stock
        ) {

            if (!stock) {

                return total;

            }


            const amount =
                parseNumber(
                    stock.price
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
            dairy.feeds
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
            dairy.feeds
        )
    ) {

        dairy.feeds = [];

    }


    return dairy;

}


// ==========================================================
// FIND STOCK BY ID
// ==========================================================
//
// IMPORTANT:
//
//     Uses dairy.feeds
//
// NOT:
//
//     dairy.feedStocks
//
// ==========================================================

function findStock(
    dairy,
    stockId
) {

    if (
        !dairy ||
        !stockId
    ) {

        return null;

    }


    if (
        !isValidObjectId(
            stockId
        )
    ) {

        return null;

    }


    if (
        !Array.isArray(
            dairy.feeds
        )
    ) {

        return null;

    }


    return dairy.feeds.id(
        stockId
    );

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
    // WORKER SAFE DATA
    // ======================================================

    const dairyObject =
        dairy.toObject
            ? dairy.toObject()
            : {
                ...dairy
            };


    if (
        Array.isArray(
            dairyObject.feeds
        )
    ) {

        dairyObject.feeds =
            dairyObject.feeds.map(
                function(stock) {

                    const safeStock = {
                        ...stock
                    };


                    // ------------------------------------------------
                    // Workers must NOT receive financial information.
                    // ------------------------------------------------

                    delete safeStock.price;


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
        function(update) {

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


                update.authorRole =
                    update.user.role ||
                    update.authorRole;

            }


            if (
                update.stock &&
                typeof update.stock ===
                    "object"
            ) {

                update.stock.action =
                    cleanString(
                        update.stock.action
                    );


                update.stock.itemName =
                    cleanString(
                        update.stock.itemName
                    );


                update.stock.category =
                    cleanString(
                        update.stock.category ||
                        update.stock.stockType
                    ).toLowerCase();


                update.stock.unit =
                    cleanString(
                        update.stock.unit
                    );


                if (
                    update.stock.stockId
                ) {

                    update.stock.stockId =
                        String(
                            update.stock.stockId
                        );

                }

            }


            return update;

        }
    );

}


// ==========================================================
// ADMIN: ADD / RESTOCK / EDIT STOCK
// ==========================================================

async function addStock({
    dairyId,
    user,
    body,
    files
}) {

    if (
        !user ||
        user.role !== "admin"
    ) {

        throw new Error(
            "Only administrators can add or edit stock."
        );

    }


    const dairy =
        await getDairy(
            dairyId
        );


    body =
        body || {};


    // ======================================================
    // EXISTING STOCK
    // ======================================================

    const stockId =
        cleanString(
            body.stockId
        );


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
    // STOCK NAME
    // ======================================================

    let stockName =
        resolveStockName(
            body
        );


    let stock =
        null;


    if (stockId) {

        stock =
            findStock(
                dairy,
                stockId
            );


        if (!stock) {

            throw new Error(
                "The selected stock item could not be found."
            );

        }


        if (!stockName) {

            stockName =
                getStockName(
                    stock
                );

        }

    }


    if (!stockName) {

        throw new Error(
            "Select a feed or veterinary medicine."
        );

    }


    // ======================================================
    // VALIDATE STOCK NAME
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
    // INSTRUCTIONS
    // ======================================================

    const instructions =
        cleanString(
            body.instructions
        );


    // ======================================================
    // EXPECTED DURATION
    // ======================================================

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
    // EDIT EXISTING STOCK
    // ======================================================

    if (stock) {

        // --------------------------------------------------
        // IMPORTANT:
        //
        // The actual current quantity is read from:
        //
        //     dairy.feeds[].quantity
        //
        // --------------------------------------------------

        stock.quantity =
            quantity;


        stock.unit =
            unit;


        stock.price =
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

    }


    // ======================================================
    // CREATE NEW STOCK
    // ======================================================

    else {

        stock = {

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
                now,

            updatedAt:
                now

        };


        dairy.feeds.push(
            stock
        );

    }


    // ======================================================
    // FINANCIAL TOTAL
    // ======================================================

    dairy.feedsAmount =
        calculateFeedsAmount(
            dairy.feeds
        );


    // ======================================================
    // SAVE
    // ======================================================

    await dairy.save();


    // ======================================================
    // GET ACTUAL SAVED STOCK
    // ======================================================

    let savedStock =
        stock;


    if (
        stock._id
    ) {

        savedStock =
            dairy.feeds.id(
                stock._id
            ) || stock;

    }


    // ======================================================
    // HISTORY
    // ======================================================

    const update =
        await createSystemStockUpdate({

            dairy,

            stock:
                savedStock,

            category:
                getStockCategory(
                    savedStock
                ),

            stockName:
                getStockName(
                    savedStock
                ),

            quantity:
                getCurrentStockQuantity(
                    savedStock
                ),

            unit:
                getStockUnit(
                    savedStock
                ),

            price:
                Number(
                    savedStock.price
                ) || 0,

            instructions:
                savedStock.instructions ||
                "",

            expectedDuration:
                savedStock.expectedDuration ||
                "",

            images:
                savedStock.images ||
                [],

            action:
                "available"

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

async function updateRemainingStock({
    dairyId,
    user,
    body,
    files
}) {

    if (!user) {

        throw new Error(
            "Authentication required."
        );

    }


    const role =
        user.role;


    if (
        role !== "dairyWorker" &&
        role !== "admin"
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
    // FIND EXACT STOCK
    // ======================================================

    const stock =
        findStock(
            dairy,
            stockId
        );


    if (!stock) {

        throw new Error(
            "The selected stock item could not be found."
        );

    }


    // ======================================================
    // CURRENT DATABASE QUANTITY
    // ======================================================

    const currentQuantity =
        getCurrentStockQuantity(
            stock
        );


    // ======================================================
    // SUBMITTED REMAINING QUANTITY
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
    // WORKER CANNOT INCREASE STOCK
    // ======================================================

    if (
        role === "dairyWorker" &&
        quantityRemaining >
            currentQuantity
    ) {

        throw new Error(

            `A dairy worker cannot update ` +
            `the remaining quantity above the ` +
            `current stock quantity of ` +
            `${currentQuantity}.`

        );

    }


    // ======================================================
    // ADMIN UNIT
    // ======================================================

    if (
        role === "admin" &&
        cleanString(body.unit)
    ) {

        const requestedUnit =
            cleanString(
                body.unit
            );


        if (
            !STOCK_UNITS.includes(
                requestedUnit
            )
        ) {

            throw new Error(
                "Select a valid stock unit."
            );

        }


        stock.unit =
            requestedUnit;

    }


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
    // UPDATE ACTUAL INVENTORY
    // ======================================================

    stock.quantity =
        quantityRemaining;


    stock.updatedAt =
        new Date();


    // ======================================================
    // SAVE
    // ======================================================

    await dairy.save();


    // ======================================================
    // CREATE HISTORY
    // ======================================================

    const update =
        await createWorkerStockUpdate({

            dairy,

            user,

            stock,

            quantityRemaining,

            unit:
                getStockUnit(
                    stock
                ),

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
// CREATE ADMIN STOCK UPDATE
// ==========================================================

async function createSystemStockUpdate({
    dairy,
    stock,
    category,
    stockName,
    quantity,
    unit,
    price,
    instructions,
    expectedDuration,
    images,
    action
}) {

    const isMedicine =
        category === "medicine";


    const title =
        isMedicine

            ? "Veterinary Medicine Stock Updated"

            : "Animal Feed Stock Updated";


    const stockId =
        stock &&
        stock._id
            ? stock._id
            : null;


    return Update.create({

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

            stockId,

            stockType:
                category,

            action:
                action ||
                "available",

            itemName:
                stockName,

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

}


// ==========================================================
// CREATE REMAINING STOCK UPDATE
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


    const stockId =
        stock &&
        stock._id
            ? stock._id
            : null;


    return Update.create({

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
            "Foodstock Remaining Updated",

        text:
            message || "",

        images:
            images || [],

        stock: {

            stockId,

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

}


// ==========================================================
// GET UPDATES FOR ONE STOCK
// ==========================================================

async function getStockUpdates({
    dairyId,
    stockId
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
        !isValidObjectId(
            stockId
        )
    ) {

        throw new Error(
            "Invalid stock ID."
        );

    }


    const updates =
        await Update.find({

            dairy:
                dairyId,

            type:
                "stock",

            "stock.stockId":
                stockId

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
        function(update) {

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


                update.authorRole =
                    update.user.role ||
                    update.authorRole;

            }


            return update;

        }
    );

}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    getFeedStorePage,

    getFeedStoreUpdates,

    getStockUpdates,

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