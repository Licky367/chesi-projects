// ==========================================================
// services/update/storageService.js
// ==========================================================
//
// FEED STORE / STORAGE SERVICE
//
// CANONICAL DATABASE LOCATION:
//
//     Dairy.feedStocks[]
//
// IMPORTANT:
//
// There is NO separate FeedStock collection.
//
// Every stock operation starts by loading the Dairy document
// and then reading/writing:
//
//     dairy.feedStocks[]
//
// CANONICAL STOCK IDENTITY:
//
//     stock._id
//
// CANONICAL STOCK NAME:
//
//     stock.name
//
// LEGACY / CATEGORY FIELDS:
//
//     stock.feedName
//     stock.medicineName
//
// ==========================================================


const mongoose =
    require("mongoose");


const Dairy =
    require("../../models/dairy");


// ==========================================================
// ERROR
// ==========================================================

function createError(
    message,
    statusCode = 400
) {

    const error =
        new Error(
            message
        );


    error.statusCode =
        statusCode;


    return error;

}


// ==========================================================
// VALID OBJECT ID
// ==========================================================

function isValidObjectId(
    value
) {

    return mongoose.Types.ObjectId.isValid(
        String(
            value || ""
        )
    );

}


// ==========================================================
// CLEAN TEXT
// ==========================================================

function cleanText(
    value
) {

    if (
        value === undefined ||
        value === null
    ) {

        return "";

    }


    return String(
        value
    ).trim();

}


// ==========================================================
// NUMBER
// ==========================================================

function toNumber(
    value
) {

    const number =
        Number(
            value
        );


    return Number.isFinite(
        number
    )
        ? number
        : NaN;

}


// ==========================================================
// ROUND
// ==========================================================

function roundNumber(
    value,
    decimals = 2
) {

    const number =
        Number(
            value
        );


    if (
        !Number.isFinite(
            number
        )
    ) {

        return 0;

    }


    const multiplier =
        Math.pow(
            10,
            decimals
        );


    return Math.round(
        number * multiplier
    ) / multiplier;

}


// ==========================================================
// TOUCH STOCK
// ==========================================================

function touchStock(
    stock
) {

    stock.updatedAt =
        new Date();

}


// ==========================================================
// GET DAIRY
// ==========================================================
//
// IMPORTANT:
//
// This is the ONLY model lookup used by this service.
//
// Stocks are NOT loaded from a separate collection.
//
// ==========================================================

async function getDairy(
    dairyId
) {

    const id =
        cleanText(
            dairyId
        );


    if (!id) {

        throw createError(
            "Dairy ID is required.",
            400
        );

    }


    if (
        !isValidObjectId(
            id
        )
    ) {

        throw createError(
            "Invalid dairy ID.",
            400
        );

    }


    const dairy =
        await Dairy.findById(
            id
        );


    if (!dairy) {

        throw createError(
            "Dairy not found.",
            404
        );

    }


    // ------------------------------------------------------
    // Guarantee the array exists.
    // ------------------------------------------------------

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
// OPTIONS
// ==========================================================

function getFeedTypes() {

    if (
        typeof Dairy.getFeedTypes ===
        "function"
    ) {

        const result =
            Dairy.getFeedTypes();


        return Array.isArray(
            result
        )
            ? result
            : [];

    }


    return [];

}


function getVeterinaryMedicines() {

    if (
        typeof Dairy.getVeterinaryMedicines ===
        "function"
    ) {

        const result =
            Dairy.getVeterinaryMedicines();


        return Array.isArray(
            result
        )
            ? result
            : [];

    }


    return [];

}


function getStockUnits() {

    if (
        typeof Dairy.getStockUnits ===
        "function"
    ) {

        const result =
            Dairy.getStockUnits();


        return Array.isArray(
            result
        )
            ? result
            : [];

    }


    return [];

}


function getStorageOptions() {

    return {

        feedTypes:
            getFeedTypes(),

        veterinaryMedicines:
            getVeterinaryMedicines(),

        stockUnits:
            getStockUnits()

    };

}


// ==========================================================
// CATEGORY
// ==========================================================

function normalizeCategory(
    category
) {

    const value =
        cleanText(
            category
        ).toLowerCase();


    if (
        value !== "feed" &&
        value !== "medicine"
    ) {

        throw createError(
            "Stock category must be either feed or medicine."
        );

    }


    return value;

}


// ==========================================================
// STOCK NAME
// ==========================================================
//
// CANONICAL:
//
//     data.name
//
// Fallback:
//
//     data.feedName
//     data.medicineName
//
// ==========================================================

function normalizeStockName(
    data = {},
    category
) {

    let name =
        cleanText(
            data.name
        );


    if (!name) {

        if (
            category === "medicine"
        ) {

            name =
                cleanText(
                    data.medicineName
                );

        }

        else {

            name =
                cleanText(
                    data.feedName
                );

        }

    }


    if (!name) {

        throw createError(
            "Stock name is required."
        );

    }


    if (
        name.length > 150
    ) {

        throw createError(
            "Stock name cannot exceed 150 characters."
        );

    }


    return name;

}


// ==========================================================
// QUANTITY
// ==========================================================

function normalizeQuantity(
    value,
    fieldName = "Quantity"
) {

    const quantity =
        toNumber(
            value
        );


    if (
        !Number.isFinite(
            quantity
        )
    ) {

        throw createError(
            `${fieldName} must be a valid number.`
        );

    }


    if (
        quantity < 0
    ) {

        throw createError(
            `${fieldName} cannot be negative.`
        );

    }


    return roundNumber(
        quantity
    );

}


function normalizePositiveQuantity(
    value,
    fieldName = "Quantity"
) {

    const quantity =
        normalizeQuantity(
            value,
            fieldName
        );


    if (
        quantity <= 0
    ) {

        throw createError(
            `${fieldName} must be greater than zero.`
        );

    }


    return quantity;

}


// ==========================================================
// PRICE
// ==========================================================

function normalizePrice(
    value
) {

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {

        return null;

    }


    const price =
        toNumber(
            value
        );


    if (
        !Number.isFinite(
            price
        )
    ) {

        throw createError(
            "Unit price must be a valid number."
        );

    }


    if (
        price < 0
    ) {

        throw createError(
            "Unit price cannot be negative."
        );

    }


    return roundNumber(
        price
    );

}


// ==========================================================
// UNIT
// ==========================================================

function normalizeUnit(
    unit
) {

    const value =
        cleanText(
            unit
        );


    if (!value) {

        throw createError(
            "Unit is required."
        );

    }


    const units =
        getStockUnits();


    if (
        units.length > 0 &&
        !units.includes(
            value
        )
    ) {

        throw createError(
            `Invalid stock unit: ${value}.`
        );

    }


    return value;

}


// ==========================================================
// IMAGES
// ==========================================================

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


    return images

        .map(function(image) {

            if (
                typeof image === "string"
            ) {

                return image.trim();

            }


            if (
                image &&
                typeof image === "object"
            ) {

                return String(

                    image.secure_url ||
                    image.url ||
                    image.path ||
                    image.location ||
                    ""

                ).trim();

            }


            return "";

        })

        .filter(Boolean);

}


// ==========================================================
// FIND STOCK
// ==========================================================
//
// IMPORTANT:
//
// Searches ONLY:
//
//     dairy.feedStocks[]
//
// ==========================================================

function findStock(
    dairy,
    stockId
) {

    if (
        !dairy ||
        !Array.isArray(
            dairy.feedStocks
        )
    ) {

        return null;

    }


    const id =
        cleanText(
            stockId
        );


    if (!id) {

        return null;

    }


    return (

        dairy.feedStocks.find(
            function(stock) {

                return (

                    stock &&
                    String(
                        stock._id
                    ) === id

                );

            }
        )

        || null

    );

}


// ==========================================================
// FEEDS AMOUNT
// ==========================================================

function calculateFeedsAmount(
    quantity,
    unitPrice
) {

    const safeQuantity =
        toNumber(
            quantity
        );


    const safePrice =
        toNumber(
            unitPrice
        );


    if (
        !Number.isFinite(
            safeQuantity
        ) ||
        !Number.isFinite(
            safePrice
        )
    ) {

        return 0;

    }


    return roundNumber(
        safeQuantity *
        safePrice
    );

}


// ==========================================================
// PERCENTAGE
// ==========================================================

function calculatePercentageRemaining(
    quantityRemaining,
    initialQuantity
) {

    const remaining =
        toNumber(
            quantityRemaining
        );


    const initial =
        toNumber(
            initialQuantity
        );


    if (
        !Number.isFinite(
            remaining
        ) ||
        !Number.isFinite(
            initial
        ) ||
        initial <= 0
    ) {

        return 0;

    }


    return roundNumber(
        Math.max(
            0,
            (
                remaining /
                initial
            ) * 100
        )
    );

}


// ==========================================================
// VALIDATE NEW STOCK
// ==========================================================

function validateNewStock(
    data = {}
) {

    const category =
        normalizeCategory(
            data.category
        );


    const name =
        normalizeStockName(
            data,
            category
        );


    const quantity =
        normalizeQuantity(
            data.quantity,
            "Quantity"
        );


    const unit =
        normalizeUnit(
            data.unit
        );


    const price =
        normalizePrice(
            data.price
        );


    if (
        quantity > 0 &&
        price === null
    ) {

        throw createError(
            "Unit price is required when adding stock."
        );

    }


    return {

        name,

        category,

        quantity,

        unit,

        price,

        instructions:
            cleanText(
                data.instructions
            ),

        expectedDuration:
            cleanText(
                data.expectedDuration
            ),

        message:
            cleanText(
                data.message
            )

    };

}


// ==========================================================
// CREATE STOCK
// ==========================================================
//
// THIS IS THE IMPORTANT FIX.
//
// A new stock is created as a SUBDOCUMENT:
//
//     dairy.feedStocks.push(stock)
//
// It is NOT:
//
//     FeedStock.create()
//
// It is NOT:
//
//     Stock.create()
//
// ==========================================================

async function createStock({
    dairyId,
    data = {},
    images = []
}) {

    const dairy =
        await getDairy(
            dairyId
        );


    const input =
        validateNewStock(
            data
        );


    const unitPrice =
        input.price === null
            ? 0
            : input.price;


    const feedsAmount =
        calculateFeedsAmount(
            input.quantity,
            unitPrice
        );


    // ------------------------------------------------------
    // Build the actual feedStocks subdocument.
    // ------------------------------------------------------

    const stock = {

        name:
            input.name,


        category:
            input.category,


        feedName:
            input.category === "feed"
                ? input.name
                : "",


        medicineName:
            input.category === "medicine"
                ? input.name
                : "",


        unit:
            input.unit,


        quantityRemaining:
            input.quantity,


        initialQuantity:
            input.quantity,


        percentageRemaining:
            input.quantity > 0
                ? 100
                : 0,


        unitPrice:
            unitPrice,


        feedsAmount:
            feedsAmount,


        instructions:
            input.instructions,


        expectedDuration:
            input.expectedDuration,


        message:
            input.message,


        images:
            normalizeImages(
                images
            ),


        updatedAt:
            new Date()

    };


    // ------------------------------------------------------
    // THIS IS WHERE THE STOCK IS STORED.
    // ------------------------------------------------------

    dairy.feedStocks.push(
        stock
    );


    // ------------------------------------------------------
    // SAVE THE PARENT DAIRY DOCUMENT.
    // ------------------------------------------------------

    await dairy.save();


    // ------------------------------------------------------
    // Return the ACTUAL saved subdocument.
    // ------------------------------------------------------

    return dairy.feedStocks[
        dairy.feedStocks.length - 1
    ];

}


// ==========================================================
// UPDATE EXISTING STOCK
// ==========================================================

async function updateStock({
    dairyId,
    stockId,
    data = {},
    images = []
}) {

    const dairy =
        await getDairy(
            dairyId
        );


    const stock =
        findStock(
            dairy,
            stockId
        );


    if (!stock) {

        throw createError(
            "Stock item not found.",
            404
        );

    }


    const oldQuantity =
        Number(
            stock.quantityRemaining
        );


    const safeOldQuantity =
        Number.isFinite(
            oldQuantity
        )
            ? oldQuantity
            : 0;


    let newQuantity =
        safeOldQuantity;


    if (
        data.quantity !== undefined &&
        data.quantity !== ""
    ) {

        newQuantity =
            normalizeQuantity(
                data.quantity,
                "Quantity"
            );

    }


    const quantityDifference =
        roundNumber(
            newQuantity -
            safeOldQuantity
        );


    // ======================================================
    // QUANTITY INCREASE
    // ======================================================

    if (
        quantityDifference > 0
    ) {

        const price =
            normalizePrice(
                data.price
            );


        if (
            price === null
        ) {

            throw createError(
                "Unit price is required when increasing stock."
            );

        }


        stock.quantityRemaining =
            newQuantity;


        stock.unitPrice =
            price;


        stock.feedsAmount =
            calculateFeedsAmount(
                quantityDifference,
                price
            );

    }


    // ======================================================
    // QUANTITY DECREASE
    // ======================================================

    else if (
        quantityDifference < 0
    ) {

        stock.quantityRemaining =
            newQuantity;

    }


    // ======================================================
    // SAME QUANTITY
    // ======================================================

    else {

        stock.quantityRemaining =
            safeOldQuantity;

    }


    // ======================================================
    // NAME
    // ======================================================

    if (
        data.name !== undefined
    ) {

        const name =
            cleanText(
                data.name
            );


        if (!name) {

            throw createError(
                "Stock name cannot be empty."
            );

        }


        if (
            name.length > 150
        ) {

            throw createError(
                "Stock name cannot exceed 150 characters."
            );

        }


        stock.name =
            name;


        const category =
            cleanText(
                stock.category
            ).toLowerCase();


        if (
            category === "medicine"
        ) {

            stock.medicineName =
                name;

            stock.feedName =
                "";

        }

        else {

            stock.feedName =
                name;

            stock.medicineName =
                "";

        }

    }


    // ======================================================
    // INFORMATION
    // ======================================================

    if (
        data.instructions !== undefined
    ) {

        stock.instructions =
            cleanText(
                data.instructions
            );

    }


    if (
        data.expectedDuration !== undefined
    ) {

        stock.expectedDuration =
            cleanText(
                data.expectedDuration
            );

    }


    if (
        data.message !== undefined
    ) {

        stock.message =
            cleanText(
                data.message
            );

    }


    // ======================================================
    // IMAGES
    // ======================================================

    const newImages =
        normalizeImages(
            images
        );


    if (
        newImages.length > 0
    ) {

        if (
            !Array.isArray(
                stock.images
            )
        ) {

            stock.images = [];

        }


        stock.images.push(
            ...newImages
        );

    }


    // ======================================================
    // PERCENTAGE
    // ======================================================

    stock.percentageRemaining =
        calculatePercentageRemaining(
            stock.quantityRemaining,
            stock.initialQuantity
        );


    // ======================================================
    // TIMESTAMP
    // ======================================================

    touchStock(
        stock
    );


    // ======================================================
    // SAVE PARENT
    // ======================================================

    await dairy.save();


    return {

        stock,

        oldQuantity:
            safeOldQuantity,

        newQuantity,

        quantityDifference,

        quantityIncreased:
            quantityDifference > 0,

        quantityDecreased:
            quantityDifference < 0,

        quantityAdded:
            quantityDifference > 0
                ? quantityDifference
                : 0,

        feedsAmount:
            quantityDifference > 0
                ? Number(
                    stock.feedsAmount || 0
                )
                : 0

    };

}


// ==========================================================
// RESTOCK EXISTING STOCK
// ==========================================================
//
// Restock is ADDITIVE.
//
//     old quantity + added quantity = new quantity
//
// ==========================================================

async function restockStock({
    dairyId,
    stockId,
    data = {},
    images = []
}) {

    const dairy =
        await getDairy(
            dairyId
        );


    const stock =
        findStock(
            dairy,
            stockId
        );


    if (!stock) {

        throw createError(
            "Stock item not found.",
            404
        );

    }


    const quantityAdded =
        normalizePositiveQuantity(

            data.quantityAdded !== undefined
                ? data.quantityAdded
                : data.quantity,

            "Restock quantity"

        );


    const price =
        normalizePrice(
            data.price
        );


    if (
        price === null
    ) {

        throw createError(
            "Unit price is required when restocking."
        );

    }


    const oldQuantity =
        Number(
            stock.quantityRemaining
        );


    const safeOldQuantity =
        Number.isFinite(
            oldQuantity
        )
            ? oldQuantity
            : 0;


    const newQuantity =
        roundNumber(
            safeOldQuantity +
            quantityAdded
        );


    const feedsAmount =
        calculateFeedsAmount(
            quantityAdded,
            price
        );


    // ------------------------------------------------------
    // UPDATE THE EXISTING SUBDOCUMENT.
    // ------------------------------------------------------

    stock.quantityRemaining =
        newQuantity;


    stock.unitPrice =
        price;


    stock.feedsAmount =
        feedsAmount;


    stock.percentageRemaining =
        calculatePercentageRemaining(
            newQuantity,
            stock.initialQuantity
        );


    // ======================================================
    // OPTIONAL INFORMATION
    // ======================================================

    if (
        data.instructions !== undefined
    ) {

        stock.instructions =
            cleanText(
                data.instructions
            );

    }


    if (
        data.expectedDuration !== undefined
    ) {

        stock.expectedDuration =
            cleanText(
                data.expectedDuration
            );

    }


    if (
        data.message !== undefined
    ) {

        stock.message =
            cleanText(
                data.message
            );

    }


    // ======================================================
    // IMAGES
    // ======================================================

    const newImages =
        normalizeImages(
            images
        );


    if (
        newImages.length > 0
    ) {

        if (
            !Array.isArray(
                stock.images
            )
        ) {

            stock.images = [];

        }


        stock.images.push(
            ...newImages
        );

    }


    touchStock(
        stock
    );


    // ======================================================
    // SAVE PARENT DAIRY
    // ======================================================

    await dairy.save();


    return {

        stock,

        oldQuantity:
            safeOldQuantity,

        quantityAdded,

        newQuantity,

        unitPrice:
            price,

        feedsAmount,

        quantityIncreased:
            true

    };

}


// ==========================================================
// SAVE STOCK
// ==========================================================
//
// Compatibility wrapper.
//
// ==========================================================

async function saveStock({
    dairyId,
    stockId,
    data = {},
    images = []
}) {

    if (!stockId) {

        return createStock({

            dairyId,

            data,

            images

        });

    }


    return updateStock({

        dairyId,

        stockId,

        data,

        images

    });

}


// ==========================================================
// GET ALL STOCK
// ==========================================================

async function getStocks(
    dairyId
) {

    const dairy =
        await getDairy(
            dairyId
        );


    return Array.isArray(
        dairy.feedStocks
    )
        ? dairy.feedStocks
        : [];

}


// ==========================================================
// GET ONE STOCK
// ==========================================================

async function getStock({
    dairyId,
    stockId
}) {

    const dairy =
        await getDairy(
            dairyId
        );


    const stock =
        findStock(
            dairy,
            stockId
        );


    if (!stock) {

        throw createError(
            "Stock item not found.",
            404
        );

    }


    return stock;

}


// ==========================================================
// DELETE STOCK
// ==========================================================

async function deleteStock({
    dairyId,
    stockId
}) {

    const dairy =
        await getDairy(
            dairyId
        );


    const stock =
        findStock(
            dairy,
            stockId
        );


    if (!stock) {

        throw createError(
            "Stock item not found.",
            404
        );

    }


    const index =
        dairy.feedStocks.findIndex(
            function(item) {

                return (

                    String(
                        item._id
                    ) ===
                    String(
                        stock._id
                    )

                );

            }
        );


    if (
        index === -1
    ) {

        throw createError(
            "Stock item not found.",
            404
        );

    }


    const deletedStock =
        dairy.feedStocks[
            index
        ];


    dairy.feedStocks.splice(
        index,
        1
    );


    await dairy.save();


    return deletedStock;

}


// ==========================================================
// SUMMARY
// ==========================================================

async function getStockSummary(
    dairyId
) {

    const stocks =
        await getStocks(
            dairyId
        );


    const feedStocks =
        stocks.filter(
            function(stock) {

                return (
                    stock.category ===
                    "feed"
                );

            }
        );


    const medicineStocks =
        stocks.filter(
            function(stock) {

                return (
                    stock.category ===
                    "medicine"
                );

            }
        );


    const totalFeedsAmount =
        stocks.reduce(
            function(
                total,
                stock
            ) {

                return (

                    total +

                    Math.max(
                        0,
                        Number(
                            stock.feedsAmount
                        ) || 0
                    )

                );

            },
            0
        );


    return {

        stocks,

        feedStocks,

        medicineStocks,

        totalStocks:
            stocks.length,

        totalFeedStocks:
            feedStocks.length,

        totalMedicineStocks:
            medicineStocks.length,

        totalFeedsAmount:
            roundNumber(
                totalFeedsAmount
            )

    };

}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    // Dairy
    getDairy,

    // Options
    getFeedTypes,
    getVeterinaryMedicines,
    getStockUnits,
    getStorageOptions,

    // Retrieval
    getStocks,
    getStock,

    // Operations
    createStock,
    updateStock,
    restockStock,
    saveStock,
    deleteStock,

    // Helpers
    findStock,
    validateNewStock,
    calculateFeedsAmount,
    calculatePercentageRemaining,

    // Summary
    getStockSummary

};