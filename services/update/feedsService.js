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
// WORKFLOW:
//
//     Available Stock
//          ↓
//     User clicks stock item
//          ↓
//     Selected stock is opened in the stock/restock section
//          ↓
//     ADMIN
//          • Can edit stock details
//          • Can edit quantity
//          • Can edit unit
//          • Can edit price/value
//          • Can edit instructions
//          • Can add photos
//
//     DAIRY WORKER
//          • Can edit remaining quantity
//          • Cannot increase quantity above current DB quantity
//          • Cannot edit unit
//          • Can add information
//          • Can add photos
//
// HISTORY:
//
//     Every stock action creates a separate Update document.
//
//     History is associated with the specific stock item.
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
    "bales",
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
// quantity is the current remainder in the database.
//
// quantityRemaining is also supported so the service remains
// compatible with older records.
//
// ==========================================================

function getCurrentStockQuantity(stock) {

    if (!stock) {

        return 0;

    }


    if (
        stock.quantity !== undefined &&
        stock.quantity !== null
    ) {

        const quantity =
            Number(stock.quantity);


        if (
            Number.isFinite(quantity)
        ) {

            return quantity;

        }

    }


    if (
        stock.quantityRemaining !== undefined &&
        stock.quantityRemaining !== null
    ) {

        const quantity =
            Number(
                stock.quantityRemaining
            );


        if (
            Number.isFinite(quantity)
        ) {

            return quantity;

        }

    }


    if (
        stock.remaining !== undefined &&
        stock.remaining !== null
    ) {

        const quantity =
            Number(
                stock.remaining
            );


        if (
            Number.isFinite(quantity)
        ) {

            return quantity;

        }

    }


    return 0;

}


// ==========================================================
// GET INITIAL QUANTITY
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
        Number.isFinite(initial)
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
// FIND STOCK BY ID
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
            dairy.feedStocks
        )
    ) {

        return null;

    }


    return dairy.feedStocks.id(
        stockId
    );

}


// ==========================================================
// GET FEED STORE PAGE
// ==========================================================
//
// The page receives:
//
//     dairy
//     user
//     updates
//     feedTypes
//     medicineTypes
//     stockUnits
//
// The actual current stock comes directly from:
//
//     dairy.feedStocks[]
//
// Therefore the Available Stock tab always reflects the
// current database remainder.
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
            dairyObject.feedStocks
        )
    ) {

        dairyObject.feedStocks =
            dairyObject.feedStocks.map(
                function (stock) {

                    const safeStock = {
                        ...stock
                    };


                    // ------------------------------------------------
                    // Financial information is never exposed to
                    // dairy workers.
                    // ------------------------------------------------

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

        feedTypes:
            FEED_TYPES,

        medicineTypes:
            VETERINARY_MEDICINES,

        // ------------------------------------------------------
        // The list is still available to the EJS for display,
        // but the worker's submitted unit is NEVER trusted by
        // updateRemainingStock().
        // ------------------------------------------------------

        stockUnits:
            STOCK_UNITS

    };

}


// ==========================================================
// GET FOODSTOCK HISTORY
// ==========================================================
//
// BOTH:
//
//     available
//
// AND:
//
//     remainder
//
// are returned.
//
// Every history record contains:
//
//     stock.stockId
//
// when available in the Update schema.
//
// This allows the frontend to show history belonging only
// to the selected stock.
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

            // ==================================================
            // USER INFORMATION
            // ==================================================

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


            // ==================================================
            // NORMALIZE STOCK
            // ==================================================

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


                // ------------------------------------------------
                // Keep stockId when present.
                //
                // The model/update schema will be aligned with
                // this field.
                // ------------------------------------------------

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
//
// POST:
//
//     /dairy/:id/feedstore/restock
//
// TWO MODES:
//
// 1. NEW STOCK
//
//     No stockId.
//
//     Creates a new feedStocks[] item.
//
// 2. EXISTING STOCK
//
//     stockId supplied.
//
//     Updates that exact stock item.
//
// ADMIN CAN EDIT:
//
//     quantity
//     unit
//     price
//     instructions
//     expectedDuration
//     images
//
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
    // EXISTING STOCK ID
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
    // NAME
    // ======================================================

    let stockName =
        resolveStockName(
            body
        );


    // ======================================================
    // IF EDITING EXISTING STOCK
    //
    // The backend remains authoritative.
    //
    // If the form does not submit the name because the stock
    // was selected from Available Stock, recover it from DB.
    // ======================================================

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


        // --------------------------------------------------
        // Existing stock name remains authoritative if no
        // new name was supplied.
        // --------------------------------------------------

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
    //
    // ADMIN IS ALLOWED TO EDIT THE UNIT.
    //
    // This is intentionally different from the worker
    // remainder update.
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
    // EDIT EXISTING STOCK
    // ======================================================

    if (stock) {

        const oldQuantity =
            getCurrentStockQuantity(
                stock
            );


        const oldInitialQuantity =
            getInitialQuantity(
                stock
            );


        // --------------------------------------------------
        // IMPORTANT:
        //
        // Admin editing the selected stock is allowed to
        // increase or decrease the quantity.
        //
        // The initial quantity follows the accumulated
        // stock entered by admin.
        // --------------------------------------------------

        const quantityDifference =
            quantity -
            oldQuantity;


        stock.quantity =
            quantity;


        // --------------------------------------------------
        // When admin changes the current quantity, preserve
        // the previous initial quantity and adjust it by
        // the actual stock addition/removal.
        //
        // Never allow initialQuantity to become negative.
        // --------------------------------------------------

        stock.initialQuantity =
            Math.max(
                0,
                oldInitialQuantity +
                quantityDifference
            );


        stock.unit =
            unit;


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


    // ======================================================
    // CREATE NEW STOCK
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
    // GET ACTUAL SAVED STOCK
    // ======================================================

    let savedStock =
        stock;


    if (
        stock._id
    ) {

        savedStock =
            dairy.feedStocks.id(
                stock._id
            ) || stock;

    }


    // ======================================================
    // HISTORY
    //
    // Admin restock/edit is recorded as "available".
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

            quantity,

            unit,

            price,

            instructions,

            expectedDuration,

            images,

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
//
// POST:
//
//     /dairy/:id/feedstore/update
//
// IMPORTANT WORKER RULE:
//
//     worker quantityRemaining
//
//     MUST NOT be greater than:
//
//     current quantity in MongoDB.
//
// The submitted unit is deliberately ignored.
//
// The unit is ALWAYS taken from the selected stock in the DB.
//
// ADMIN:
//
//     Admin may update remainder too.
//
//     Admin may submit a unit, but the worker cannot.
//
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
    // FIND STOCK DIRECTLY FROM DATABASE
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
    // CURRENT DB QUANTITY
    // ======================================================

    const currentQuantity =
        getCurrentStockQuantity(
            stock
        );


    // ======================================================
    // SUBMITTED REMAINDER
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
    //
    // This check is done SERVER-SIDE.
    //
    // Therefore changing HTML/JavaScript in the browser
    // cannot bypass the restriction.
    //
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
    // UNIT
    // ======================================================
    //
    // WORKER:
    //
    //     NEVER trusts req.body.unit.
    //
    //     The unit comes directly from MongoDB.
    //
    // ADMIN:
    //
    //     May edit the unit when updating.
    //
    // ======================================================

    let unit =
        getStockUnit(
            stock
        );


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


        unit =
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
    // UPDATE CURRENT INVENTORY
    // ======================================================

    stock.quantity =
        quantityRemaining;


    // ------------------------------------------------------
    // Only ADMIN can change the unit through this function.
    // Worker unit remains exactly as stored in DB.
    // ------------------------------------------------------

    if (
        role === "admin"
    ) {

        stock.unit =
            unit;

    }


    // ------------------------------------------------------
    // Never allow initial quantity to be changed by a worker.
    // ------------------------------------------------------

    stock.percentageRemaining =
        calculatePercentageRemaining(

            quantityRemaining,

            getInitialQuantity(
                stock
            )

        );


    stock.updatedAt =
        new Date();


    // ======================================================
    // SAVE
    // ======================================================

    await dairy.save();


    // ======================================================
    // CREATE HISTORY EVENT
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
//
// ADMIN STOCK HISTORY
//
//     type:
//         "stock"
//
//     stock.action:
//         "available"
//
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

                // ------------------------------------------------
                // Selected inventory item.
                // ------------------------------------------------

                stockId,

                stockType:
                    category,

                action:
                    action ||
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
// CREATE REMAINING STOCK UPDATE
// ==========================================================
//
// ADMIN / WORKER HISTORY
//
//     type:
//         "stock"
//
//     stock.action:
//         "remainder"
//
// IMPORTANT:
//
//     stock.stockId
//
// identifies the exact inventory item whose remainder was
// updated.
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


    const stockId =
        stock &&
        stock._id
            ? stock._id
            : null;


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
                "Foodstock Remaining Updated",

            text:
                message || "",

            images:
                images || [],

            stock: {

                // ------------------------------------------------
                // EXACT STOCK BEING UPDATED
                // ------------------------------------------------

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

                // ------------------------------------------------
                // Workers never provide financial information.
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
// GET UPDATES FOR ONE STOCK
// ==========================================================
//
// This is useful when the selected Available Stock item is
// opened and the UI needs ONLY the history for that stock.
//
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