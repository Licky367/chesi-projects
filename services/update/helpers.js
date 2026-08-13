// ==========================================================
// services/update/helpers.js
// ==========================================================

const Milk =
  require("../../models/milk");


// ==========================================================
// DATE HELPERS
// ==========================================================

function formatDate(date) {

  if (!date) return "";

  return new Intl.DateTimeFormat("en-KE", {

    timeZone: "Africa/Nairobi",

    year: "numeric",

    month: "short",

    day: "numeric",

    hour: "2-digit",

    minute: "2-digit",

    hour12: false

  }).format(
    new Date(date)
  );

}


function getDayKey(
  date = new Date()
) {

  return new Date(date)
    .toISOString()
    .split("T")[0];

}


function getMonthKey(
  date = new Date()
) {

  return getDayKey(date)
    .slice(0, 7);

}


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

  monday.setDate(diff);

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
// FEED FORMATTERS
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
// FORMAT FEED ITEM
// ==========================================================
//
// Every Update now has its related Dairy populated by:
//
//     pageService.js
//
// Example:
//
//     Update
//         dairy -> Cow Shed C
//
// The formatter exposes that information directly on the
// feed item so EJS views do not need to understand the
// populated MongoDB document.
//
// Available properties:
//
//     item.dairyId
//     item.dairyName
//     item.dairyCode
//     item.dairyAssetCode
//     item.dairyImage
//     item.dairyIsFarm
//     item.dairyIsAnimal
//     item.dairyIsStructure
//
// ==========================================================

function formatFeed(update) {

  const item =

    typeof update.toObject === "function"

      ? update.toObject()

      : update;


  // ========================================================
  // USER
  // ========================================================

  item.userId =
    item.user || null;


  // ========================================================
  // DATE
  // ========================================================

  item.dateText =
    formatDate(
      item.createdAt
    );


  // ========================================================
  // LIKES
  // ========================================================

  item.likes =
    Array.isArray(
      item.likes
    )

      ? item.likes.length

      : 0;


  // ========================================================
  // COMMENTS
  // ========================================================

  item.comments =

    Array.isArray(
      item.comments
    )

      ? item.comments.map(
          formatComment
        )

      : [];


  // ========================================================
  // RELATED DAIRY / ASSET
  // ========================================================
  //
  // pageService.js populates:
  //
  //     dairy:
  //         name
  //         code
  //         assetCode
  //         profileImage
  //
  // The populated document can therefore be used to
  // identify exactly what the post/update is about.
  //
  // ========================================================

  const relatedDairy =
    item.dairy;


  // ========================================================
  // RELATED DAIRY ID
  // ========================================================

  if (
    relatedDairy &&
    relatedDairy._id
  ) {

    item.dairyId =
      relatedDairy._id;

  } else {

    item.dairyId =
      item.dairy || null;

  }


  // ========================================================
  // RELATED DAIRY NAME
  // ========================================================

  item.dairyName =

    relatedDairy &&
    relatedDairy.name

      ? relatedDairy.name

      : "";


  // ========================================================
  // RELATED DAIRY CODE
  // ========================================================

  item.dairyCode =

    relatedDairy &&
    relatedDairy.code !== undefined

      ? relatedDairy.code

      : null;


  // ========================================================
  // RELATED DAIRY ASSET CODE
  // ========================================================

  item.dairyAssetCode =

    relatedDairy &&
    relatedDairy.assetCode !== undefined

      ? relatedDairy.assetCode

      : null;


  // ========================================================
  // RELATED DAIRY IMAGE
  // ========================================================

  item.dairyImage =

    relatedDairy &&
    relatedDairy.profileImage

      ? relatedDairy.profileImage

      : "";


  // ========================================================
  // RELATED DAIRY TYPE
  // ========================================================

  item.dairyIsFarm =

    item.dairyCode !== null &&

    item.dairyCode !== undefined &&

    Number(
      item.dairyCode
    ) < 0;


  item.dairyIsAnimal =

    item.dairyCode !== null &&

    item.dairyCode !== undefined &&

    Number(
      item.dairyCode
    ) > 0;


  item.dairyIsStructure =

    item.dairyCode === null ||

    item.dairyCode === undefined;


  // ========================================================
  // POST
  // ========================================================

  if (
    item.type === "post"
  ) {

    item.title = "";

  }


  // ========================================================
  // MEDICAL
  // ========================================================

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


  // ========================================================
  // MAINTENANCE
  // ========================================================

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


  // ========================================================
  // RETURN FORMATTED ITEM
  // ========================================================

  return item;

}


// ==========================================================
// WEEKLY MILK FEED
// ==========================================================

async function buildWeeklyMilkFeeds(
  dairyId
) {

  const records =
    await Milk.find({

      dairy:
        dairyId

    })

      .sort({

        date: 1

      })

      .lean();


  if (
    !records.length
  ) {

    return [];

  }


  const weeks = {};


  // ========================================================
  // GROUP RECORDS BY WEEK
  // ========================================================

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

        days: {}

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


  // ========================================================
  // BUILD WEEKLY FEED ITEMS
  // ========================================================

  return Object
    .values(weeks)
    .map(
      week => {

        // ================================================
        // DAILY TOTALS
        // ================================================

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
                    week
                      .days[day]
                      .toFixed(2)
                  )

              })
            );


        // ================================================
        // WEEK TOTAL
        // ================================================

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


        // ================================================
        // WEEK AVERAGE
        // ================================================

        const average =

          days.length

            ? Number(
                (
                  total /
                  days.length
                ).toFixed(2)
              )

            : 0;


        // ================================================
        // RETURN MILK FEED
        // ================================================

        return {

          _id:
            `weekly-${getDayKey(
              week.start
            )}`,

          type:
            "milk",

          userId:
            null,

          userName:
            "System",

          userImage:
            "",

          createdAt:
            week.end,

          dateText:
            formatDate(
              week.end
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

          comments: []

        };

      }
    );

}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

  formatDate,

  getDayKey,

  getMonthKey,

  getWeekRange,

  formatComment,

  formatFeed,

  buildWeeklyMilkFeeds

};