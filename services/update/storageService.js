// ==========================================================
// services/update/storageService.js
// ==========================================================
//
// FEED STORE / STORAGE SERVICE
//
// BUSINESS RULES ARE DERIVED FROM:
//
// views/update/storage/feed-store.js
//
// The service is deliberately written for the NEW schema
// that we are going to create next.
//
// ==========================================================

const mongoose = require("mongoose");

const Dairy = require("../../models/dairy");


// ==========================================================
// HELPERS
// ==========================================================

function createError(message, statusCode = 400) {

    const error =
        new Error(message);

    error.statusCode =
        statusCode;

    return error;
}


function isValidObjectId(value) {

    return mongoose.Types.ObjectId.isValid(
        String(value || "")
    );

}


function cleanText(value) {

    if (
        value === undefined ||
        value === null
    ) {

        return "";

    }

    return String(value).trim();

}


function toNumber(value) {

    const number =
        Number(value);

    return Number.isFinite(number)
        ? number
        : NaN;

}


// ==========================================================
// GET DAIRY
// ==========================================================

async function getDairy(dairyId) {

    if (
        !isValidObjectId(dairyId)
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
// NORMALIZE CATEGORY
// ==========================================================

function normalizeCategory(category) {

    const value =
        cleanText(category).toLowerCase();


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

function normalizeQuantity(value) {

    const quantity =
        toNumber(value);


    if (
        !Number.isFinite(quantity)
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

function normalizePrice(value) {

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {

        return null;

    }


    const price =
        toNumber(value);


    if (
        !Number.isFinite(price)
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
// STOCK NAME
// ==========================================================

function getStockName(stock) {

    if (
        stock.category === "medicine"
    ) {

        return cleanText(
            stock.medicineName
        );

    }


    return cleanText(
        stock.feedName
    );

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


    return dairy.feedStocks.find(
        function(stock) {

            return String(
                stock._id
            ) === String(
                stockId
            );

        }
    ) || null;

}


// ==========================================================
// VALIDATE NEW STOCK
// ==========================================================

function validateNewStock(data) {

    const category =
        normalizeCategory(
            data.category
        );


    const quantity =
        normalizeQuantity(
            data.quantity
        );


    const unit =
        cleanText(
            data.unit
        );


    if (!unit) {

        throw createError(
            "Unit is required."
        );

    }


    const feedName =
        cleanText(
            data.feedName
        );


    const medicineName =
        cleanText(
            data.medicineName
        );


    if (
        category === "feed" &&
        !feedName
    ) {

        throw createError(
            "Animal feed is required."
        );

    }


    if (
        category === "medicine" &&
        !medicineName
    ) {

        throw createError(
            "Veterinary medicine is required."
        );

    }


    const price =
        normalizePrice(
            data.price
        );


    /*
     * The view only reveals Unit Price when
     * new quantity > 0.
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

        feedName:
            category === "feed"
                ? feedName
                : "",

        medicineName:
            category === "medicine"
                ? medicineName
                : "",

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

        unitPrice:
            input.price || 0,

        instructions:
            input.instructions,

        expectedDuration:
            input.expectedDuration,

        message:
            input.message,

        images:
            Array.isArray(images)
                ? images
                : []

    };


    dairy.feedStocks.push(
        stock
    );


    await dairy.save();


    const createdStock =
        dairy.feedStocks[
            dairy.feedStocks.length - 1
        ];


    return createdStock;

}


// ==========================================================
// UPDATE EXISTING STOCK
// ==========================================================
//
// The view locks:
//
// - category
// - feed / medicine name
// - unit
//
// Quantity remains editable.
//
// Price is only relevant when:
//
// new quantity > original quantity
//
// ==========================================================

async function updateStock({
    dairyId,
    stockId,
    data,
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
        Number.isFinite(oldQuantity)
            ? oldQuantity
            : 0;


    const quantityDifference =
        newQuantity -
        safeOldQuantity;



    // ======================================================
    // INCREASE
    // ======================================================

    if (
        quantityDifference > 0
    ) {

        const price =
            normalizePrice(
                data.price
            );


        /*
         * The view makes price mandatory whenever
         * existing quantity is increased.
         */

        if (
            price === null
        ) {

            throw createError(
                "Unit price is required when increasing stock."
            );

        }


        /*
         * Current available quantity becomes
         * the new quantity.
         */

        stock.quantityRemaining =
            newQuantity;


        /*
         * The latest unit price represents the
         * latest restock price.
         */

        stock.unitPrice =
            price;

    }



    // ======================================================
    // DECREASE
    // ======================================================

    else if (
        quantityDifference < 0
    ) {

        /*
         * Reducing quantity is NOT a restock.
         *
         * Therefore the existing unit price remains
         * untouched.
         */

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

    if (
        Array.isArray(images) &&
        images.length
    ) {

        if (
            !Array.isArray(
                stock.images
            )
        ) {

            stock.images = [];

        }


        stock.images.push(
            ...images
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
                : 0

    };

}


// ==========================================================
// SAVE STOCK
// ==========================================================
//
// This matches the view:
//
// stockId empty
//      → NEW STOCK
//
// stockId supplied
//      → EXISTING STOCK
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


    return {

        stock,

        oldQuantity:
            0,

        newQuantity:
            stock.quantityRemaining,

        quantityDifference:
            stock.quantityRemaining,

        quantityIncreased:
            stock.quantityRemaining > 0,

        quantityDecreased:
            false,

        quantityAdded:
            stock.quantityRemaining

    };

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


    const index =
        dairy.feedStocks.findIndex(
            function(stock) {

                return String(
                    stock._id
                ) === String(
                    stockId
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
// EXPORTS
// ==========================================================

module.exports = {

    getDairy,

    getStocks,

    getStock,

    createStock,

    updateStock,

    saveStock,

    deleteStock,

    findStock,

    validateNewStock

};