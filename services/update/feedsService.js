// ==========================================================
// services/update/feedsService.js
// ==========================================================
//
// FEED STORE SERVICE
//
// Responsibilities:
//
//     • Retrieve Food Stock page data
//     • Create feed-store condition updates
//     • Manage multiple feed-stock categories
//     • Restock existing feed categories
//     • Create new feed categories
//     • Maintain the aggregate Dairy.feedsAmount
//
// IMPORTANT
// ----------------------------------------------------------
//
// Individual feed amounts are stored separately.
//
// Example:
//
//     Fodder   = 15000
//     Silage   = 8000
//     Hay      = 5000
//
// Therefore:
//
//     feedsAmount = 28000
//
// feedsAmount MUST always be recalculated from the individual
// feed-stock amounts.
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

const FEED_STORE_TYPE =
    "feedStore";

const MAX_IMAGES =
    10;


// ==========================================================
// HELPERS
// ==========================================================


// ----------------------------------------------------------
// CONVERT TO NUMBER
// ----------------------------------------------------------

function toNumber(value, fallback = 0) {

    const number =
        Number(value);

    return Number.isFinite(number)
        ? number
        : fallback;

}


// ----------------------------------------------------------
// NORMALIZE STRING
// ----------------------------------------------------------

function cleanString(value) {

    if (
        value === undefined ||
        value === null
    ) {

        return "";

    }

    return String(value).trim();

}


// ----------------------------------------------------------
// NORMALIZE PERCENTAGE
// ----------------------------------------------------------

function normalizePercentage(value) {

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {

        return null;

    }

    const percentage =
        Number(value);

    if (
        !Number.isFinite(percentage)
    ) {

        throw new Error(
            "Percentage remaining must be a valid number."
        );

    }

    if (
        percentage < 0 ||
        percentage > 100
    ) {

        throw new Error(
            "Percentage remaining must be between 0 and 100."
        );

    }

    return percentage;

}


// ----------------------------------------------------------
// NORMALIZE IMAGES
// ----------------------------------------------------------

function normalizeImages(images) {

    if (
        !Array.isArray(images)
    ) {

        return [];

    }

    return images
        .map(cleanString)
        .filter(Boolean)
        .slice(
            0,
            MAX_IMAGES
        );

}


// ----------------------------------------------------------
// ENSURE VALID OBJECT ID
// ----------------------------------------------------------

function validateObjectId(id, label) {

    if (
        !id ||
        !mongoose.Types.ObjectId.isValid(id)
    ) {

        throw new Error(
            `${label} is invalid.`
        );

    }

}


// ==========================================================
// FIND FEED STORE
// ==========================================================

async function findFeedStore(
    dairyId
) {

    validateObjectId(
        dairyId,
        "Dairy ID"
    );


    const dairy =
        await Dairy.findById(
            dairyId
        );


    if (!dairy) {

        const error =
            new Error(
                "Dairy asset not found."
            );

        error.status = 404;

        throw error;

    }


    if (
        dairy.type !== FEED_STORE_TYPE
    ) {

        const error =
            new Error(
                "The selected dairy asset is not a feed store."
            );

        error.status = 400;

        throw error;

    }


    return dairy;

}


// ==========================================================
// CALCULATE FEEDS AMOUNT
// ==========================================================
//
// IMPORTANT:
//
// This is the single calculation point for:
//
//     Dairy.feedsAmount
//
// It MUST NOT be calculated differently in controllers.
//
// ==========================================================

function calculateFeedsAmount(
    stocks
) {

    if (
        !Array.isArray(stocks)
    ) {

        return 0;

    }


    return stocks.reduce(
        (
            total,
            stock
        ) => {

            return (
                total +
                toNumber(
                    stock.amount
                )
            );

        },
        0
    );

}


// ==========================================================
// SYNCHRONIZE FEEDS AMOUNT
// ==========================================================
//
// Takes the individual stock amounts and writes:
//
//     dairy.feedsAmount
//
// ==========================================================

function synchronizeFeedsAmount(
    dairy
) {

    const stocks =
        Array.isArray(
            dairy.feedStore?.stocks
        )
            ? dairy.feedStore.stocks
            : [];


    const total =
        calculateFeedsAmount(
            stocks
        );


    dairy.feedsAmount =
        total;


    return total;

}


// ==========================================================
// GET FEED STORE PAGE DATA
// ==========================================================
//
// Used by:
//
//     controllers/update/feedsController.js
//
// ==========================================================

async function getFeedStorePageData(
    dairy
) {

    if (!dairy) {

        throw new Error(
            "Dairy asset is required."
        );

    }


    if (
        dairy.type !== FEED_STORE_TYPE
    ) {

        const error =
            new Error(
                "The selected dairy asset is not a feed store."
            );

        error.status = 400;

        throw error;

    }


    const stocks =
        Array.isArray(
            dairy.feedStore?.stocks
        )
            ? dairy.feedStore.stocks
            : [];


    const feedsAmount =
        calculateFeedsAmount(
            stocks
        );


    return {

        stocks,

        feedsAmount,

        feedStore:
            dairy.feedStore || {

                stocks: [],

                feedsAmount: 0

            }

    };

}


// ==========================================================
// CREATE FEED STORE UPDATE
// ==========================================================
//
// Creates an Update.js document containing:
//
//     • message
//     • images
//     • facility condition
//     • feed quality
//     • percentage remaining
//
// This does NOT change the inventory.
//
// ==========================================================

async function createFeedStoreUpdate(
    data
) {

    const {

        dairyId,

        userId,

        role,

        message,

        condition,

        feedQuality,

        percentageRemaining,

        images

    } = data;


    validateObjectId(
        dairyId,
        "Dairy ID"
    );


    validateObjectId(
        userId,
        "User ID"
    );


    const dairy =
        await findFeedStore(
            dairyId
        );


    // ------------------------------------------------------
    // Normalize submitted data
    // ------------------------------------------------------

    const cleanMessage =
        cleanString(
            message
        );

    const cleanCondition =
        cleanString(
            condition
        );

    const cleanFeedQuality =
        cleanString(
            feedQuality
        );

    const cleanImages =
        normalizeImages(
            images
        );

    const remaining =
        normalizePercentage(
            percentageRemaining
        );


    // ------------------------------------------------------
    // Require at least some report content.
    // ------------------------------------------------------

    if (
        !cleanMessage &&
        !cleanCondition &&
        !cleanFeedQuality &&
        remaining === null &&
        cleanImages.length === 0
    ) {

        const error =
            new Error(
                "A feed-store update must contain a message, condition, feed quality, percentage or image."
            );

        error.status = 400;

        throw error;

    }


    // ------------------------------------------------------
    // Create Update document.
    //
    // The Update model will contain a dedicated feedStore
    // section.
    // ------------------------------------------------------

    const update =
        new Update({

            dairyId:
                dairy._id,

            userId,

            type:
                FEED_STORE_TYPE,

            message:
                cleanMessage,

            images:
                cleanImages,

            feedStore: {

                condition:
                    cleanCondition,

                feedQuality:
                    cleanFeedQuality,

                percentageRemaining:
                    remaining

            }

        });


    // ------------------------------------------------------
    // Save
    // ------------------------------------------------------

    await update.save();


    return update;

}


// ==========================================================
// RESTOCK FEED STORE
// ==========================================================
//
// ADMIN ONLY authorization is performed by the controller.
//
// This service:
//
//     1. Finds the feed store
//     2. Finds an existing stock by name
//     3. Updates it OR creates a new stock
//     4. Records the financial amount
//     5. Recalculates feedsAmount
//     6. Saves the Dairy document
//
// ==========================================================

async function restockFeedStore(
    data
) {

    const {

        dairyId,

        userId,

        feedName,

        amount,

        cost,

        unit,

        description

    } = data;


    validateObjectId(
        dairyId,
        "Dairy ID"
    );


    validateObjectId(
        userId,
        "User ID"
    );


    const dairy =
        await findFeedStore(
            dairyId
        );


    // ------------------------------------------------------
    // Normalize input
    // ------------------------------------------------------

    const name =
        cleanString(
            feedName
        );

    const stockAmount =
        toNumber(
            amount,
            NaN
        );

    const stockCost =
        toNumber(
            cost,
            0
        );

    const stockUnit =
        cleanString(
            unit
        );

    const stockDescription =
        cleanString(
            description
        );


    // ------------------------------------------------------
    // Validation
    // ------------------------------------------------------

    if (!name) {

        const error =
            new Error(
                "Feed stock name is required."
            );

        error.status = 400;

        throw error;

    }


    if (
        !Number.isFinite(
            stockAmount
        ) ||
        stockAmount <= 0
    ) {

        const error =
            new Error(
                "Restock amount must be greater than zero."
            );

        error.status = 400;

        throw error;

    }


    if (
        stockCost < 0
    ) {

        const error =
            new Error(
                "Restocking cost cannot be negative."
            );

        error.status = 400;

        throw error;

    }


    // ------------------------------------------------------
    // Ensure stock array exists.
    // ------------------------------------------------------

    if (
        !dairy.feedStore
    ) {

        dairy.feedStore = {

            stocks: [],

            feedsAmount: 0

        };

    }


    if (
        !Array.isArray(
            dairy.feedStore.stocks
        )
    ) {

        dairy.feedStore.stocks = [];

    }


    // ------------------------------------------------------
    // FIND EXISTING STOCK
    //
    // Case-insensitive comparison.
    // ------------------------------------------------------

    const normalizedName =
        name.toLowerCase();


    let stock =
        dairy.feedStore.stocks.find(
            item =>
                cleanString(
                    item.name
                ).toLowerCase() ===
                normalizedName
        );


    // ======================================================
    // EXISTING STOCK
    // ======================================================

    if (stock) {

        stock.amount =
            toNumber(
                stock.amount
            ) +
            stockAmount;


        if (
            stockUnit
        ) {

            stock.unit =
                stockUnit;

        }


        if (
            stockDescription
        ) {

            stock.description =
                stockDescription;

        }


        stock.updatedAt =
            new Date();

    }


    // ======================================================
    // NEW STOCK CATEGORY
    // ======================================================

    else {

        dairy.feedStore.stocks.push({

            name,

            amount:
                stockAmount,

            unit:
                stockUnit,

            description:
                stockDescription,

            createdAt:
                new Date(),

            updatedAt:
                new Date()

        });


        stock =
            dairy.feedStore.stocks[
                dairy.feedStore.stocks.length - 1
            ];

    }


    // ======================================================
    // RE-CALCULATE AGGREGATE
    // ======================================================
    //
    // NEVER manually add to feedsAmount here.
    //
    // Always derive it from the individual stocks.
    //
    // ======================================================

    const feedsAmount =
        synchronizeFeedsAmount(
            dairy
        );


    // ------------------------------------------------------
    // Save Dairy
    // ------------------------------------------------------

    await dairy.save();


    // ======================================================
    // RETURN
    // ======================================================

    return {

        feed:
            stock,

        feedsAmount,
updates

    };

}


// ==========================================================
// EXPORT
// ==========================================================

module.exports = {

    getFeedStorePageData,

    createFeedStoreUpdate,

    restockFeedStore,

    calculateFeedsAmount

};