// ==========================================================
// services/update/helpers.js
// ==========================================================
//
// UPDATE / FEED HELPERS
//
// RESPONSIBILITIES:
//
// • Date formatting
// • Week calculations
// • Comment formatting
// • Normal Update feed formatting
// • Animal-feed / stock-update feed-card formatting
// • Weekly milk feed generation
//
// IMPORTANT
// ----------------------------------------------------------
//
// `animalFeeds` is CURRENT AGROSTORE INVENTORY.
//
// `feed` is HISTORICAL ACTIVITY.
//
// An animal-feed stock update is represented by:
//
//     Update.type
//         = "animalFeed"
//
//     Update.dairy
//         = stock Dairy._id
//
//     Update.animalFeed.storageId
//         = AgroStore._id
//
// Therefore:
//
//     stock-update.ejs
//         = FEED CARD
//
// It is NOT the AgroStore inventory view.
//
// ==========================================================


const Milk =
    require("../../models/milk");


const Dairy =
    require("../../models/dairy");


// ==========================================================
// CONSTANTS
// ==========================================================

const NAIROBI_TIMEZONE =
    "Africa/Nairobi";


// ==========================================================
// DATE HELPERS
// ==========================================================

function formatDate(date) {

    if (!date) {

        return "";

    }


    const parsedDate =
        new Date(date);


    if (
        Number.isNaN(
            parsedDate.getTime()
        )
    ) {

        return "";

    }


    return new Intl.DateTimeFormat(
        "en-KE",
        {
            timeZone:
                NAIROBI_TIMEZONE,

            year:
                "numeric",

            month:
                "short",

            day:
                "numeric",

            hour:
                "2-digit",

            minute:
                "2-digit",

            hour12:
                false
        }
    ).format(
        parsedDate
    );

}


// ==========================================================
// WEEK START DATE FORMATTER
// ==========================================================

function formatWeekStart(date) {

    if (!date) {

        return "";

    }


    const parsedDate =
        new Date(date);


    if (
        Number.isNaN(
            parsedDate.getTime()
        )
    ) {

        return "";

    }


    return new Intl.DateTimeFormat(
        "en-KE",
        {
            timeZone:
                NAIROBI_TIMEZONE,

            year:
                "numeric",

            month:
                "short",

            day:
                "numeric"
        }
    ).format(
        parsedDate
    );

}


// ==========================================================
// DAY KEY
// ==========================================================
//
// Returns:
//
//     YYYY-MM-DD
//
// IMPORTANT
// ----------------------------------------------------------
//
// The application uses Africa/Nairobi time.
// Therefore the day key should also represent the Nairobi
// calendar day instead of relying on UTC.
//
// ==========================================================

function getDayKey(
    date = new Date()
) {

    const parsedDate =
        new Date(date);


    if (
        Number.isNaN(
            parsedDate.getTime()
        )
    ) {

        return "";

    }


    const parts =
        new Intl.DateTimeFormat(
            "en-CA",
            {
                timeZone:
                    NAIROBI_TIMEZONE,

                year:
                    "numeric",

                month:
                    "2-digit",

                day:
                    "2-digit"
            }
        ).formatToParts(
            parsedDate
        );


    const values = {};


    for (
        const part of parts
    ) {

        if (
            part.type !== "literal"
        ) {

            values[part.type] =
                part.value;

        }

    }


    return [

        values.year,

        values.month,

        values.day

    ].join("-");

}


// ==========================================================
// MONTH KEY
// ==========================================================
//
// Returns:
//
//     YYYY-MM
//
// ==========================================================

function getMonthKey(
    date = new Date()
) {

    const dayKey =
        getDayKey(
            date
        );


    if (!dayKey) {

        return "";

    }


    return dayKey.slice(
        0,
        7
    );

}


// ==========================================================
// WEEK RANGE
// ==========================================================
//
// Returns the Monday → Sunday range containing the supplied
// date.
//
// IMPORTANT
// ----------------------------------------------------------
//
// The returned Date objects represent the local calendar
// calculation. This is suitable for grouping historical
// records by week.
//
// ==========================================================

function getWeekRange(
    date = new Date()
) {

    const current =
        new Date(date);


    if (
        Number.isNaN(
            current.getTime()
        )
    ) {

        return {

            start:
                new Date(NaN),

            end:
                new Date(NaN)

        };

    }


    const day =
        current.getDay();


    const diff =
        current.getDate() -
        day +
        (
            day === 0
                ? -6
                : 1
        );


    const monday =
        new Date(
            current
        );


    monday.setDate(
        diff
    );


    monday.setHours(
        0,
        0,
        0,
        0
    );


    const sunday =
        new Date(
            monday
        );


    sunday.setDate(
        monday.getDate() + 6
    );


    sunday.setHours(
        23,
        59,
        59,
        999
    );


    return {

        start:
            monday,

        end:
            sunday

    };

}


// ==========================================================
// COMMENT FORMATTER
// ==========================================================

function formatComment(
    comment
) {

    if (!comment) {

        return null;

    }


    return {

        _id:
            comment._id || null,

        userId:
            comment.userId || null,

        userName:
            comment.userName || "User",

        userImage:
            comment.userImage || "",

        text:
            comment.text || "",

        createdAt:
            comment.createdAt || null,

        dateText:
            formatDate(
                comment.createdAt
            )

    };

}


// ==========================================================
// NUMBER HELPER
// ==========================================================

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


// ==========================================================
// FORMAT ANIMAL FEED / STOCK UPDATE
// ==========================================================
//
// IMPORTANT
// ----------------------------------------------------------
//
// This function formats the HISTORICAL stock update stored
// inside:
//
//     Update.animalFeed
//
// It is specifically intended for:
//
//     stock-update.ejs
//
// It does NOT load current stock.
//
// It does NOT modify animalFeeds.
//
// It does NOT use AgroStore as Update.dairy.
//
// ==========================================================

function formatAnimalFeed(
    item
) {

    if (
        !item.animalFeed
    ) {

        return item;

    }


    const stock =
        item.animalFeed;


    // ======================================================
    // QUANTITIES
    // ======================================================

    const previousQuantity =
        toNumber(
            stock.previousQuantity
        );


    const quantity =
        toNumber(
            stock.quantity
        );


    const quantityChange =
        quantity -
        previousQuantity;


    // ======================================================
    // STOCK ID
    // ======================================================

    item.feedId =
        stock.feedId || null;


    // ======================================================
    // STORAGE / AGROSTORE
    // ======================================================

    item.storageId =
        stock.storageId || null;


    item.storageName =
        stock.storageName || "";


    // ======================================================
    // STOCK INFORMATION
    // ======================================================

    item.feedName =
        stock.feedName || "";


    item.feedType =
        stock.feedType || "";


    item.roomNumber =
        stock.roomNumber !== null &&
        stock.roomNumber !== undefined

            ? toNumber(
                stock.roomNumber,
                null
            )

            : null;


    // ======================================================
    // QUANTITY INFORMATION
    // ======================================================

    item.previousQuantity =
        previousQuantity;


    item.quantity =
        quantity;


    item.quantityChange =
        quantityChange;


    item.unit =
        stock.unit || "";


    // ======================================================
    // NOTE
    // ======================================================

    item.stockUpdateNote =
        stock.stockUpdateNote || "";


    // ======================================================
    // IMAGES
    // ======================================================

    item.stockUpdateImages =

        Array.isArray(
            stock.images
        )

            ? stock.images
                .filter(Boolean)
                .map(
                    image =>
                        String(
                            image
                        ).trim()
                )
                .filter(Boolean)

            : [];


    // ======================================================
    // RECORDER
    // ======================================================
    //
    // These are snapshots stored at the time the stock update
    // occurred.
    //
    // Do NOT depend on the current User document for the
    // historical display.
    //
    // ======================================================

    item.recordedBy =
        stock.recordedBy || null;


    item.recordedByName =
        stock.recordedByName ||
        item.userName ||
        "User";


    item.recordedByImage =
        stock.recordedByImage ||
        item.userImage ||
        "";


    item.recordedAt =
        stock.recordedAt ||
        item.createdAt ||
        null;


    item.recordedAtText =
        formatDate(
            item.recordedAt
        );


    // ======================================================
    // MOVEMENT
    // ======================================================
    //
    // Positive:
    //     stock increased
    //
    // Negative:
    //     stock decreased
    //
    // Zero:
    //     unchanged
    //
    // ======================================================

    if (
        quantityChange > 0
    ) {

        item.stockMovement =
            "increase";

    }

    else if (
        quantityChange < 0
    ) {

        item.stockMovement =
            "decrease";

    }

    else {

        item.stockMovement =
            "unchanged";

    }


    // ======================================================
    // HUMAN-READABLE MOVEMENT
    // ======================================================

    item.stockMovementAmount =
        Math.abs(
            quantityChange
        );


    // ======================================================
    // FEED-CARD TITLE
    // ======================================================

    item.title =
        item.title ||
        "Stock Updated";


    // ======================================================
    // FEED-CARD DESCRIPTION
    // ======================================================

    item.description =
        item.stockUpdateNote;


    // ======================================================
    // FEED-CARD USER
    // ======================================================
    //
    // The feed card should display the person who actually
    // recorded the stock update.
    //
    // ======================================================

    item.userName =
        item.recordedByName ||
        item.userName ||
        "User";


    item.userImage =
        item.recordedByImage ||
        item.userImage ||
        "";


    item.userId =
        item.recordedBy ||
        item.userId ||
        null;


    return item;

}


// ==========================================================
// FEED FORMATTER
// ==========================================================
//
// Converts Update documents into the common object used by
// the feed EJS files.
//
// Supported feed types:
//
//     post
//     comment
//     image
//     medical
//     maintenance
//     assetAdd
//     animalFeed
//
// IMPORTANT
// ----------------------------------------------------------
//
// `animalFeed` is a HISTORICAL FEED CARD.
//
// It is not the current AgroStore inventory.
//
// ==========================================================

function formatFeed(
    update
) {

    if (!update) {

        return null;

    }


    const item =

        typeof update.toObject === "function"

            ? update.toObject()

            : {

                ...update

            };


    // ======================================================
    // USER
    // ======================================================

    item.userId =
        item.user || null;


    item.userName =
        item.userName ||
        "User";


    item.userImage =
        item.userImage ||
        "";


    // ======================================================
    // AUTHOR ROLE
    // ======================================================

    item.authorRole =
        item.authorRole ||
        "";


    // ======================================================
    // DATE
    // ======================================================

    item.dateText =
        formatDate(
            item.createdAt
        );


    // ======================================================
    // DAIRY / ASSET SUBJECT
    // ======================================================
    //
    // pageService.js populates item.dairy with:
    //
    //     name
    //     code
    //     assetCode
    //     profileImage
    //
    // ======================================================

    if (
        item.dairy
    ) {

        item.dairyId =
            item.dairy._id ||
            null;


        item.dairyName =
            item.dairy.name ||
            "";


        item.dairyCode =

            item.dairy.code !==
            undefined

                ? item.dairy.code

                : null;


        item.dairyAssetCode =

            item.dairy.assetCode !==
            undefined

                ? item.dairy.assetCode

                : null;


        item.dairyImage =
            item.dairy.profileImage ||
            "";

    }

    else {

        item.dairyId =
            null;

        item.dairyName =
            "";

        item.dairyCode =
            null;

        item.dairyAssetCode =
            null;

        item.dairyImage =
            "";

    }


    // ======================================================
    // LIKES
    // ======================================================

    item.likes =
        Array.isArray(
            item.likes
        )

            ? item.likes.length

            : 0;


    // ======================================================
    // COMMENTS
    // ======================================================

    item.comments =

        Array.isArray(
            item.comments
        )

            ? item.comments
                .map(
                    formatComment
                )
                .filter(Boolean)

            : [];


    // ======================================================
    // NORMAL POST
    // ======================================================

    if (
        item.type === "post"
    ) {

        item.title =
            item.title || "";

    }


    // ======================================================
    // IMAGE UPDATE
    // ======================================================

    if (
        item.type === "image"
    ) {

        item.title =
            item.title ||
            "Image Update";

    }


    // ======================================================
    // COMMENT UPDATE
    // ======================================================

    if (
        item.type === "comment"
    ) {

        item.title =
            item.title ||
            "Comment";

    }


    // ======================================================
    // MEDICAL
    // ======================================================

    if (
        item.type === "medical" &&
        item.medical
    ) {

        item.status =
            item.medical.status ||
            "";


        item.title =
            item.medical.type ||
            "Medical Update";


        item.details =
            item.medical.details ||
            "";


        item.description =

            item.medical.status ===
            "cleared"

                ? (
                    item.medical.clearDescription ||
                    ""
                )

                : (
                    item.medical.details ||
                    ""
                );


        item.charges =
            toNumber(
                item.medical.charges
            );

    }


    // ======================================================
    // MAINTENANCE
    // ======================================================

    if (
        item.type === "maintenance" &&
        item.maintenance
    ) {

        item.status =
            item.maintenance.status ||
            "";


        item.maintenanceType =
            item.maintenance.type ||
            "";


        item.description =

            item.maintenance.status ===
            "cleared"

                ? (
                    item.maintenance.clearDescription ||
                    ""
                )

                : (
                    item.maintenance.description ||
                    ""
                );


        item.charges =
            toNumber(
                item.maintenance.charges
            );

    }


    // ======================================================
    // ASSET ADDED
    // ======================================================
    //
    // Update type:
    //
    //     assetAdd
    //
    // NOT:
    //
    //     asset
    //
    // ======================================================

    if (
        item.type === "assetAdd"
    ) {

        const asset =
            item.asset ||
            {};


        item.assetId =
            asset.assetId ||
            null;


        item.assetName =
            asset.name ||
            item.dairyName ||
            "New Asset";


        item.assetType =
            asset.type ||
            "";


        item.buyingPrice =
            toNumber(
                asset.buyingPrice
            );


        item.currentWorth =
            toNumber(
                asset.currentWorth
            );


        item.description =
            asset.description ||
            "";


        item.condition =
            asset.condition ||
            "";


        item.location =
            asset.location ||
            "";


        item.assetStatus =
            asset.status ||
            "active";


        item.assetCode =
            asset.assetCode !== null &&
            asset.assetCode !== undefined

                ? asset.assetCode

                : null;


        item.parentDairyId =
            asset.parentDairyId ||
            null;


        item.parentDairyName =
            asset.parentDairyName ||
            "";


        item.parentDairyCode =

            asset.parentDairyCode !==
            null &&

            asset.parentDairyCode !==
            undefined

                ? asset.parentDairyCode

                : null;


        item.title =
            item.title ||
            "New Asset Added";

    }


    // ======================================================
    // ANIMAL FEED / STOCK UPDATE
    // ======================================================
    //
    // THIS IS THE IMPORTANT STOCK FEED-CARD HANDLING.
    //
    // stock-update.ejs receives the formatted fields from
    // formatAnimalFeed().
    //
    // The current inventory is NOT loaded here.
    //
    // ======================================================

    if (
        item.type === "animalFeed"
    ) {

        formatAnimalFeed(
            item
        );

    }


    // ======================================================
    // RETURN FORMATTED FEED ITEM
    // ======================================================

    return item;

}


// ==========================================================
// WEEKLY MILK FEED
// ==========================================================
//
// Creates a historical weekly production feed item.
//
// This is separate from Update documents.
//
// ==========================================================

async function buildWeeklyMilkFeeds(
    dairyId
) {

    // ======================================================
    // GET DAIRY
    // ======================================================

    const dairy =
        await Dairy.findById(
            dairyId
        )
        .select(
            "_id name code assetCode profileImage"
        )
        .lean();


    // ======================================================
    // DAIRY NOT FOUND
    // ======================================================

    if (!dairy) {

        return [];

    }


    // ======================================================
    // GET MILK RECORDS
    // ======================================================

    const records =
        await Milk.find({

            dairy:
                dairyId

        })
        .sort({

            date:
                1

        })
        .lean();


    // ======================================================
    // NO RECORDS
    // ======================================================

    if (
        !records.length
    ) {

        return [];

    }


    const weeks = {};


    // ======================================================
    // GROUP RECORDS INTO WEEKS
    // ======================================================

    for (
        const record of records
    ) {

        const week =
            getWeekRange(
                record.date
            );


        const weekKey =
            getDayKey(
                week.start
            );


        if (
            !weeks[weekKey]
        ) {

            weeks[weekKey] = {

                start:
                    week.start,

                end:
                    week.end,

                days:
                    {}

            };

        }


        const dayKey =

            record.day ||

            getDayKey(
                record.date
            );


        weeks[weekKey]
            .days[dayKey] =

            (
                weeks[weekKey]
                    .days[dayKey] ||
                0
            ) +

            toNumber(
                record.liters
            );

    }


    // ======================================================
    // BUILD WEEKLY FEED ITEMS
    // ======================================================

    return Object
        .values(
            weeks
        )
        .map(
            week => {

                // ==========================================
                // DAILY TOTALS
                // ==========================================

                const days =

                    Object.keys(
                        week.days
                    )

                    .sort()

                    .map(
                        day => ({

                            day,

                            total:
                                Number(
                                    toNumber(
                                        week.days[day]
                                    )
                                    .toFixed(2)
                                )

                        })
                    );


                // ==========================================
                // WEEK TOTAL
                // ==========================================

                const total =
                    days.reduce(

                        (
                            sum,
                            day
                        ) =>

                            sum +
                            day.total,

                        0

                    );


                // ==========================================
                // DAILY AVERAGE
                // ==========================================

                const average =

                    days.length

                        ? Number(
                            (
                                total /
                                days.length
                            ).toFixed(2)
                        )

                        : 0;


                // ==========================================
                // RETURN WEEKLY FEED
                // ==========================================

                return {

                    _id:
                        `weekly-${dairy._id}-${getDayKey(
                            week.start
                        )}`,

                    type:
                        "milk",

                    dairyId:
                        dairy._id,

                    dairyName:
                        dairy.name ||
                        "",

                    dairyCode:

                        dairy.code !==
                        undefined

                            ? dairy.code

                            : null,

                    dairyAssetCode:

                        dairy.assetCode !==
                        undefined

                            ? dairy.assetCode

                            : null,

                    dairyImage:
                        dairy.profileImage ||
                        "",

                    userId:
                        null,

                    userName:
                        "System",

                    userImage:
                        "",

                    authorRole:
                        "system",

                    createdAt:
                        week.start,

                    dateText:
                        formatWeekStart(
                            week.start
                        ),

                    title:
                        "Weekly Production Summary",

                    weekStart:
                        getDayKey(
                            week.start
                        ),

                    weekEnd:
                        getDayKey(
                            week.end
                        ),

                    days,

                    total:
                        Number(
                            total.toFixed(2)
                        ),

                    average,

                    likes:
                        0,

                    comments:
                        []

                };

            }
        );

}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    formatDate,

    formatWeekStart,

    getDayKey,

    getMonthKey,

    getWeekRange,

    formatComment,

    formatAnimalFeed,

    formatFeed,

    buildWeeklyMilkFeeds

};