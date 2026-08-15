// ==========================================================
// services/update/helpers.js
// ==========================================================

const Milk =
    require("../../models/milk");

const Dairy =
    require("../../models/dairy");


// ==========================================================
// DATE HELPERS
// ==========================================================

function formatDate(date) {

    if (!date) return "";

    return new Intl.DateTimeFormat(
        "en-KE",
        {
            timeZone:
                "Africa/Nairobi",

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
        new Date(date)
    );

}


// ==========================================================
// WEEK START DATE FORMATTER
// ==========================================================

function formatWeekStart(date) {

    if (!date) return "";

    return new Intl.DateTimeFormat(
        "en-KE",
        {
            timeZone:
                "Africa/Nairobi",

            year:
                "numeric",

            month:
                "short",

            day:
                "numeric"
        }
    ).format(
        new Date(date)
    );

}


// ==========================================================
// DAY KEY
// ==========================================================

function getDayKey(
    date = new Date()
) {

    return new Date(date)
        .toISOString()
        .split("T")[0];

}


// ==========================================================
// MONTH KEY
// ==========================================================

function getMonthKey(
    date = new Date()
) {

    return getDayKey(date)
        .slice(0, 7);

}


// ==========================================================
// WEEK RANGE
// ==========================================================

function getWeekRange(
    date = new Date()
) {

    const current =
        new Date(date);

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
        new Date(current);

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
        new Date(monday);

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

    return {

        _id:
            comment._id,

        userId:
            comment.userId,

        userName:
            comment.userName,

        userImage:
            comment.userImage || "",

        text:
            comment.text,

        createdAt:
            comment.createdAt,

        dateText:
            formatDate(
                comment.createdAt
            )

    };

}


// ==========================================================
// FEED FORMATTER
// ==========================================================
//
// Converts Update documents into the common object used
// by the feed EJS files.
//
// Supported feed types:
//
//     post
//     comment
//     image
//     medical
//     maintenance
//     asset
//
// ==========================================================

function formatFeed(
    update
) {

    const item =

        typeof update.toObject === "function"

            ? update.toObject()

            : update;


    // ======================================================
    // USER
    // ======================================================

    item.userId =
        item.user || null;


    item.userName =
        item.userName || "User";


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
            item.dairy._id || null;


        item.dairyName =
            item.dairy.name || "";


        item.dairyCode =
            item.dairy.code !== undefined

                ? item.dairy.code

                : null;


        item.dairyAssetCode =
            item.dairy.assetCode !== undefined

                ? item.dairy.assetCode

                : null;


        item.dairyImage =
            item.dairy.profileImage || "";

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

            ? item.comments.map(
                formatComment
            )

            : [];


    // ======================================================
    // NORMAL POST
    // ======================================================

    if (
        item.type === "post"
    ) {

        item.title =
            "";

    }


    // ======================================================
    // MEDICAL
    // ======================================================

    if (
        item.type === "medical" &&
        item.medical
    ) {

        item.status =
            item.medical.status;


        item.title =
            item.medical.type;


        item.details =
            item.medical.details;


        item.description =

            item.medical.status === "cleared"

                ? item.medical.clearDescription

                : item.medical.details;


        item.charges =
            item.medical.charges || 0;

    }


    // ======================================================
    // MAINTENANCE
    // ======================================================

    if (
        item.type === "maintenance" &&
        item.maintenance
    ) {

        item.status =
            item.maintenance.status;


        item.maintenanceType =
            item.maintenance.type;


        item.description =

            item.maintenance.status === "cleared"

                ? item.maintenance.clearDescription

                : item.maintenance.description;


        item.charges =
            item.maintenance.charges || 0;

    }


    // ======================================================
    // ASSET ADDED
    // ======================================================
    //
    // This is the feed type used by addAsset.ejs.
    //
    // The asset itself is represented by item.dairy
    // because an asset is a Dairy document.
    //
    // Example:
    //
    //     A new asset was added
    //
    //     Asset:
    //         Generator
    //
    //     Type:
    //         Generator
    //
    //     Current Worth:
    //         KES 150,000
    //
    // ======================================================

    if (
        item.type === "asset"
    ) {

        // --------------------------------------------------
        // Asset name
        // --------------------------------------------------

        item.assetName =

            item.assetName ||

            item.dairyName ||

            "New Asset";


        // --------------------------------------------------
        // Asset type
        // --------------------------------------------------

        item.assetType =
            item.assetType ||
            item.asset?.type ||
            item.dairy?.type ||
            "";


        // --------------------------------------------------
        // Buying price
        // --------------------------------------------------

        item.buyingPrice =
            Number(
                item.buyingPrice ||
                (
                    item.asset &&
                    item.asset.buyingPrice
                ) ||
                0
            );


        // --------------------------------------------------
        // Current worth
        // --------------------------------------------------

        item.currentWorth =
            Number(
                item.currentWorth ||
                (
                    item.asset &&
                    item.asset.currentWorth
                ) ||
                0
            );


        // --------------------------------------------------
        // Description
        // --------------------------------------------------

        item.description =
            item.description ||
            (
                item.asset &&
                item.asset.description
            ) ||
            item.dairy?.description ||
            "";


        // --------------------------------------------------
        // Condition
        // --------------------------------------------------

        item.condition =
            item.condition ||
            (
                item.asset &&
                item.asset.condition
            ) ||
            item.dairy?.condition ||
            "";


        // --------------------------------------------------
        // Physical location
        // --------------------------------------------------

        item.location =
            item.location ||
            (
                item.asset &&
                item.asset.location
            ) ||
            item.dairy?.location ||
            "";


        // --------------------------------------------------
        // Status
        // --------------------------------------------------

        item.assetStatus =
            item.assetStatus ||
            (
                item.asset &&
                item.asset.status
            ) ||
            item.dairy?.status ||
            "active";


        // --------------------------------------------------
        // Keep a simple title for the EJS
        // --------------------------------------------------

        item.title =
            "New Asset Added";

    }


    // ======================================================
    // RETURN FORMATTED FEED ITEM
    // ======================================================

    return item;

}


// ==========================================================
// WEEKLY MILK FEED
// ==========================================================

async function buildWeeklyMilkFeeds(
    dairyId
) {

    // ======================================================
    // GET DAIRY / ASSET
    // ======================================================

    const dairy =
        await Dairy.findById(
            dairyId
        )
        .select(
            "_id name"
        )
        .lean();


    // ======================================================
    // DAIRY NOT FOUND
    // ======================================================

    if (
        !dairy
    ) {

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
                    .days[dayKey] || 0
            ) +

            Number(
                record.liters || 0
            );

    }


    // ======================================================
    // BUILD WEEKLY FEED ITEMS
    // ======================================================

    return Object
        .values(weeks)
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
                                    week.days[day]
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
                            d
                        ) =>

                            sum +
                            d.total,

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
                        dairy.name || "",

                    userId:
                        null,

                    userName:
                        "System",

                    userImage:
                        "",

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

    formatFeed,

    buildWeeklyMilkFeeds

};