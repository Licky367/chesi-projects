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
//     • Normalize uploaded image paths
//
// IMPORTANT
// ----------------------------------------------------------
//
// Dairy is the source of truth for inventory.
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
// IMPORTANT IMAGE RULE
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
// and:
//
//     /uploads/images/a.jpg
//
// and:
//
//     https://example.com/image.jpg
//
// ==========================================================

function normalizePublicImage(
    value
) {

    const image =
        cleanString(value);


    if (!image) {

        return "";

    }


    // ------------------------------------------------------
    // Already an absolute URL
    // ------------------------------------------------------

    if (
        image.startsWith("http://") ||
        image.startsWith("https://")
    ) {

        return image;

    }


    // ------------------------------------------------------
    // Normalize Windows separators
    // ------------------------------------------------------

    const normalized =
        image.replace(
            /\\/g,
            "/"
        );


    // ------------------------------------------------------
    // Already a public browser path
    // ------------------------------------------------------

    if (
        normalized.startsWith("/")
    ) {

        // Absolute filesystem path
        // may still begin with /opt/...
        //
        // Handle public directory below.

        if (
            normalized.includes("/public/")
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
    // Filesystem path containing /public/
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
    // Filesystem path containing uploads/images
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
    // Filename only
    // ------------------------------------------------------

    if (
        !normalized.includes("/")
    ) {

        return `/uploads/images/${normalized}`;

    }


    // ------------------------------------------------------
    // Unknown value
    //
    // Return it unchanged rather than destroying data.
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
        !Array.isArray(images)
    ) {

        return [];

    }


    return images

        .map(
            normalizePublicImage
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
// GET RECENT FEED STORE UPDATES
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

        .sort({
            createdAt: -1
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


    // ------------------------------------------------------
    // Normalize images and user images before sending data
    // to EJS.
    // ------------------------------------------------------

    return updates.map(
        update => {

            return {

                ...update,

                images:
                    normalizeImages(
                        update.images
                    ),

                userImage:
                    normalizePublicImage(
                        update.userImage
                    )

            };

        }
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
// CREATE FEED STORE UPDATE
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
    // BUILD REPORT
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
    // GET USER
    // ------------------------------------------------------

    const User =
        mongoose.model(
            "User"
        );


    const user =
        await User.findById(
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
                normalizePublicImage(
                    user?.profileImage
                ),

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
    // DETERMINE FEED NAME
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


    // ------------------------------------------------------
    // ENSURE FEEDS
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

    calculateFeedsAmount,

    normalizePublicImage,

    normalizeImages

};