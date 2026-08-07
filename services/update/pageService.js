// ==========================================================
// services/update/pageService.js
// ==========================================================

const Dairy = require("../../models/dairy");
const Update = require("../../models/Update");

const {
  formatFeed,
  buildWeeklyMilkFeeds
} = require("./helpers");

/* ==========================================================
   🟨 GET COMPLETE DAIRY PAGE
========================================================= */
exports.getDairyPage = async (id) => {

  const dairy = await Dairy.findById(id);

  if (!dairy) {

    throw new Error(
      "Dairy profile not found."
    );

  }

  const updates = await Update.find({

    dairy: id

  })

    .sort({

      createdAt: -1

    });

  const feed = updates.map(formatFeed);

  const weeklyFeeds =
    await buildWeeklyMilkFeeds(id);

  feed.push(...weeklyFeeds);

  feed.sort(

    (a, b) =>

      new Date(b.createdAt) -
      new Date(a.createdAt)

  );

  let commentCount = 0;

  for (const item of feed) {

    if (
      Array.isArray(item.comments)
    ) {

      commentCount +=
        item.comments.length;

    }

  }

  return {

    dairy,

    feed,

    weeklyFeeds,

    commentCount

  };

};