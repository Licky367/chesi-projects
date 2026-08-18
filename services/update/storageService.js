// ==========================================================
// services/update/storageService.js
// ==========================================================
//
// FEED STORE / STORAGE SERVICE
//
// RESPONSIBILITIES:
//
//     • Create new feed / veterinary medicine stock
//     • Update existing stock
//     • Restock existing stock
//     • Reduce stock
//     • Delete stock
//     • Retrieve current stock
//     • Provide feed-store dropdown options
//     • Maintain stock percentage remaining
//     • Maintain latest stock financial information
//
// CANONICAL FEED-STORE FIELDS:
//
//     category
//     feedName
//     medicineName
//     unit
//     quantityRemaining
//     initialQuantity
//     percentageRemaining
//     unitPrice
//     feedsAmount
//     instructions
//     expectedDuration
//     message
//     images
//     updatedAt
//
// ==========================================================


const mongoose =
    require("mongoose");


const Dairy =
    require("../../models/dairy");


// ==========================================================
// HELPERS
// ==========================================================


// ==========================================================
// CREATE ERROR
// ==========================================================

function createError(
    message,
    statusCode = 400
) {

    const error =
        new Error(message);

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
        String(value || "")
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
        Number(value);


    return Number.isFinite(
        number
    )
        ? number
        : NaN;

}


// ==========================================================
// ROUND NUMBER
// ==========================================================
//
// Keeps stored financial/quantity percentages reasonably
// clean without unnecessarily changing the actual quantity.
//
// ==========================================================

function roundNumber(
    value,
    decimals = 2
) {

    const number =
        Number(value);


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
// UPDATE TIMESTAMP
// ==========================================================
//
// Explicitly maintains the timestamp used by the stock list.
//
// This means feed-stock.ejs can safely display:
//
//     Last updated
//
// regardless of whether the feedStocks sub-schema itself
// has timestamps enabled.
//
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

async function getDairy(
    dairyId
) {

    if (
        !isValidObjectId(
            dairyId
        )
    ) {

        throw createError(
            "Invalid dairy ID.",
            400
        );

    }


    const dairy =
        await Dairy.findById(
            dairyId
        );


    if (!dairy) {

        throw createError(
            "Dairy not found.",
            404
        );

    }


    return dairy;

}


// ==========================================================
// GET FEED TYPES
// ==========================================================

function getFeedTypes() {

    if (
        typeof Dairy.getFeedTypes ===
        "function"
    ) {

        return Dairy.getFeedTypes();

    }


    return [];

}


// ==========================================================
// GET VETERINARY MEDICINES
// ==========================================================

function getVeterinaryMedicines() {

    if (
        typeof Dairy.getVeterinaryMedicines ===
        "function"
    ) {

        return Dairy.getVeterinaryMedicines();

    }


    return [];

}


// ==========================================================
// GET STOCK UNITS
// ==========================================================

function getStockUnits() {

    if (
        typeof Dairy.getStockUnits ===
        "function"
    ) {

        return Dairy.getStockUnits();

    }


    return [];

}


// ==========================================================
// GET STORAGE OPTIONS
// ==========================================================

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
// NORMALIZE CATEGORY
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
            "Stock type must be either feed or medicine."
        );

    }


    return value;

}


// ==========================================================
// NORMALIZE QUANTITY
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


// ==========================================================
// NORMALIZE POSITIVE QUANTITY
// ==========================================================

function normalizePositiveQuantity(
    value,
    fieldName
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
// NORMALIZE PRICE
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
// NORMALIZE UNIT
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
        units.length &&
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
// VALIDATE FEED NAME
// ==========================================================

function validateFeedName(
    feedName
) {

    const value =
        cleanText(
            feedName
        );


    if (!value) {

        throw createError(
            "Animal feed is required."
        );

    }


    const feedTypes =
        getFeedTypes();


    if (
        feedTypes.length &&
        !feedTypes.includes(
            value
        )
    ) {

        throw createError(
            `Invalid animal feed: ${value}.`
        );

    }


    return value;

}


// ==========================================================
// VALIDATE VETERINARY MEDICINE
// ==========================================================

function validateVeterinaryMedicine(
    medicineName
) {

    const value =
        cleanText(
            medicineName
        );


    if (!value) {

        throw createError(
            "Veterinary medicine is required."
        );

    }


    const medicines =
        getVeterinaryMedicines();


    if (
        medicines.length &&
        !medicines.includes(
            value
        )
    ) {

        throw createError(
            `Invalid veterinary medicine: ${value}.`
        );

    }


    return value;

}


// ==========================================================
// FIND STOCK
// ==========================================================

function findStock(
    dairy,
    stockId
) {

    if (
        !stockId ||
        !Array.isArray(
            dairy.feedStocks
        )
    ) {

        return null;

    }


    return (

        dairy.feedStocks.find(

            function(stock) {

                return (

                    String(
                        stock._id
                    ) ===
                    String(
                        stockId
                    )

                );

            }

        ) || null

    );

}


// ==========================================================
// NORMALIZE IMAGES
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

        .filter(Boolean)

        .map(
            image =>
                String(
                    image
                ).trim()
        )

        .filter(Boolean);

}


// ==========================================================
// CALCULATE FEEDS AMOUNT
// ==========================================================
//
// Money spent on the CURRENT stock addition:
//
//     quantityAdded × unitPrice
//
// ==========================================================

function calculateFeedsAmount(
    quantityAdded,
    unitPrice
) {

    const quantity =
        toNumber(
            quantityAdded
        );


    const price =
        toNumber(
            unitPrice
        );


    if (
        !Number.isFinite(
            quantity
        ) ||
        !Number.isFinite(
            price
        )
    ) {

        return 0;

    }


    return roundNumber(
        quantity * price
    );

}


// ==========================================================
// CALCULATE PERCENTAGE REMAINING
// ==========================================================
//
// Based on:
//
//     quantityRemaining
//     initialQuantity
//
// Example:
//
//     initial = 100
//     remaining = 75
//
//     percentageRemaining = 75%
//
// IMPORTANT:
//
// Restocking increases the stock quantity but does NOT
// replace the original initialQuantity.
//
// Therefore percentageRemaining remains based on the
// original stock quantity.
//
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
        )
    ) {

        return 0;

    }


    if (
        initial <= 0
    ) {

        return 0;

    }


    const percentage =
        (
            remaining /
            initial
        ) * 100;


    return roundNumber(
        Math.max(
            0,
            percentage
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


    const quantity =
        normalizeQuantity(
            data.quantity,
            "Quantity"
        );


    const unit =
        normalizeUnit(
            data.unit
        );


    let feedName =
        "";

    let medicineName =
        "";


    // ======================================================
    // FEED
    // ======================================================

    if (
        category === "feed"
    ) {

        feedName =
            validateFeedName(
                data.feedName
            );

    }


    // ======================================================
    // MEDICINE
    // ======================================================

    if (
        category === "medicine"
    ) {

        medicineName =
            validateVeterinaryMedicine(
                data.medicineName
            );

    }


    const price =
        normalizePrice(
            data.price
        );


    /*
     * Positive stock requires a price.
     */

    if (
        quantity > 0 &&
        price === null
    ) {

        throw createError(
            "Unit price is required when adding stock."
        );

    }


    return {

        category,

        feedName,

        medicineName,

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
// USED BY:
//
//     add-stock.ejs
//
// This creates an entirely new inventory item.
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
        input.price !== null
            ? input.price
            : 0;


    const feedsAmount =
        calculateFeedsAmount(
            input.quantity,
            unitPrice
        );


    const stock = {

        category:
            input.category,

        feedName:
            input.feedName,

        medicineName:
            input.medicineName,

        unit:
            input.unit,

        quantityRemaining:
            input.quantity,

        initialQuantity:
            input.quantity,

        percentageRemaining:
            calculatePercentageRemaining(
                input.quantity,
                input.quantity
            ),

        unitPrice,

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


    dairy.feedStocks.push(
        stock
    );


    await dairy.save();


    return dairy.feedStocks[
        dairy.feedStocks.length - 1
    ];

}


// ==========================================================
// UPDATE EXISTING STOCK
// ==========================================================
//
// USED BY:
//
//     update-stock.ejs
//
// Behaviour:
//
//     new quantity > old quantity
//         → stock increase
//         → price required
//         → feedsAmount changes
//
//     new quantity < old quantity
//         → stock reduction
//         → price unchanged
//         → feedsAmount unchanged
//
//     new quantity === old quantity
//         → informational update only
//         → price unchanged
//         → feedsAmount unchanged
//
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


    const newQuantity =
        normalizeQuantity(
            data.quantity,
            "Quantity"
        );


    const oldQuantity =
        toNumber(
            stock.quantityRemaining
        );


    const safeOldQuantity =
        Number.isFinite(
            oldQuantity
        )
            ? oldQuantity
            : 0;


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
    // QUANTITY REDUCTION
    // ======================================================

    else if (
        quantityDifference < 0
    ) {

        stock.quantityRemaining =
            newQuantity;

        /*
         * IMPORTANT:
         *
         * Do NOT change:
         *
         *     stock.unitPrice
         *     stock.feedsAmount
         *
         * A reduction is consumption, not a purchase.
         */

    }


    // ======================================================
    // SAME QUANTITY
    // ======================================================

    else {

        stock.quantityRemaining =
            safeOldQuantity;

        /*
         * No financial change.
         */

    }


    // ======================================================
    // PERCENTAGE REMAINING
    // ======================================================

    stock.percentageRemaining =
        calculatePercentageRemaining(
            stock.quantityRemaining,
            stock.initialQuantity
        );


    // ======================================================
    // INFORMATION
    // ======================================================

    stock.instructions =
        cleanText(
            data.instructions
        );


    stock.expectedDuration =
        cleanText(
            data.expectedDuration
        );


    stock.message =
        cleanText(
            data.message
        );


    // ======================================================
    // IMAGES
    // ======================================================

    const newImages =
        normalizeImages(
            images
        );


    if (
        newImages.length
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
    // LAST UPDATED
    // ======================================================

    touchStock(
        stock
    );


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
// USED BY:
//
//     restock-stock.ejs
//
// Unlike updateStock(), restocking does NOT ask the user
// for the new total quantity.
//
// It receives:
//
//     quantityAdded
//
// and calculates:
//
//     newQuantity = oldQuantity + quantityAdded
//
// The purchase amount is:
//
//     quantityAdded × unitPrice
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
        toNumber(
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


    // ======================================================
    // UPDATE QUANTITY
    // ======================================================

    stock.quantityRemaining =
        newQuantity;


    // ======================================================
    // LATEST PURCHASE PRICE
    // ======================================================

    stock.unitPrice =
        price;


    // ======================================================
    // LATEST PURCHASE AMOUNT
    // ======================================================

    stock.feedsAmount =
        feedsAmount;


    // ======================================================
    // PERCENTAGE REMAINING
    // ======================================================
    //
    // initialQuantity remains the original stock quantity.
    //
    // This allows the percentage to exceed 100% if a stock
    // is replenished beyond its original amount.
    //
    // ======================================================

    stock.percentageRemaining =
        calculatePercentageRemaining(
            stock.quantityRemaining,
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
        newImages.length
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
    // LAST UPDATED
    // ======================================================

    touchStock(
        stock
    );


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
// COMPATIBILITY WRAPPER.
//
// New pages should preferably call:
//
//     createStock()
//     updateStock()
//     restockStock()
//
// directly.
//
// This method remains available for older routes/controllers.
//
// ==========================================================

async function saveStock({
    dairyId,
    stockId,
    data = {},
    images = []
}) {

    // ======================================================
    // NEW STOCK
    // ======================================================

    if (
        !stockId
    ) {

        const stock =
            await createStock({

                dairyId,

                data,

                images

            });


        const quantity =
            Number(
                stock.quantityRemaining || 0
            );


        return {

            stock,

            oldQuantity:
                0,

            newQuantity:
                quantity,

            quantityDifference:
                quantity,

            quantityIncreased:
                quantity > 0,

            quantityDecreased:
                false,

            quantityAdded:
                quantity,

            feedsAmount:
                Number(
                    stock.feedsAmount || 0
                )

        };

    }


    // ======================================================
    // EXISTING STOCK
    // ======================================================

    return updateStock({

        dairyId,

        stockId,

        data,

        images

    });

}


// ==========================================================
// GET STOCKS
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


    if (
        !Array.isArray(
            dairy.feedStocks
        )
    ) {

        throw createError(
            "Stock item not found.",
            404
        );

    }


    const index =
        dairy.feedStocks.findIndex(

            function(stock) {

                return (

                    String(
                        stock._id
                    ) ===
                    String(
                        stockId
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
// GET STOCK SUMMARY
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
            stock =>
                stock.category === "feed"
        );


    const medicineStocks =
        stocks.filter(
            stock =>
                stock.category === "medicine"
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

    // ======================================================
    // DAIRY
    // ======================================================

    getDairy,


    // ======================================================
    // DROPDOWN OPTIONS
    // ======================================================

    getFeedTypes,

    getVeterinaryMedicines,

    getStockUnits,

    getStorageOptions,


    // ======================================================
    // STOCK RETRIEVAL
    // ======================================================

    getStocks,

    getStock,


    // ======================================================
    // STOCK OPERATIONS
    // ======================================================

    createStock,

    updateStock,

    restockStock,

    saveStock,

    deleteStock,


    // ======================================================
    // HELPERS
    // ======================================================

    findStock,

    validateNewStock,

    calculateFeedsAmount,

    calculatePercentageRemaining,


    // ======================================================
    // SUMMARY
    // ======================================================

    getStockSummary

};