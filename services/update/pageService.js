// ==========================================================
// services/update/pageService.js
// ==========================================================

const Dairy =
    require("../../models/dairy");

const Update =
    require("../../models/Update");

const ProjectUser =
    require("../../models/projectUser");

const {
    formatFeed,
    buildWeeklyMilkFeeds
} = require("./helpers");


// ==========================================================
// GET COMPLETE DAIRY PAGE
// ==========================================================

exports.getDairyPage =
async (id) => {


    // ======================================================
    // GET CURRENT DAIRY / ASSET
    // ======================================================

    const dairy =
        await Dairy.findById(id);


    if (!dairy) {

        throw new Error(
            "Dairy profile not found."
        );

    }


    // ======================================================
    // GET ASSETS BELONGING TO THIS DAIRY FARM
    //
    // A Dairy Farm has:
    //
    //     code < 0
    //
    // Its child assets have:
    //
    //     assetCode === dairy.code
    //
    // This includes:
    //
    //     - Animals
    //     - Structures
    //     - Machines
    //     - Tools
    //     - Other farm property
    //
    // It does NOT include:
    //
    //     - Other Dairy Farms
    //     - Assets belonging to another farm
    //     - Standalone assets
    // ======================================================

    let assetDairies = [];


    if (

        dairy.code !== null &&

        dairy.code !== undefined &&

        Number(dairy.code) < 0

    ) {

        assetDairies =
            await Dairy.find({

                assetCode:
                    Number(dairy.code)

            })

            .sort({

                code: 1,

                name: 1

            });

    }


    // ======================================================
    // GET UPDATES
    // ======================================================

    const updates =
        await Update.find({

            dairy: id

        })

        .sort({

            createdAt: -1

        });


    // ======================================================
    // FORMAT FEED
    // ======================================================

    const feed =
        updates.map(
            formatFeed
        );


    // ======================================================
    // BUILD WEEKLY MILK FEEDS
    // ======================================================

    const weeklyFeeds =
        await buildWeeklyMilkFeeds(id);


    // ======================================================
    // ADD WEEKLY MILK FEEDS
    // ======================================================

    feed.push(
        ...weeklyFeeds
    );


    // ======================================================
    // SORT COMPLETE FEED
    //
    // Newest items first.
    // ======================================================

    feed.sort(

        (a, b) =>

            new Date(b.createdAt) -
            new Date(a.createdAt)

    );


    // ======================================================
    // COUNT COMMENTS
    // ======================================================

    let commentCount = 0;


    for (
        const item of feed
    ) {

        if (
            Array.isArray(
                item.comments
            )
        ) {

            commentCount +=
                item.comments.length;

        }

    }


    // ======================================================
    // RETURN COMPLETE PAGE DATA
    // ======================================================

    return {

        dairy,

        feed,

        weeklyFeeds,

        commentCount,

        assetDairies

    };

};


// ==========================================================
// GET ASSIGNED FARM FOR USER
//
// Used by the farm-switching functionality.
//
// The method verifies:
//
// 1. User exists.
// 2. User is a dairyWorker.
// 3. Farm ID exists in assignedFarm.
// 4. Farm actually exists.
//
// Returns:
//     Dairy document
//
// Or:
//     null
//
// ==========================================================

exports.getAssignedFarmForUser =
async (
    userId,
    farmId
) => {


    // ======================================================
    // FIND USER
    // ======================================================

    const user =
        await ProjectUser
            .findById(userId)
            .select(
                "role assignedFarm"
            );


    if (!user) {

        return null;

    }


    // ======================================================
    // ROLE CHECK
    // ======================================================

    if (
        user.role !== "dairyWorker"
    ) {

        return null;

    }


    // ======================================================
    // GET ASSIGNED FARM IDS
    // ======================================================

    const assignedFarmIds =
        Array.isArray(
            user.assignedFarm
        )
            ? user.assignedFarm
            : [];


    // ======================================================
    // CHECK WHETHER REQUESTED FARM
    // BELONGS TO THE USER
    // ======================================================

    const isAssigned =
        assignedFarmIds.some(
            assignedId =>

                assignedId
                    .toString() ===
                farmId
                    .toString()
        );


    if (!isAssigned) {

        return null;

    }


    // ======================================================
    // GET FARM
    // ======================================================

    const farm =
        await Dairy.findById(
            farmId
        );


    if (!farm) {

        return null;

    }


    // ======================================================
    // RETURN FARM
    // ======================================================

    return farm;

};