// ==========================================================
// services/update/feedsService.js
// ==========================================================
//
// FEED STORE SERVICE
//
// Responsibilities:
//
//     • Retrieve Feed Store page data
//     • Create feed-store reports
//     • Retrieve recent feed-store reports
//     • Restock existing feed categories
//     • Create new feed categories
//     • Maintain Dairy.feedsAmount
//
// IMPORTANT
// ----------------------------------------------------------
//
// The Dairy model is the source of truth for feed inventory.
//
// Individual feed values are stored in:
//
//     dairy.feeds[]
//
// The aggregate value is:
//
//     dairy.feedsAmount
//
// feedsAmount is ALWAYS recalculated from dairy.feeds.
//
// The controller does not calculate inventory totals.
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


const UPDATE_TYPE =
    "post";


const MAX_IMAGES =
    10;


const MAX_RECENT_UPDATES =
    20;


// ==========================================================
// HELPERS
// ==========================================================


// ----------------------------------------------------------
// CONVERT TO NUMBER
// ----------------------------------------------------------

function toNumber(
    value,
    fallback = 0
) {

    const number =
        Number(value);


    return Number.isFinite(number)
        ? number
        : fallback;

}


// ----------------------------------------------------------
// NORMALIZE STRING
// ----------------------------------------------------------

function cleanString(
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


// ----------------------------------------------------------
// NORMALIZE PERCENTAGE
// ----------------------------------------------------------

function normalizePercentage(
    value
) {

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
        !Number.isFinite(
            percentage
        )
    ) {

        const error =
            new Error(
                "Percentage remaining must be a valid number."
            );

        error.status = 400;

        throw error;

    }


    if (
        percentage < 0 ||
        percentage > 100
    ) {

        const error =
            new Error(
                "Percentage remaining must be between 0 and 100."
            );

        error.status = 400;

        throw error;

    }


    return percentage;

}


// ----------------------------------------------------------
// NORMALIZE IMAGES
// ----------------------------------------------------------

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
            cleanString
        )

        .filter(Boolean)

        .slice(
            0,
            MAX_IMAGES
        );

}


// ----------------------------------------------------------
// VALIDATE OBJECT ID
// ----------------------------------------------------------

function validateObjectId(
    id,
    label
) {

    if (
        !id ||
        !mongoose.Types.ObjectId.isValid(
            id
        )
    ) {

        const error =
            new Error(
                `${label} is invalid.`
            );

        error.status = 400;

        throw error;

    }

}


// ==========================================================
// FIND FEED STORE
// ==========================================================
//
// Ensures:
//
//     • Dairy exists
//     • Dairy is actually a feedStore structure
//
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
        dairy.type !==
        FEED_STORE_TYPE
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
// GET FEED ARRAY
// ==========================================================
//
// The current Dairy structure uses:
//
//     dairy.feeds
//
// Make sure callers always receive an array.
//
// ==========================================================

function getFeeds(
    dairy
) {

    if (
        !dairy
    ) {

        return [];

    }


    if (
        !Array.isArray(
            dairy.feeds
        )
    ) {

        dairy.feeds = [];

    }


    return dairy.feeds;

}


// ==========================================================
// CALCULATE FEEDS AMOUNT
// ==========================================================
//
// SINGLE SOURCE OF TRUTH.
//
// feedsAmount is derived from:
//
//     dairy.feeds[].amount
//
// ==========================================================

function calculateFeedsAmount(
    feeds
) {

    if (
        !Array.isArray(
            feeds
        )
    ) {

        return 0;

    }


    return feeds.reduce(
        (
            total,
            feed
        ) => {

            return (
                total +
                toNumber(
                    feed.amount
                )
            );

        },
        0
    );

}


// ==========================================================
// SYNCHRONIZE FEEDS AMOUNT
// ==========================================================

function synchronizeFeedsAmount(
    dairy
) {

    const feeds =
        getFeeds(
            dairy
        );


    const total =
        calculateFeedsAmount(
            feeds
        );


    dairy.feedsAmount =
        total;


    return total;

}


// ==========================================================
// GET RECENT FEED STORE UPDATES
// ==========================================================
//
// IMPORTANT
// ----------------------------------------------------------
//
// The current Update.js does not yet contain a dedicated
// feedStore subdocument or feedStore update type.
//
// Therefore feed-store reports are stored as:
//
//     type: "post"
//
// with:
//
//     title: "Feed Store Update"
//
// ==========================================================

async function getRecentFeedStoreUpdates(
    dairyId
) {

    validateObjectId(
        dairyId,
        "Dairy ID"
    );


    const updates =
        await Update.find({

            dairy:
                dairyId,

            type:
                UPDATE_TYPE,

            title:
                "Feed Store Update"

        })

        .populate(
            "user",
            "name profileImage"
        )

        .sort({
            createdAt: -1
        })

        .limit(
            MAX_RECENT_UPDATES
        )

        .lean();


    return Array.isArray(
        updates
    )
        ? updates
        : [];

}


// ==========================================================
// GET FEED STORE PAGE DATA
// ==========================================================
//
// Used by:
//
//     controllers/update/feedsController.js
//
// Returns:
//
//     feeds
//     feedsAmount
//     updates
//
// ==========================================================

async function getFeedStorePageData(
    dairy
) {

    if (
        !dairy
    ) {

        const error =
            new Error(
                "Dairy asset is required."
            );

        error.status = 400;

        throw error;

    }


    if (
        dairy.type !==
        FEED_STORE_TYPE
    ) {

        const error =
            new Error(
                "The selected dairy asset is not a feed store."
            );

        error.status = 400;

        throw error;

    }


    const feeds =
        Array.isArray(
            dairy.feeds
        )
            ? dairy.feeds
            : [];


    const feedsAmount =
        calculateFeedsAmount(
            feeds
        );


    const updates =
        await getRecentFeedStoreUpdates(
            dairy._id
        );


    return {

        feeds,

        feedsAmount,

        updates

    };

}


// ==========================================================
// CREATE FEED STORE UPDATE
// ==========================================================
//
// Creates an Update document using the CURRENT Update.js:
//
//     dairy
//     user
//     userName
//     userImage
//     type
//     title
//     text
//     images
//
// No unsupported `feedStore` property is written.
//
// ==========================================================

async function createFeedStoreUpdate(
    data
) {

    const {

        dairyId,

        userId,

        message,

        condition,

        feedQuality,

        percentageRemaining,

        images

    } = data || {};


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
    // NORMALIZE INPUT
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
    // BUILD REPORT TEXT
    // ------------------------------------------------------
    //
    // Since the current Update.js does not have dedicated
    // feedStore fields, the operational details are kept
    // inside the normal Update.text field.
    //
    // ------------------------------------------------------

    const reportParts = [];


    if (
        cleanCondition
    ) {

        reportParts.push(
            `Facility condition: ${cleanCondition}`
        );

    }


    if (
        cleanFeedQuality
    ) {

        reportParts.push(
            `Feed quality: ${cleanFeedQuality}`
        );

    }


    if (
        remaining !== null
    ) {

        reportParts.push(
            `Estimated food remaining: ${remaining}%`
        );

    }


    if (
        cleanMessage
    ) {

        reportParts.push(
            cleanMessage
        );

    }


    const reportText =
        reportParts.join(
            "\n\n"
        );


    // ------------------------------------------------------
    // REQUIRE CONTENT
    // ------------------------------------------------------

    if (
        !reportText &&
        cleanImages.length === 0
    ) {

        const error =
            new Error(
                "A feed-store update must contain a report or image."
            );

        error.status = 400;

        throw error;

    }


    // ------------------------------------------------------
    // GET USER SNAPSHOT
    // ------------------------------------------------------

    const user =
        await mongoose
            .model("User")
            .findById(
                userId
            )
            .select(
                "name profileImage"
            )
            .lean();


    // ------------------------------------------------------
    // CREATE UPDATE
    // ------------------------------------------------------

    const update =
        new Update({

            dairy:
                dairy._id,

            user:
                userId,

            userName:
                user?.name || "",

            userImage:
                user?.profileImage || "",

            type:
                UPDATE_TYPE,

            title:
                "Feed Store Update",

            text:
                reportText,

            images:
                cleanImages

        });


    // ------------------------------------------------------
    // SAVE
    // ------------------------------------------------------

    await update.save();


    return update;

}


// ==========================================================
// RESTOCK FEED STORE
// ==========================================================
//
// ADMIN authorization is handled by the controller.
//
// The service:
//
//     • finds the feed store
//     • finds an existing feed category
//     • adds to its amount
//     • OR creates a new category
//     • recalculates feedsAmount
//     • saves Dairy
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

        description,

        restockMode,

        existingStock,

        newStock

    } = data || {};


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
    // DETERMINE STOCK NAME
    // ------------------------------------------------------

    let name =
        cleanString(
            feedName
        );


    if (
        !name &&
        restockMode === "existing"
    ) {

        name =
            cleanString(
                existingStock
            );

    }


    if (
        !name &&
        restockMode === "new"
    ) {

        name =
            cleanString(
                newStock
            );

    }


    // ------------------------------------------------------
    // AMOUNT
    // ------------------------------------------------------

    const stockAmount =
        toNumber(
            amount,
            NaN
        );


    // ------------------------------------------------------
    // OPTIONAL FIELDS
    // ------------------------------------------------------

    const stockUnit =
        cleanString(
            unit
        );


    const stockDescription =
        cleanString(
            description
        );


    const restockCost =
        toNumber(
            cost,
            0
        );


    // ------------------------------------------------------
    // VALIDATION
    // ------------------------------------------------------

    if (
        !name
    ) {

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
        restockCost < 0
    ) {

        const error =
            new Error(
                "Restocking cost cannot be negative."
            );

        error.status = 400;

        throw error;

    }


    // ------------------------------------------------------
    // ENSURE FEEDS ARRAY
    // ------------------------------------------------------

    const feeds =
        getFeeds(
            dairy
        );


    // ------------------------------------------------------
    // FIND EXISTING FEED
    // ------------------------------------------------------

    const normalizedName =
        name.toLowerCase();


    let feed =
        feeds.find(
            item =>
                cleanString(
                    item.name
                ).toLowerCase() ===
                normalizedName
        );


    // ======================================================
    // EXISTING FEED
    // ======================================================

    if (
        feed
    ) {

        feed.amount =
            toNumber(
                feed.amount
            ) +
            stockAmount;


        if (
            stockUnit
        ) {

            feed.unit =
                stockUnit;

        }


        if (
            stockDescription
        ) {

            feed.description =
                stockDescription;

        }


        feed.updatedAt =
            new Date();

    }


    // ======================================================
    // NEW FEED
    // ======================================================

    else {

        feeds.push({

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


        feed =
            feeds[
                feeds.length - 1
            ];

    }


    // ======================================================
    // RECALCULATE TOTAL
    // ======================================================

    const feedsAmount =
        synchronizeFeedsAmount(
            dairy
        );


    // ------------------------------------------------------
    // SAVE
    // ------------------------------------------------------

    await dairy.save();


    // ------------------------------------------------------
    // RETURN
    // ------------------------------------------------------

    return {

        feed,

        feedsAmount

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