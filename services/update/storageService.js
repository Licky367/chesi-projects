// ==========================================================
// services/update/storageService.js
// ==========================================================
//
// FEED STORE / STORAGE SERVICE
//
// RESPONSIBILITIES:
//
//     • Create feed / veterinary medicine stock
//     • Update existing stock
//     • Restock
//     • Reduce stock
//     • Delete stock
//     • Retrieve current stock
//     • Provide feed-store dropdown options
//
// BUSINESS RULES:
//
// quantityRemaining
//      = quantity currently available in stock
//
// unitPrice
//      = price of ONE unit for the latest stock addition
//
// feedsAmount
//      = actual money spent on the latest stock addition
//
// NEW STOCK:
//
//      feedsAmount = quantity × unitPrice
//
// RESTOCK:
//
//      feedsAmount = quantityAdded × unitPrice
//
// REDUCTION:
//
//      feedsAmount does NOT change
//
// SAME QUANTITY:
//
//      feedsAmount does NOT change
//
// IMPORTANT:
//
// The service uses the canonical feed-store fields:
//
//      category
//      feedName
//      medicineName
//      unit
//      quantityRemaining
//      initialQuantity
//      percentageRemaining
//      unitPrice
//      feedsAmount
//      instructions
//      expectedDuration
//      message
//      images
//
// ==========================================================


const mongoose =
    require("mongoose");

const Dairy =
    require("../../models/dairy");


// ==========================================================
// HELPERS
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


function isValidObjectId(
    value
) {

    return mongoose.Types.ObjectId.isValid(
        String(value || "")
    );

}


function cleanText(
    value
) {

    if (
        value === undefined ||
        value === null
    ) {

        return "";

    }

    return String(value).trim();

}


function toNumber(
    value
) {

    const number =
        Number(value);

    return Number.isFinite(number)
        ? number
        : NaN;

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
// GET FEED STORE OPTIONS
// ==========================================================
//
// These options come directly from models/dairy.js.
//
// This keeps the service and the model synchronized.
//
// Available:
//
//     feeds
//     veterinary medicines
//     stock units
//
// ==========================================================

function getFeedTypes() {

    return Dairy.getFeedTypes();

}


function getVeterinaryMedicines() {

    return Dairy.getVeterinaryMedicines();

}


function getStockUnits() {

    return Dairy.getStockUnits();

}


// ==========================================================
// GET ALL STORAGE OPTIONS
// ==========================================================
//
// Convenient single object for the controller.
//
// Example:
//
// const options =
//     storageService.getStorageOptions();
//
// Then:
//
// options.feedTypes
// options.veterinaryMedicines
// options.stockUnits
//
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
    value
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
            "Quantity must be a valid number."
        );

    }


    if (
        quantity < 0
    ) {

        throw createError(
            "Quantity cannot be negative."
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


    return price;

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
// CALCULATE STOCK AMOUNT
// ==========================================================
//
// Actual money spent on a stock addition.
//
// quantityAdded × unitPrice
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
        !Number.isFinite(quantity) ||
        !Number.isFinite(price)
    ) {

        return 0;

    }


    return quantity * price;

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
        !stockId
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
            data.quantity
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
     * Positive initial stock requires
     * a unit price.
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
// Creates a completely new feed-store item.
//
// ==========================================================

async function createStock({
    dairyId,
    data,
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
            )

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
// CATEGORY / NAME / UNIT:
//
// These identify the stock item and are not changed.
//
// QUANTITY:
//
// Can increase, decrease, or remain unchanged.
//
// PRICE:
//
// Required only when quantity increases.
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
            data.quantity
        );


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


    const quantityDifference =
        newQuantity -
        safeOldQuantity;


    // ======================================================
    // INCREASE / RESTOCK
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


        const quantityAdded =
            quantityDifference;


        const feedsAmount =
            calculateFeedsAmount(
                quantityAdded,
                price
            );


        stock.quantityRemaining =
            newQuantity;


        /*
         * The latest stock addition determines
         * the current unit price.
         */

        stock.unitPrice =
            price;


        /*
         * Financial amount belongs to
         * THIS stock addition.
         */

        stock.feedsAmount =
            feedsAmount;

    }


    // ======================================================
    // DECREASE
    // ======================================================

    else if (
        quantityDifference < 0
    ) {

        /*
         * Reduction is not a purchase.
         *
         * Therefore:
         *
         * quantityRemaining changes
         *
         * unitPrice stays unchanged
         *
         * feedsAmount stays unchanged
         */

        stock.quantityRemaining =
            newQuantity;

    }


    // ======================================================
    // SAME QUANTITY
    // ======================================================

    else {

        /*
         * Nothing was added.
         *
         * Nothing financial changes.
         */

        stock.quantityRemaining =
            safeOldQuantity;

    }


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
// SAVE STOCK
// ==========================================================
//
// stockId supplied:
//
//      UPDATE EXISTING STOCK
//
// stockId absent:
//
//      CREATE NEW STOCK
//
// ==========================================================

async function saveStock({
    dairyId,
    stockId,
    data,
    images = []
}) {

    if (
        stockId
    ) {

        return updateStock({

            dairyId,

            stockId,

            data,

            images

        });

    }


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


    const feedsAmount =
        Number(
            stock.feedsAmount || 0
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

        feedsAmount

    };

}


// ==========================================================
// GET CURRENT STOCKS
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
//
// Useful for the controller / page.
//
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

            (
                total,
                stock
            ) => {

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

        totalFeedsAmount

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
    // DROPDOWN / SELECT OPTIONS
    // ======================================================

    getFeedTypes,

    getVeterinaryMedicines,

    getStockUnits,

    getStorageOptions,


    // ======================================================
    // STOCK
    // ======================================================

    getStocks,

    getStock,

    createStock,

    updateStock,

    saveStock,

    deleteStock,


    // ======================================================
    // HELPERS
    // ======================================================

    findStock,

    validateNewStock,

    calculateFeedsAmount,


    // ======================================================
    // SUMMARY
    // ======================================================

    getStockSummary

};