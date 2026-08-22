// ==========================================================
// routes/animal-feeds.js
// AGROSTORE ANIMAL FEED / STOCK UPDATE ROUTES
// ==========================================================
//
// IMPORTANT:
//
//     :id
//         = AgroStore._id
//
//     :feedId
//         = individual AgroStore content Dairy._id
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

const express = require("express");

const router = express.Router();


// ==========================================================
// CONTROLLER
// ==========================================================

const animalFeedsController =
    require("../controllers/update/storage/animalFeedsController");


// ==========================================================
// GET AGROSTORE ANIMAL FEEDS
// ==========================================================
//
// Returns all active Dairy records allocated to the
// AgroStore represented by :id.
//
// :id = AgroStore._id
//
// ==========================================================

router.get(

    "/dairy/:id/animal-feeds",

    animalFeedsController.getAnimalFeeds

);


// ==========================================================
// UPDATE AGROSTORE CONTENT
// ==========================================================
//
// Updates:
//
//     • quantity
//     • stockUpdateNote
//
// :id
//     = AgroStore._id
//
// :feedId
//     = content Dairy._id
//
// ==========================================================

router.post(

    "/dairy/:id/animal-feeds/:feedId/update",

    animalFeedsController.updateAnimalFeed

);


// ==========================================================
// EXPORT
// ==========================================================

module.exports = router;