// ==========================================================
// routes/animal-feeds.js
// AGROSTORE ANIMAL FEED / STOCK UPDATE ROUTES
// ==========================================================
//
// MOUNTED IN server.js AS:
//
//     app.use("/dairy", animalFeedsRoutes);
//
// THEREFORE:
//
//     :id
//         = AgroStore._id
//
//     :feedId
//         = individual AgroStore content Dairy._id
//
// FINAL ROUTES:
//
//     GET
//     /dairy/:id/animal-feeds
//
//     POST
//     /dairy/:id/animal-feeds/:feedId/update
//
// EXAMPLE:
//
//     GET
//     /dairy/64abc123/animal-feeds
//
//     POST
//     /dairy/64abc123/animal-feeds/65def456/update
//
// ==========================================================

const express =
    require("express");

const router =
    express.Router();


// ==========================================================
// CONTROLLER
// ==========================================================

const animalFeedsController =
    require(
        "../controllers/update/storage/animalFeedsController"
    );


// ==========================================================
// GET AGROSTORE ANIMAL FEEDS
// ==========================================================
//
// Displays the animal-feed / stock contents belonging to
// the AgroStore identified by :id.
//
// :id
//     = AgroStore._id
//
// FINAL URL:
//
//     GET /dairy/:id/animal-feeds
//
// ==========================================================

router.get(

    "/:id/animal-feeds",

    animalFeedsController.getAnimalFeeds

);


// ==========================================================
// UPDATE AGROSTORE CONTENT
// ==========================================================
//
// Updates an individual AgroStore stock item.
//
// Supported update data:
//
//     • quantity
//     • stockUpdateNote
//
// :id
//     = AgroStore._id
//
// :feedId
//     = individual stock/content Dairy._id
//
// FINAL URL:
//
//     POST /dairy/:id/animal-feeds/:feedId/update
//
// ==========================================================

router.post(

    "/:id/animal-feeds/:feedId/update",

    animalFeedsController.updateAnimalFeed

);


// ==========================================================
// EXPORT
// ==========================================================

module.exports =
    router;