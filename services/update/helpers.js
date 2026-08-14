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
//
// Used specifically by weekly milk reports.
//
// Unlike formatDate(), this intentionally does NOT include
// the time because the weekly report date represents the
// first day of the week being summarized.
//
// Example:
//
//     Aug 10, 2026
//
// rather than:
//
//     Aug 10, 2026, 00:00
//
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
//
// Returns:
//
//     start = Monday 00:00:00.000
//     end   = Sunday 23:59:59.999
//
// Example:
//
//     Monday Aug 10
//     through
//     Sunday Aug 16
//
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
// pageService.js populates:
//
//     item.dairy
//
// with:
//
//     name
//     code
//     assetCode
//     profileImage
//
// This formatter exposes the populated Dairy / asset as:
//
//     dairyId
//     dairyName
//     dairyCode
//     dairyAssetCode
//     dairyImage
//
// It also preserves:
//
//     userName
//
// so post.ejs can display:
//
//     Nelson updated about Cow Shed C
//     Aug 14, 2026, 10:35
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


    // ------------------------------------------------------
    // PRESERVE POST OWNER NAME
    // ------------------------------------------------------

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
    // pageService.js has already populated:
    //
    //     item.dairy
    //
    // Therefore no additional database query is required.
    //
    // ======================================================

    if (
        item.dairy
    ) {

        // --------------------------------------------------
        // Dairy / Asset ID
        // --------------------------------------------------

        item.dairyId =
            item.dairy._id || null;


        // --------------------------------------------------
        // Dairy / Asset Name
        // --------------------------------------------------

        item.dairyName =
            item.dairy.name || "";


        // --------------------------------------------------
        // Dairy / Asset Code
        // --------------------------------------------------

        item.dairyCode =
            item.dairy.code !== undefined

                ? item.dairy.code

                : null;


        // --------------------------------------------------
        // Parent Farm Code
        // --------------------------------------------------

        item.dairyAssetCode =
            item.dairy.assetCode !== undefined

                ? item.dairy.assetCode

                : null;


        // --------------------------------------------------
        // Dairy / Asset Image
        // --------------------------------------------------

        item.dairyImage =
            item.dairy.profileImage || "";

    }

    else {

        // --------------------------------------------------
        // No populated Dairy
        // --------------------------------------------------

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
    // POST
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
    // RETURN FORMATTED FEED ITEM
    // ======================================================

    return item;

}


// ==========================================================
// WEEKLY MILK FEED
// ==========================================================
//
// Builds weekly milk reports for a specific Dairy / asset.
//
// Each generated weekly feed contains:
//
//     dairyId
//     dairyName
//
// The weekly report date represents the FIRST DAY of the
// week being summarized.
//
// Example:
//
//     Week:
//         Monday Aug 10
//         through
//         Sunday Aug 16
//
// Report timestamp:
//
//     Aug 10, 2026
//
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

                    // --------------------------------------
                    // UNIQUE WEEKLY FEED ID
                    // --------------------------------------

                    _id:
                        `weekly-${dairy._id}-${getDayKey(
                            week.start
                        )}`,


                    // --------------------------------------
                    // TYPE
                    // --------------------------------------

                    type:
                        "milk",


                    // --------------------------------------
                    // DAIRY / ASSET
                    // --------------------------------------

                    dairyId:
                        dairy._id,

                    dairyName:
                        dairy.name || "",


                    // --------------------------------------
                    // USER
                    // --------------------------------------

                    userId:
                        null,

                    userName:
                        "System",

                    userImage:
                        "",


                    // --------------------------------------
                    // DATE
                    // --------------------------------------
                    //
                    // IMPORTANT:
                    //
                    // The weekly report is dated using
                    // the FIRST DAY of the week.
                    //
                    // It must NOT use week.end.
                    //
                    // --------------------------------------

                    createdAt:
                        week.start,

                    dateText:
                        formatWeekStart(
                            week.start
                        ),


                    // --------------------------------------
                    // TITLE
                    // --------------------------------------

                    title:
                        "Weekly Production Summary",


                    // --------------------------------------
                    // WEEK RANGE
                    // --------------------------------------

                    weekStart:
                        getDayKey(
                            week.start
                        ),

                    weekEnd:
                        getDayKey(
                            week.end
                        ),


                    // --------------------------------------
                    // DAILY PRODUCTION
                    // --------------------------------------

                    days,


                    // --------------------------------------
                    // TOTAL PRODUCTION
                    // --------------------------------------

                    total:
                        Number(
                            total.toFixed(2)
                        ),


                    // --------------------------------------
                    // AVERAGE PRODUCTION
                    // --------------------------------------

                    average,


                    // --------------------------------------
                    // SOCIAL DATA
                    // --------------------------------------

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