// ==========================================================
// services/update/storageService.js
// ==========================================================
//
// STORAGE / STOCK SERVICE
//
// IMPORTANT
// ----------------------------------------------------------
//
// FeedStock model has been DISCARDED.
//
// THERE IS NO:
//     models/feedStock.js
//
// THERE IS NO:
//     FeedStock model
//
// THERE IS NO:
//     independent FeedStock collection
//
// STOCK IS EMBEDDED INSIDE THE DAIRY DOCUMENT.
//
// ==========================================================
//
// STORAGE FACILITY
// ----------------------------------------------------------
//
// A storage facility is a Dairy document where:
//
//     code          = null
//     assetCode     = null
//     storageNumber = negative Dairy Farm code
//
// Example:
//
//     storageNumber = -1
//
// means:
//
//     Storage belonging to Dairy Farm code -1.
//
// ==========================================================
//
// EMBEDDED STOCK
// ----------------------------------------------------------
//
// Stock is stored inside:
//
//     Dairy.storageStocks[]
//
// Canonical stock identity:
//
//     stock._id
//
// Canonical stock name:
//
//     stock.name
//
// Category:
//
//     feed
//     medicine
//
// ==========================================================


const mongoose =
    require("mongoose");


const Dairy =
    require("../../models/dairy");


// ==========================================================
// DEFAULT OPTIONS
// ==========================================================

const DEFAULT_FEED_TYPES = [

    "hay",
    "silage",
    "grass",
    "maize",
    "maizeBran",
    "wheatBran",
    "dairyMeal",
    "calfStarter",
    "mineralSupplement",
    "other"

];


const DEFAULT_VETERINARY_MEDICINES = [

    "antibiotic",
    "dewormer",
    "vaccine",
    "vitamin",
    "mineral",
    "anti-inflammatory",
    "other"

];


const DEFAULT_STOCK_UNITS = [

    "kg",
    "g",
    "litre",
    "ml",
    "bag",
    "bale",
    "packet",
    "bottle",
    "container",
    "piece",
    "unit"

];


// ==========================================================
// ERROR
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

    return String(value).trim();

}


// ==========================================================
// NUMBER
// ==========================================================

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
// ROUND
// ==========================================================

function roundNumber(
    value,
    decimals = 2
) {

    const number =
        Number(value);

    if (
        !Number.isFinite(number)
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
// VALID OBJECT ID
// ==========================================================

function isValidObjectId(
    value
) {

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {

        return false;

    }

    return mongoose.Types.ObjectId.isValid(
        String(value)
    );

}


// ==========================================================
// NORMALIZE OBJECT ID
// ==========================================================

function normalizeObjectId(
    value
) {

    if (
        value instanceof mongoose.Types.ObjectId
    ) {

        return value;

    }

    if (
        !isValidObjectId(value)
    ) {

        return null;

    }

    return new mongoose.Types.ObjectId(
        String(value)
    );

}


// ==========================================================
// GET STORAGE FACILITY
// ==========================================================
//
// dairyId MUST refer to the Dairy document representing
// the storage facility.
//
// ==========================================================

async function getDairy(
    dairyId
) {

    const id =
        cleanText(dairyId);

    if (!id) {

        throw createError(
            "Storage facility ID is required.",
            400
        );

    }

    if (
        !isValidObjectId(id)
    ) {

        throw createError(
            "Invalid storage facility ID.",
            400
        );

    }

    const dairy =
        await Dairy.findById(id);

    if (!dairy) {

        throw createError(
            "Storage facility not found.",
            404
        );

    }


    // ======================================================
    // VALID STORAGE FACILITY
    // ======================================================

    const isStorage =

        dairy.code === null &&

        dairy.assetCode === null &&

        dairy.storageNumber !== null &&

        dairy.storageNumber !== undefined &&

        Number(dairy.storageNumber) < 0;


    if (!isStorage) {

        throw createError(
            "The selected Dairy record is not a valid storage facility.",
            400
        );

    }

    return dairy;

}


// ==========================================================
// GET STORAGE OPTIONS
// ==========================================================

function getFeedTypes() {

    return [
        ...DEFAULT_FEED_TYPES
    ];

}


function getVeterinaryMedicines() {

    return [
        ...DEFAULT_VETERINARY_MEDICINES
    ];

}


function getStockUnits() {

    return [
        ...DEFAULT_STOCK_UNITS
    ];

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
        cleanText(category)
            .toLowerCase();

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

function normalizeStockName(
    data = {},
    category
) {

    let name =
        cleanText(data.name);

    if (!name) {

        if (
            category === "medicine"
        ) {

            name =
                cleanText(
                    data.medicineName
                );

        } else {

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
        toNumber(value);

    if (
        !Number.isFinite(quantity)
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

    return roundNumber(quantity);

}


// ==========================================================
// POSITIVE QUANTITY
// ==========================================================

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

    return roundNumber(price);

}


// ==========================================================
// UNIT
// ==========================================================

function normalizeUnit(
    unit
) {

    const value =
        cleanText(unit);

    if (!value) {

        throw createError(
            "Unit is required."
        );

    }

    const units =
        getStockUnits();

    if (
        units.length > 0 &&
        !units.includes(value)
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
        !Array.isArray(images)
    ) {

        return [];

    }

    return images

        .map(
            function(image) {

                if (
                    typeof image ===
                    "string"
                ) {

                    return image.trim();

                }

                if (
                    image &&
                    typeof image ===
                    "object"
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

            }
        )

        .filter(Boolean);

}


// ==========================================================
// CALCULATE FEEDS AMOUNT
// ==========================================================

function calculateFeedsAmount(
    quantity,
    unitPrice
) {

    const safeQuantity =
        toNumber(quantity);

    const safePrice =
        toNumber(unitPrice);

    if (
        !Number.isFinite(safeQuantity) ||
        !Number.isFinite(safePrice)
    ) {

        return 0;

    }

    return roundNumber(
        safeQuantity * safePrice
    );

}


// ==========================================================
// PERCENTAGE REMAINING
// ==========================================================

function calculatePercentageRemaining(
    quantityRemaining,
    initialQuantity
) {

    const remaining =
        toNumber(quantityRemaining);

    const initial =
        toNumber(initialQuantity);

    if (
        !Number.isFinite(remaining) ||
        !Number.isFinite(initial) ||
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
// NORMALIZE STOCK DOCUMENT
// ==========================================================
//
// Creates a plain embedded stock object.
//
// ==========================================================

function buildStockData(
    data = {},
    images = []
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


    const unitPrice =
        price === null
            ? 0
            : price;


    const now =
        new Date();


    return {

        _id:
            new mongoose.Types.ObjectId(),

        name,

        category,

        feedName:
            category === "feed"
                ? name
                : "",

        medicineName:
            category === "medicine"
                ? name
                : "",

        unit,

        quantityRemaining:
            quantity,

        initialQuantity:
            quantity,

        percentageRemaining:
            quantity > 0
                ? 100
                : 0,

        unitPrice,

        feedsAmount:
            calculateFeedsAmount(
                quantity,
                unitPrice
            ),

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
            ),

        images:
            normalizeImages(images),

        createdAt:
            now,

        updatedAt:
            now

    };

}


// ==========================================================
// RAW STORAGE STOCK ACCESS
// ==========================================================
//
// We intentionally use the MongoDB collection here because
// the supplied dairy.js does not currently declare:
//
//     storageStocks
//
// Mongoose strict mode would otherwise strip the field.
//
// This still stores the stock INSIDE the Dairy document.
//
// ==========================================================

function dairyCollection() {

    return Dairy.collection;

}


// ==========================================================
// GET EMBEDDED STOCK
// ==========================================================

async function getEmbeddedStocks(
    dairyId
) {

    const id =
        normalizeObjectId(dairyId);

    if (!id) {

        return [];

    }

    const document =
        await dairyCollection()
            .findOne(
                {
                    _id: id
                },
                {
                    projection: {
                        storageStocks: 1
                    }
                }
            );

    if (
        !document ||
        !Array.isArray(
            document.storageStocks
        )
    ) {

        return [];

    }

    return document.storageStocks;

}


// ==========================================================
// FIND EMBEDDED STOCK
// ==========================================================

async function findStock(
    dairy,
    stockId
) {

    if (!dairy) {

        return null;

    }

    const id =
        normalizeObjectId(stockId);

    if (!id) {

        return null;

    }

    const stocks =
        await getEmbeddedStocks(
            dairy._id
        );

    return (

        stocks.find(
            function(stock) {

                return String(
                    stock._id
                ) === String(id);

            }
        ) || null

    );

}


// ==========================================================
// CREATE STOCK
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


    const stock =
        buildStockData(
            data,
            images
        );


    const result =
        await dairyCollection()
            .updateOne(

                {
                    _id:
                        dairy._id
                },

                {
                    $push: {
                        storageStocks:
                            stock
                    }
                }

            );


    if (
        result.matchedCount !== 1
    ) {

        throw createError(
            "Failed to create stock.",
            500
        );

    }


    return stock;

}


// ==========================================================
// UPDATE STOCK
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
        await findStock(
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
        Number.isFinite(oldQuantity)
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
    // COPY CURRENT STOCK
    // ======================================================

    const updatedStock = {

        ...stock

    };


    // ======================================================
    // QUANTITY
    // ======================================================

    updatedStock.quantityRemaining =
        newQuantity;


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

        updatedStock.unitPrice =
            price;

        updatedStock.feedsAmount =
            calculateFeedsAmount(
                quantityDifference,
                price
            );

    }


    // ======================================================
    // SAME QUANTITY + PRICE
    // ======================================================

    else if (
        quantityDifference === 0 &&
        data.price !== undefined
    ) {

        const price =
            normalizePrice(
                data.price
            );

        if (
            price !== null
        ) {

            updatedStock.unitPrice =
                price;

        }

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

        updatedStock.name =
            name;

    }


    // ======================================================
    // CATEGORY
    // ======================================================

    if (
        data.category !== undefined
    ) {

        updatedStock.category =
            normalizeCategory(
                data.category
            );

    }


    // ======================================================
    // KEEP CATEGORY-SPECIFIC NAME FIELDS SYNCHRONIZED
    // ======================================================

    if (
        updatedStock.category ===
        "medicine"
    ) {

        updatedStock.medicineName =
            updatedStock.name;

        updatedStock.feedName =
            "";

    } else {

        updatedStock.feedName =
            updatedStock.name;

        updatedStock.medicineName =
            "";

    }


    // ======================================================
    // UNIT
    // ======================================================

    if (
        data.unit !== undefined
    ) {

        updatedStock.unit =
            normalizeUnit(
                data.unit
            );

    }


    // ======================================================
    // INFORMATION
    // ======================================================

    if (
        data.instructions !== undefined
    ) {

        updatedStock.instructions =
            cleanText(
                data.instructions
            );

    }


    if (
        data.expectedDuration !== undefined
    ) {

        updatedStock.expectedDuration =
            cleanText(
                data.expectedDuration
            );

    }


    if (
        data.message !== undefined
    ) {

        updatedStock.message =
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

        const existingImages =
            Array.isArray(
                updatedStock.images
            )
                ? updatedStock.images
                : [];

        updatedStock.images = [

            ...existingImages,

            ...newImages

        ];

    }


    // ======================================================
    // PERCENTAGE
    // ======================================================

    updatedStock.percentageRemaining =
        calculatePercentageRemaining(

            updatedStock.quantityRemaining,

            updatedStock.initialQuantity

        );


    // ======================================================
    // UPDATED TIME
    // ======================================================

    updatedStock.updatedAt =
        new Date();


    // ======================================================
    // REPLACE EMBEDDED STOCK
    // ======================================================

    const result =
        await dairyCollection()
            .updateOne(

                {
                    _id:
                        dairy._id,

                    "storageStocks._id":
                        stock._id

                },

                {
                    $set: {

                        "storageStocks.$":
                            updatedStock

                    }

                }

            );


    if (
        result.modifiedCount !== 1
    ) {

        throw createError(
            "Failed to update stock.",
            500
        );

    }


    return {

        stock:
            updatedStock,

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
                    updatedStock.feedsAmount || 0
                )
                : 0

    };

}


// ==========================================================
// RESTOCK EXISTING STOCK
// ==========================================================
//
// Restocking is ADDITIVE.
//
// old quantity
//       +
// quantity added
//       =
// new quantity
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
        await findStock(
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
        Number.isFinite(oldQuantity)
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


    const updatedStock = {

        ...stock,

        quantityRemaining:
            newQuantity,

        unitPrice:
            price,

        feedsAmount,

        percentageRemaining:

            calculatePercentageRemaining(

                newQuantity,

                stock.initialQuantity

            ),

        updatedAt:
            new Date()

    };


    // ======================================================
    // OPTIONAL INFORMATION
    // ======================================================

    if (
        data.instructions !== undefined
    ) {

        updatedStock.instructions =
            cleanText(
                data.instructions
            );

    }


    if (
        data.expectedDuration !== undefined
    ) {

        updatedStock.expectedDuration =
            cleanText(
                data.expectedDuration
            );

    }


    if (
        data.message !== undefined
    ) {

        updatedStock.message =
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

        const existingImages =
            Array.isArray(
                updatedStock.images
            )
                ? updatedStock.images
                : [];

        updatedStock.images = [

            ...existingImages,

            ...newImages

        ];

    }


    // ======================================================
    // SAVE EMBEDDED STOCK
    // ======================================================

    const result =
        await dairyCollection()
            .updateOne(

                {
                    _id:
                        dairy._id,

                    "storageStocks._id":
                        stock._id

                },

                {
                    $set: {

                        "storageStocks.$":
                            updatedStock

                    }

                }

            );


    if (
        result.modifiedCount !== 1
    ) {

        throw createError(
            "Failed to restock item.",
            500
        );

    }


    return {

        stock:
            updatedStock,

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
// No stockId:
//
//     CREATE
//
// stockId:
//
//     UPDATE
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


    const stocks =
        await getEmbeddedStocks(
            dairy._id
        );


    return stocks.sort(

        function(a, b) {

            const first =
                new Date(
                    b.createdAt || 0
                ).getTime();

            const second =
                new Date(
                    a.createdAt || 0
                ).getTime();

            return first - second;

        }

    );

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
        await findStock(
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
        await findStock(
            dairy,
            stockId
        );


    if (!stock) {

        throw createError(
            "Stock item not found.",
            404
        );

    }


    const result =
        await dairyCollection()
            .updateOne(

                {
                    _id:
                        dairy._id

                },

                {
                    $pull: {

                        storageStocks: {

                            _id:
                                stock._id

                        }

                    }

                }

            );


    if (
        result.modifiedCount !== 1
    ) {

        throw createError(
            "Failed to delete stock.",
            500
        );

    }


    return stock;

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

                    cleanText(
                        stock.category
                    )
                    .toLowerCase() ===
                    "feed"

                );

            }

        );


    const medicineStocks =
        stocks.filter(

            function(stock) {

                return (

                    cleanText(
                        stock.category
                    )
                    .toLowerCase() ===
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
// GET STORAGE STOCK OWNER
// ==========================================================
//
// Given:
//
//     farmCode = -1
//
// returns the Dairy document:
//
//     storageNumber = -1
//
// ==========================================================

async function getStorageStockOwner(
    farmCode
) {

    const code =
        Number(farmCode);


    if (
        !Number.isInteger(code) ||
        code >= 0
    ) {

        return null;

    }


    return Dairy.findOne({

        storageNumber:
            code

    });

}


// ==========================================================
// GET STOCK BY FARM CODE
// ==========================================================

async function getStocksByFarmCode(
    farmCode
) {

    const storage =
        await getStorageStockOwner(
            farmCode
        );


    if (!storage) {

        return [];

    }


    return getEmbeddedStocks(
        storage._id
    );

}


// ==========================================================
// GET ONE STOCK BY FARM CODE
// ==========================================================

async function getStockByFarmCode({
    farmCode,
    stockId
}) {

    const storage =
        await getStorageStockOwner(
            farmCode
        );


    if (!storage) {

        throw createError(
            "Storage facility not found.",
            404
        );

    }


    if (
        !isValidObjectId(stockId)
    ) {

        throw createError(
            "Invalid stock ID.",
            400
        );

    }


    const stock =
        await findStock(
            storage,
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
// EXPORTS
// ==========================================================

module.exports = {

    // ------------------------------------------------------
    // Storage
    // ------------------------------------------------------

    getDairy,

    getStorageStockOwner,


    // ------------------------------------------------------
    // Options
    // ------------------------------------------------------

    getFeedTypes,

    getVeterinaryMedicines,

    getStockUnits,

    getStorageOptions,


    // ------------------------------------------------------
    // Retrieval
    // ------------------------------------------------------

    getStocks,

    getStock,

    getStocksByFarmCode,

    getStockByFarmCode,


    // ------------------------------------------------------
    // Operations
    // ------------------------------------------------------

    createStock,

    updateStock,

    restockStock,

    saveStock,

    deleteStock,


    // ------------------------------------------------------
    // Helpers
    // ------------------------------------------------------

    findStock,

    validateNewStock,

    calculateFeedsAmount,

    calculatePercentageRemaining,


    // ------------------------------------------------------
    // Summary
    // ------------------------------------------------------

    getStockSummary

};