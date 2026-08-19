// ==========================================================
// services/update/storageService.js
// ==========================================================
//
// FEED STOCK / STORAGE SERVICE
//
// CANONICAL DATABASE STRUCTURE
// ----------------------------------------------------------
//
// Dairy
//     = farm / animal / facility / asset model
//
// Storage Facility
//     = Dairy document where:
//
//         code          = null
//         assetCode     = null
//         storageNumber = negative Dairy Farm code
//
// FeedStock
//     = INDEPENDENT MongoDB COLLECTION
//
// FeedStock.dairy
//     = ObjectId of the storage facility Dairy document
//
// IMPORTANT
// ----------------------------------------------------------
//
// FeedStock is NOT embedded inside Dairy.
//
// Therefore:
//
//     dairy.feedStocks.push(...)
//
// is NEVER used.
//
// Stock operations use the FeedStock model directly.
//
// ==========================================================
//
// CANONICAL STOCK IDENTITY
// ----------------------------------------------------------
//
//     stock._id
//
// CANONICAL STOCK NAME
// ----------------------------------------------------------
//
//     stock.name
//
// LEGACY / CATEGORY FIELDS
// ----------------------------------------------------------
//
//     stock.feedName
//     stock.medicineName
//
// ==========================================================


const mongoose =
    require("mongoose");


const Dairy =
    require("../../models/dairy");


const FeedStock =
    require("../../models/feedStock");


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
//
// FeedStock is a standalone MongoDB document.
//
// If the FeedStock schema has timestamps enabled,
// saving the document will also update updatedAt.
//
// This helper is retained for compatibility with the
// existing service logic.
//

function touchStock(
    stock
) {

    if (!stock) {

        return;

    }


    stock.updatedAt =
        new Date();

}


// ==========================================================
// GET STORAGE FACILITY
// ==========================================================
//
// IMPORTANT
// ----------------------------------------------------------
//
// The supplied dairyId identifies the Dairy document that
// represents the STORAGE FACILITY.
//
// A valid storage facility must have:
//
//     code          = null
//     assetCode     = null
//     storageNumber = negative number
//
// FeedStock documents are attached to this Dairy document
// through:
//
//     FeedStock.dairy = storage._id
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
            "Storage facility ID is required.",
            400
        );

    }


    if (
        !isValidObjectId(
            id
        )
    ) {

        throw createError(
            "Invalid storage facility ID.",
            400
        );

    }


    const dairy =
        await Dairy.findById(
            id
        );


    if (!dairy) {

        throw createError(
            "Storage facility not found.",
            404
        );

    }


    // ------------------------------------------------------
    // The supplied Dairy document MUST be storage.
    // ------------------------------------------------------

    const isStorage =

        dairy.code === null &&

        dairy.assetCode === null &&

        dairy.storageNumber !== null &&

        dairy.storageNumber !== undefined &&

        Number(
            dairy.storageNumber
        ) < 0;


    if (!isStorage) {

        throw createError(
            "The selected Dairy record is not a valid storage facility.",
            400
        );

    }


    return dairy;

}


// ==========================================================
// OPTIONS
// ==========================================================
//
// The current dairy.js no longer contains feed-stock option
// methods because FeedStock is a separate model.
//
// Therefore these helpers first attempt to obtain enums from
// the FeedStock schema.
//
// If the schema does not expose enums, the service provides
// the standard fallback values.
//
// ==========================================================


// ==========================================================
// DEFAULT FEED TYPES
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


// ==========================================================
// DEFAULT VETERINARY MEDICINES
// ==========================================================

const DEFAULT_VETERINARY_MEDICINES = [

    "antibiotic",
    "dewormer",
    "vaccine",
    "vitamin",
    "mineral",
    "anti-inflammatory",
    "other"

];


// ==========================================================
// DEFAULT STOCK UNITS
// ==========================================================

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
// GET ENUM VALUES FROM FEEDSTOCK SCHEMA
// ==========================================================

function getSchemaEnumValues(
    fieldName
) {

    try {

        if (
            !FeedStock ||
            !FeedStock.schema
        ) {

            return [];

        }


        const path =
            FeedStock.schema.path(
                fieldName
            );


        if (
            !path
        ) {

            return [];

        }


        if (
            Array.isArray(
                path.enumValues
            )
        ) {

            return path.enumValues
                .filter(Boolean)
                .map(
                    value =>
                        String(value)
                );

        }

    }

    catch (error) {

        return [];

    }


    return [];

}


// ==========================================================
// FEED TYPES
// ==========================================================

function getFeedTypes() {

    const values =
        getSchemaEnumValues(
            "feedType"
        );


    if (
        values.length > 0
    ) {

        return values;

    }


    return [

        ...DEFAULT_FEED_TYPES

    ];

}


// ==========================================================
// VETERINARY MEDICINES
// ==========================================================

function getVeterinaryMedicines() {

    const values =
        getSchemaEnumValues(
            "medicineType"
        );


    if (
        values.length > 0
    ) {

        return values;

    }


    return [

        ...DEFAULT_VETERINARY_MEDICINES

    ];

}


// ==========================================================
// STOCK UNITS
// ==========================================================

function getStockUnits() {

    const values =
        getSchemaEnumValues(
            "unit"
        );


    if (
        values.length > 0
    ) {

        return values;

    }


    return [

        ...DEFAULT_STOCK_UNITS

    ];

}


// ==========================================================
// STORAGE OPTIONS
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
// CATEGORY
// ==========================================================

function normalizeCategory(
    category
) {

    const value =
        cleanText(
            category
        )
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
//
// CANONICAL:
//
//     data.name
//
// FALLBACK:
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
// FIND STOCK
// ==========================================================
//
// FeedStock is a separate collection.
//
// Therefore this helper performs a database query.
//
// ==========================================================

async function findStock(
    dairy,
    stockId
) {

    if (
        !dairy
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


    if (
        !isValidObjectId(
            id
        )
    ) {

        return null;

    }


    const stock =
        await FeedStock.findOne({

            _id: id,

            dairy:
                dairy._id

        });


    return stock || null;

}


// ==========================================================
// GET STOCK QUERY
// ==========================================================
//
// This is useful for callers that need a Mongoose query.
//
// ==========================================================

function stockQuery(
    dairy
) {

    return FeedStock.find({

        dairy:
            dairy._id

    });

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
// PERCENTAGE REMAINING
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
// Creates a NEW FeedStock document.
//
// IMPORTANT:
//
//     FeedStock.create()
//
// is correct here because FeedStock is now an independent
// MongoDB collection.
//
// The document receives:
//
//     dairy: storageFacility._id
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


    const stockData = {

        dairy:
            dairy._id,


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
            )

    };


    // ------------------------------------------------------
    // CREATE IN THE INDEPENDENT FeedStock COLLECTION.
    // ------------------------------------------------------

    const stock =
        await FeedStock.create(
            stockData
        );


    return stock;

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
            )
            .toLowerCase();


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
    // CATEGORY
    // ======================================================

    if (
        data.category !== undefined
    ) {

        const category =
            normalizeCategory(
                data.category
            );


        stock.category =
            category;


        if (
            category === "medicine"
        ) {

            stock.medicineName =
                stock.name;


            stock.feedName =
                "";

        }

        else {

            stock.feedName =
                stock.name;


            stock.medicineName =
                "";

        }

    }


    // ======================================================
    // UNIT
    // ======================================================

    if (
        data.unit !== undefined
    ) {

        stock.unit =
            normalizeUnit(
                data.unit
            );

    }


    // ======================================================
    // PRICE WITHOUT QUANTITY CHANGE
    // ======================================================

    if (

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

            stock.unitPrice =
                price;

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
    // SAVE FeedStock DOCUMENT
    // ======================================================

    await stock.save();


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
// Restock is ADDITIVE:
//
//     old quantity
//          +
//     quantity added
//          =
//     new quantity
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
    // UPDATE STOCK DOCUMENT
    // ======================================================

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


    // ======================================================
    // TIMESTAMP
    // ======================================================

    touchStock(
        stock
    );


    // ======================================================
    // SAVE FeedStock
    // ======================================================

    await stock.save();


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
// No stockId:
//     create new FeedStock document.
//
// stockId:
//     update existing FeedStock document.
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
//
// Retrieves FeedStock documents belonging to the selected
// storage facility.
//
// ==========================================================

async function getStocks(
    dairyId
) {

    const dairy =
        await getDairy(
            dairyId
        );


    const stocks =
        await stockQuery(
            dairy
        )
        .sort({

            createdAt: -1

        });


    return stocks;

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
//
// Deletes the FeedStock document from the independent
// FeedStock collection.
//
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


    // ------------------------------------------------------
    // Keep the actual deleted document available to return.
    // ------------------------------------------------------

    const deletedStock =
        stock;


    // ------------------------------------------------------
    // Delete ONLY when the stock belongs to this storage.
    // ------------------------------------------------------

    await FeedStock.deleteOne({

        _id:
            stock._id,

        dairy:
            dairy._id

    });


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
// Given a Dairy Farm code, find its storage facility.
//
// Example:
//
//     getStorageStockOwner(-1)
//
// returns:
//
//     Dairy {
//         code: null,
//         assetCode: null,
//         storageNumber: -1
//     }
//
// ==========================================================

async function getStorageStockOwner(
    farmCode
) {

    const code =
        Number(
            farmCode
        );


    if (

        !Number.isInteger(
            code
        ) ||

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
//
// Convenience method.
//
// Finds the farm's storage facility first, then retrieves
// all FeedStock documents belonging to that storage facility.
//
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


    return FeedStock.find({

        dairy:
            storage._id

    })
    .sort({

        createdAt: -1

    });

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
        !isValidObjectId(
            stockId
        )
    ) {

        throw createError(
            "Invalid stock ID.",
            400
        );

    }


    const stock =
        await FeedStock.findOne({

            _id:
                stockId,

            dairy:
                storage._id

        });


    if (!stock) {

        throw createError(
            "Stock item not found.",
            404
        );

    }


    return stock;

}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    // ------------------------------------------------------
    // Dairy / Storage
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