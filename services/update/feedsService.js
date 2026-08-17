// ==========================================================
// services/update/feedsService.js
// ==========================================================
//
// FEED STORE / STOCK SERVICE
//
// Responsibilities:
//
//     • Retrieve Feed Store page data
//     • Create STOCK feed reports
//     • Retrieve recent STOCK reports
//     • Restock existing feed categories
//     • Create new feed categories
//     • Maintain Dairy.feedsAmount
//     • Normalize uploaded image paths
//
// FEED INTEGRATION
// ----------------------------------------------------------
//
// Feed-store reports are now real feed items:
//
//     type: "stock"
//
// They are therefore rendered by:
//
//     views/update/stock.ejs
//
// and participate in:
//
//     feed.ejs
//     feed-actions.ejs
//
// IMPORTANT
// ----------------------------------------------------------
//
// Only:
//
//     dairyWorker
//
// may submit a stock report.
//
// Admin may:
//
//     • restock feed
//     • create feed categories
//
// Admin restocking DOES NOT create a feed item.
//
// INVENTORY SOURCE OF TRUTH
// ----------------------------------------------------------
//
// Individual feed values:
//
//     dairy.feeds[]
//
// Aggregate:
//
//     dairy.feedsAmount
//
// feedsAmount is ALWAYS calculated from dairy.feeds.
//
// IMAGE RULE
// ----------------------------------------------------------
//
// MongoDB stores PUBLIC browser paths:
//
//     /uploads/images/photo.jpg
//
// NEVER:
//
//     /opt/render/project/src/public/uploads/images/photo.jpg
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


/*
 * Feed item type used by the main chronological feed.
 */
const STOCK_UPDATE_TYPE =
    "stock";


/*
 * Maximum number of images allowed on one report.
 */
const MAX_IMAGES =
    10;


/*
 * Number of reports displayed on the Feed Store page.
 */
const MAX_RECENT_UPDATES =
    20;


/*
 * Only dairy workers may create stock reports.
 */
const STOCK_REPORT_ROLE =
    "dairyWorker";


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


    return Number.isFinite(
        number
    )
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


    return String(
        value
    ).trim();

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


// ==========================================================
// NORMALIZE PUBLIC IMAGE PATH
// ==========================================================
//
// Converts:
//
//     /opt/render/project/src/public/uploads/images/a.jpg
//
// into:
//
//     /uploads/images/a.jpg
//
// Also supports:
//
//     C:\project\public\uploads\images\a.jpg
//
//     /uploads/images/a.jpg
//
//     https://example.com/image.jpg
//
// ==========================================================

function normalizePublicImage(
    value
) {

    const image =
        cleanString(
            value
        );


    if (!image) {

        return "";

    }


    // ------------------------------------------------------
    // ABSOLUTE URL
    // ------------------------------------------------------

    if (
        image.startsWith(
            "http://"
        ) ||
        image.startsWith(
            "https://"
        )
    ) {

        return image;

    }


    // ------------------------------------------------------
    // NORMALIZE WINDOWS SLASHES
    // ------------------------------------------------------

    const normalized =
        image.replace(
            /\\/g,
            "/"
        );


    // ------------------------------------------------------
    // ALREADY A PUBLIC PATH
    // ------------------------------------------------------

    if (
        normalized.startsWith("/")
    ) {

        /*
         * Handle an absolute filesystem path containing
         * /public/.
         */

        if (
            normalized.includes(
                "/public/"
            )
        ) {

            const publicIndex =
                normalized.indexOf(
                    "/public/"
                );


            return normalized.substring(
                publicIndex +
                "/public".length
            );

        }


        return normalized;

    }


    // ------------------------------------------------------
    // FILESYSTEM PATH CONTAINING /public/
    // ------------------------------------------------------

    const publicMarker =
        "/public/";


    const publicIndex =
        normalized.indexOf(
            publicMarker
        );


    if (
        publicIndex !== -1
    ) {

        return normalized.substring(
            publicIndex +
            "/public".length
        );

    }


    // ------------------------------------------------------
    // PATH CONTAINING /uploads/images/
    // ------------------------------------------------------

    const imageMarker =
        "/uploads/images/";


    const imageIndex =
        normalized.indexOf(
            imageMarker
        );


    if (
        imageIndex !== -1
    ) {

        return normalized.substring(
            imageIndex
        );

    }


    // ------------------------------------------------------
    // FILENAME ONLY
    // ------------------------------------------------------

    if (
        !normalized.includes("/")
    ) {

        return (
            `/uploads/images/${normalized}`
        );

    }


    // ------------------------------------------------------
    // UNKNOWN VALUE
    // ------------------------------------------------------

    return normalized;

}


// ----------------------------------------------------------
// NORMALIZE IMAGES
// ----------------------------------------------------------

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
            normalizePublicImage
        )

        .filter(
            Boolean
        )

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
// VALIDATE STOCK REPORT ROLE
// ==========================================================
//
// This is intentionally enforced inside the service.
//
// Even if somebody bypasses the controller and directly
// calls the service, an admin cannot create a stock feed
// report.
//
// ==========================================================

function validateStockReportRole(
    role
) {

    if (
        role !== STOCK_REPORT_ROLE
    ) {

        const error =
            new Error(
                "Only a dairy worker can submit a stock report."
            );

        error.status = 403;

        throw error;

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
// GET FEEDS
// ==========================================================

function getFeeds(
    dairy
) {

    if (!dairy) {

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
                    feed?.amount
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
// NORMALIZE STOCK UPDATE
// ==========================================================
//
// Makes the object safe and consistent for EJS.
//
// ==========================================================

function normalizeStockUpdate(
    update
) {

    if (!update) {

        return null;

    }


    const normalized =
        {
            ...update,

            type:
                STOCK_UPDATE_TYPE,

            images:
                normalizeImages(
                    update.images
                ),

            userImage:
                normalizePublicImage(
                    update.userImage
                ),

            likes:
                toNumber(
                    update.likes,
                    0
                ),

            comments:
                Array.isArray(
                    update.comments
                )
                    ? update.comments
                    : []

        };


    /*
     * The stock card can use either text or message.
     *
     * We keep both available so the EJS partial remains
     * flexible.
     */

    if (
        !normalized.text &&
        normalized.message
    ) {

        normalized.text =
            normalized.message;

    }


    return normalized;

}


// ==========================================================
// GET RECENT STOCK REPORTS
// ==========================================================
//
// These are the reports displayed on the Feed Store page.
//
// IMPORTANT:
//
//     type = "stock"
//
// NOT:
//
//     type = "post"
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
                STOCK_UPDATE_TYPE

        })

        .sort({

            createdAt:
                -1

        })

        .limit(
            MAX_RECENT_UPDATES
        )

        .lean();


    if (
        !Array.isArray(
            updates
        )
    ) {

        return [];

    }


    return updates

        .map(
            normalizeStockUpdate
        )

        .filter(
            Boolean
        );

}


// ==========================================================
// GET FEED STORE PAGE DATA
// ==========================================================

async function getFeedStorePageData(
    dairy
) {

    if (!dairy) {

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
// CREATE STOCK FEED REPORT
// ==========================================================
//
// Creates a real chronological feed item:
//
//     type: "stock"
//
// Only dairyWorker is allowed.
//
// Admin DOES NOT create stock feed items.
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

    } = data || {};


    // ------------------------------------------------------
    // ROLE
    // ------------------------------------------------------

    validateStockReportRole(
        role
    );


    // ------------------------------------------------------
    // IDs
    // ------------------------------------------------------

    validateObjectId(
        dairyId,
        "Dairy ID"
    );


    validateObjectId(
        userId,
        "User ID"
    );


    // ------------------------------------------------------
    // FEED STORE
    // ------------------------------------------------------

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
    // REQUIRE REPORT CONTENT
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
                "A stock report must contain report information or at least one image."
            );

        error.status = 400;

        throw error;

    }


    // ======================================================
    // BUILD HUMAN-READABLE FEED TEXT
    // ======================================================
    //
    // The structured fields are also stored separately so
    // stock.ejs can display them as badges/cards.
    //
    // ======================================================

    const reportParts =
        [];


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


    // ======================================================
    // GET USER
    // ======================================================

    const User =
        mongoose.model(
            "User"
        );


    const user =
        await User.findById(
            userId
        )

        .select(
            "name profileImage role"
        )

        .lean();


    if (!user) {

        const error =
            new Error(
                "Submitting user not found."
            );

        error.status = 404;

        throw error;

    }


    /*
     * Double-check the actual database role.
     *
     * This protects against a forged req.user.role.
     */

    if (
        user.role !==
        STOCK_REPORT_ROLE
    ) {

        const error =
            new Error(
                "Only a dairy worker can submit a stock report."
            );

        error.status = 403;

        throw error;

    }


    // ======================================================
    // CREATE STOCK FEED ITEM
    // ======================================================

    const update =
        new Update({

            // ------------------------------------------------
            // FEED IDENTITY
            // ------------------------------------------------

            dairy:
                dairy._id,

            user:
                userId,

            type:
                STOCK_UPDATE_TYPE,


            // ------------------------------------------------
            // AUTHOR
            // ------------------------------------------------

            userName:
                user.name || "",

            userImage:
                normalizePublicImage(
                    user.profileImage
                ),


            // ------------------------------------------------
            // STOCK REPORT
            // ------------------------------------------------

            title:
                "Stock Report",

            text:
                reportText,

            condition:
                cleanCondition,

            feedQuality:
                cleanFeedQuality,

            percentageRemaining:
                remaining,


            // ------------------------------------------------
            // IMAGES
            // ------------------------------------------------

            images:
                cleanImages,


            // ------------------------------------------------
            // FEED ACTIONS
            // ------------------------------------------------
            //
            // These are deliberately initialized so stock
            // items behave like every other feed item.
            //
            // If the Update schema already provides defaults,
            // these values simply remain consistent.
            // ------------------------------------------------

            likes:
                0,

            comments:
                []

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
// ADMIN OPERATION
//
// IMPORTANT:
//
// Restocking changes inventory only.
//
// It DOES NOT create a feed item.
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


    // ------------------------------------------------------
    // IDs
    // ------------------------------------------------------

    validateObjectId(
        dairyId,
        "Dairy ID"
    );


    validateObjectId(
        userId,
        "User ID"
    );


    // ------------------------------------------------------
    // FEED STORE
    // ------------------------------------------------------

    const dairy =
        await findFeedStore(
            dairyId
        );


    // ------------------------------------------------------
    // DETERMINE FEED NAME
    // ------------------------------------------------------

    let name =
        cleanString(
            feedName
        );


    if (
        !name &&
        restockMode ===
        "existing"
    ) {

        name =
            cleanString(
                existingStock
            );

    }


    if (
        !name &&
        restockMode ===
        "new"
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
    // OPTIONAL DATA
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
        restockCost < 0
    ) {

        const error =
            new Error(
                "Restocking cost cannot be negative."
            );

        error.status = 400;

        throw error;

    }


    // ======================================================
    // ENSURE FEEDS ARRAY
    // ======================================================

    const feeds =
        getFeeds(
            dairy
        );


    // ======================================================
    // FIND EXISTING FEED
    // ======================================================

    const normalizedName =
        name.toLowerCase();


    let feed =
        feeds.find(
            item => {

                return (

                    cleanString(
                        item?.name
                    ).toLowerCase() ===
                    normalizedName

                );

            }
        );


    // ======================================================
    // EXISTING FEED
    // ======================================================

    if (feed) {

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
    // SAVE INVENTORY
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
// EXPORTS
// ==========================================================

module.exports = {

    getFeedStorePageData,

    createFeedStoreUpdate,

    restockFeedStore,

    getRecentFeedStoreUpdates,

    calculateFeedsAmount,

    synchronizeFeedsAmount,

    normalizePublicImage,

    normalizeImages

};