// ==========================================================
// services/update/storageService.js
// =========================================================
//
// FEED STORE / STORAGE SERVICE
//
// BUSINESS RULES ARE DERIVED FROM:
//
// views/update/storage/feed-store.js
//
// IMPORTANT:
//
// quantityRemaining
//      = quantity currently available in stock
//
// unitPrice
//      = price of ONE unit for the latest stock addition
//
// feedsAmount
//      = actual amount of money used for the stock addition
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
//      feedsAmount is NOT changed
//
// SAME QUANTITY:
//
//      feedsAmount is NOT changed
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
// CALCULATE STOCK AMOUNT
// ==========================================================
//
// This is the actual monetary amount used for a stock
// addition.
//
// quantityAdded × unitPrice
//
// Example:
//
// 20 kg × KES 90/kg
// = KES 1,800
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
// STOCK NAME
// ==========================================================

function getStockName(
    stock
) {

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

function validateNewStock(
    data
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
     * The view reveals Unit Price when
     * quantity > 0.
     *
     * Therefore a positive initial quantity
     * requires a valid unit price.
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
//
// NEW STOCK
//
// feedsAmount represents the actual money used to acquire
// the initial quantity.
//
// Example:
//
// quantity = 100
// price    = 80
//
// feedsAmount = 100 × 80
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

        unitPrice:
            unitPrice,

        /*
         * Money actually spent on this
         * initial stock addition.
         */

        feedsAmount:
            feedsAmount,

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
// PRICE:
//
// Only required when:
//
// new quantity > old quantity
//
// FEEDS AMOUNT:
//
// Only changes when stock is increased.
//
// quantityAdded:
//
//      newQuantity - oldQuantity
//
// feedsAmount:
//
//      quantityAdded × new unitPrice
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


        /*
         * Price is mandatory whenever
         * existing stock is increased.
         */

        if (
            price === null
        ) {

            throw createError(
                "Unit price is required when increasing stock."
            );

        }


        /*
         * The quantity being purchased/restocked
         * is ONLY the difference.
         *
         * Example:
         *
         * old = 100
         * new = 120
         *
         * added = 20
         */

        const quantityAdded =
            quantityDifference;


        /*
         * This is the actual money used
         * for THIS restock.
         */

        const feedsAmount =
            calculateFeedsAmount(
                quantityAdded,
                price
            );


        /*
         * Current available stock becomes
         * the new total quantity.
         */

        stock.quantityRemaining =
            newQuantity;


        /*
         * Latest restock unit price.
         */

        stock.unitPrice =
            price;


        /*
         * Amount spent on THIS restock.
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
         * Reducing stock is NOT a purchase.
         *
         * Therefore:
         *
         * - quantityRemaining changes
         * - unitPrice remains unchanged
         * - feedsAmount remains unchanged
         */

        stock.quantityRemaining =
            newQuantity;

    }



    // ======================================================
    // SAME QUANTITY
    // ======================================================

    else {

        /*
         * No stock was added.
         *
         * Therefore no financial amount is created.
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
                : 0,

        /*
         * Amount spent on this particular
         * stock addition.
         */

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

        feedsAmount:
            feedsAmount

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

    validateNewStock,

    calculateFeedsAmount

};