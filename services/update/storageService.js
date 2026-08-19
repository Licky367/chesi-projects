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
// CANONICAL STOCK IDENTITY:
//
//     name
//
// LEGACY NAME FIELDS:
//
//     feedName
//     medicineName
//
// The canonical field is now:
//
//     stock.name
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
// NORMALIZE STOCK NAME
// ==========================================================
//
// CANONICAL FIELD:
//
//     name
//
// BACKWARD COMPATIBILITY:
//
//     feedName
//     medicineName
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


    // ------------------------------------------------------
    // Backward compatibility
    // ------------------------------------------------------

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


    return name;

}


// ==========================================================
// VALIDATE STOCK NAME
// ==========================================================
//
// The name is intentionally not restricted to the dropdown
// lists.
//
// This allows an administrator to edit the stock name while
// keeping the canonical field:
//
//     stock.name
//
// ==========================================================

function validateStockName(
    data = {},
    category
) {

    const name =
        normalizeStockName(
            data,
            category
        );


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
// quantity × unit price
//
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
// CALCULATE PERCENTAGE REMAINING
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


    const name =
        validateStockName(
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


    // ------------------------------------------------------
    // Positive stock requires a price.
    // ------------------------------------------------------

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
// Used by:
//
//     add-stock.ejs
//
// Canonical stock identity:
//
//     name
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

        // --------------------------------------------------
        // CANONICAL IDENTITY
        // --------------------------------------------------

        name:
            input.name,


        // --------------------------------------------------
        // CATEGORY
        // --------------------------------------------------

        category:
            input.category,


        // --------------------------------------------------
        // BACKWARD COMPATIBILITY
        //
        // These are populated from the canonical name so
        // older parts of the application can still read them.
        // --------------------------------------------------

        feedName:
            input.category === "feed"
                ? input.name
                : "",


        medicineName:
            input.category === "medicine"
                ? input.name
                : "",


        // --------------------------------------------------
        // UNIT
        // --------------------------------------------------

        unit:
            input.unit,


        // --------------------------------------------------
        // QUANTITY
        // --------------------------------------------------

        quantityRemaining:
            input.quantity,


        initialQuantity:
            input.quantity,


        percentageRemaining:
            calculatePercentageRemaining(
                input.quantity,
                input.quantity
            ),


        // --------------------------------------------------
        // FINANCIAL
        // --------------------------------------------------

        unitPrice,

        feedsAmount,


        // --------------------------------------------------
        // INFORMATION
        // --------------------------------------------------

        instructions:
            input.instructions,

        expectedDuration:
            input.expectedDuration,

        message:
            input.message,


        // --------------------------------------------------
        // IMAGES
        // --------------------------------------------------

        images:
            normalizeImages(
                images
            ),


        // --------------------------------------------------
        // TIMESTAMP
        // --------------------------------------------------

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
// Used by:
//
//     update-stock.ejs
//
// ADMIN:
//
//     Can update:
//         • name
//         • quantity
//         • price
//         • instructions
//         • expectedDuration
//         • message
//         • images
//
// DAIRY WORKER:
//
//     Can update:
//         • quantity
//         • message
//         • images
//
// The controller is responsible for removing unauthorized
// fields before this service is called.
//
// This service also avoids clearing fields merely because
// they were omitted from the request.
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


    // ======================================================
    // EXISTING QUANTITY
    // ======================================================

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


    // ======================================================
    // NEW QUANTITY
    // ======================================================

    let newQuantity =
        safeOldQuantity;


    if (
        data.quantity !== undefined
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
    // QUANTITY REDUCTION
    // ======================================================

    else if (
        quantityDifference < 0
    ) {

        stock.quantityRemaining =
            newQuantity;

        /*
         * A reduction is consumption.
         *
         * Therefore:
         *
         *     unitPrice
         *     feedsAmount
         *
         * remain unchanged.
         */

    }


    // ======================================================
    // SAME QUANTITY
    // ======================================================

    else {

        stock.quantityRemaining =
            safeOldQuantity;

    }


    // ======================================================
    // ADMIN NAME UPDATE
    // ======================================================
    //
    // The controller removes name for non-admin users.
    //
    // Therefore, only a supplied name is changed.
    //
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


        // --------------------------------------------------
        // Keep legacy fields synchronized.
        // --------------------------------------------------

        const category =
            cleanText(
                stock.category
            ).toLowerCase();


        if (
            category === "medicine"
        ) {

            stock.medicineName =
                name;

        }

        else {

            stock.feedName =
                name;

        }

    }


    // ======================================================
    // UNIT
    // ======================================================
    //
    // Unit is intentionally not changed during update.
    //
    // The update page displays it as readonly.
    //
    // ======================================================


    // ======================================================
    // PERCENTAGE REMAINING
    // ======================================================

    stock.percentageRemaining =
        calculatePercentageRemaining(
            stock.quantityRemaining,
            stock.initialQuantity
        );


    // ======================================================
    // ADMIN / OPTIONAL INFORMATION
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
// Used by:
//
//     restock.ejs
//
// IMPORTANT:
//
// Restock quantity is ADDITIVE.
//
// Example:
//
//     Existing stock = 100 kg
//     Restock        = 50 kg
//     New total      = 150 kg
//
// The submitted quantity is NOT the new total.
//
// ==========================================================

async function restockStock({
    dairyId,
    stockId,
    data = {},
    images = []
}) {

    // ======================================================
    // CONTROLLER COMPATIBILITY
    // ======================================================
    //
    // The current addStock controller calls:
    //
    //     restockStock({
    //         dairyId,
    //         stockId: "",
    //         data,
    //         images
    //     })
    //
    // Therefore an empty stockId means CREATE.
    //
    // ======================================================

    if (
        !stockId
    ) {

        return createStock({

            dairyId,

            data,

            images

        });

    }


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


    // ======================================================
    // RESTOCK QUANTITY
    // ======================================================

    const quantityAdded =
        normalizePositiveQuantity(

            data.quantityAdded !== undefined

                ? data.quantityAdded

                : data.quantity,

            "Restock quantity"

        );


    // ======================================================
    // PRICE
    // ======================================================

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


    // ======================================================
    // OLD QUANTITY
    // ======================================================

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


    // ======================================================
    // NEW TOTAL
    // ======================================================

    const newQuantity =
        roundNumber(
            safeOldQuantity +
            quantityAdded
        );


    // ======================================================
    // PURCHASE AMOUNT
    // ======================================================

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
    // LATEST UNIT PRICE
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
    // initialQuantity is deliberately NOT changed.
    //
    // Therefore if:
    //
    //     initial = 100
    //     remaining = 150
    //
    // percentage = 150%
    //
    // ======================================================

    stock.percentageRemaining =
        calculatePercentageRemaining(
            stock.quantityRemaining,
            stock.initialQuantity
        );


    // ======================================================
    // NAME
    // ======================================================
    //
    // Restocking does not rename the stock.
    //
    // The name is controlled from update-stock.ejs.
    //
    // ======================================================


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
// If stockId is empty:
//
//     createStock()
//
// If stockId exists:
//
//     updateStock()
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
// GET ALL STOCKS
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

    // ======================================================
    // DAIRY
    // ======================================================

    getDairy,


    // ======================================================
    // OPTIONS
    // ======================================================

    getFeedTypes,

    getVeterinaryMedicines,

    getStockUnits,

    getStorageOptions,


    // ======================================================
    // RETRIEVAL
    // ======================================================

    getStocks,

    getStock,


    // ======================================================
    // OPERATIONS
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