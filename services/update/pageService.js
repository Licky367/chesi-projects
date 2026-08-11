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

/* ========================================================
GET CURRENT DAIRY
======================================================== */

const dairy = await Dairy.findById(id);

if (!dairy) {

throw new Error(
  "Dairy profile not found."
);

}

/* ========================================================
GET ASSETS BELONGING TO THIS DAIRY FARM

 Dairy Farm:
     code < 0

 Child assets:
     assetCode === dairy.code

 This returns:
     - Animals
     - Structures
     - Machines
     - Tools
     - Other farm property

 It does NOT return:
     - Other Dairy Farms
     - Assets belonging to other farms
     - Standalone assets

======================================================== */

let assetDairies = [];

if (

dairy.code !== null &&

dairy.code !== undefined &&

Number(dairy.code) < 0

) {

assetDairies = await Dairy.find({

  assetCode: Number(dairy.code)

})

  .sort({

    code: 1,

    name: 1

  });

}

/* ========================================================
GET UPDATES
======================================================== */

const updates = await Update.find({

dairy: id

})

.sort({

  createdAt: -1

});

/* ========================================================
FORMAT FEED
======================================================== */

const feed = updates.map(formatFeed);

/* ========================================================
BUILD WEEKLY MILK FEEDS
======================================================== */

const weeklyFeeds =
await buildWeeklyMilkFeeds(id);

/* ========================================================
ADD WEEKLY MILK FEEDS
======================================================== */

feed.push(...weeklyFeeds);

/* ========================================================
SORT COMPLETE FEED
======================================================== */

feed.sort(

(a, b) =>

  new Date(b.createdAt) -
  new Date(a.createdAt)

);

/* ========================================================
COUNT COMMENTS
======================================================== */

let commentCount = 0;

for (const item of feed) {

if (
  Array.isArray(item.comments)
) {

  commentCount +=
    item.comments.length;

}

}

/* ========================================================
RETURN COMPLETE PAGE DATA

 Existing values are preserved:
     dairy
     feed
     weeklyFeeds
     commentCount

 New value:
     assetDairies

======================================================== */

return {

dairy,

feed,

weeklyFeeds,

commentCount,

assetDairies

};

};