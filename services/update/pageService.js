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
//
// Loads:
//
// - Current Dairy Farm / Asset
// - Farm assets
// - Updates
// - Weekly milk feeds
// - Comment count
// - Assigned farms for the logged-in dairy worker
//
// FARM FEED:
//
// When the current Dairy is a Dairy Farm:
//
//     code < 0
//
// the feed includes:
//
//     1. Updates posted directly on the Dairy Farm.
//     2. Updates posted on every asset whose
//        assetCode === Dairy Farm code.
//
// No Update documents are duplicated.
// The same Update document is simply included in the
// Dairy Farm feed when it belongs to one of its assets.
//
// ASSET FEED:
//
// When the current Dairy is an animal, structure, machine,
// tool, or other asset:
//
//     Only updates belonging to that specific asset
//     are loaded.
//
// ==========================================================

exports.getDairyPage =
async (
    id,
    userId
) => {

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
    // DETERMINE WHETHER CURRENT RECORD IS A DAIRY FARM
    //
    // Negative code = Dairy Farm
    // ======================================================

    const isDairyFarm =

        dairy.code !== null &&

        dairy.code !== undefined &&

        Number(
            dairy.code
        ) < 0;


    // ======================================================
    // GET ASSETS BELONGING TO THIS DAIRY FARM
    //
    // Dairy Farm:
    //
    //     code < 0
    //
    // Child assets:
    //
    //     assetCode === dairy.code
    //
    // This includes:
    //
    // - Animals
    // - Structures
    // - Machines
    // - Tools
    // - Other farm property
    //
    // It does NOT include:
    //
    // - Other Dairy Farms
    // - Assets belonging to other farms
    // - Standalone assets
    //
    // ======================================================

    let assetDairies = [];


    if (isDairyFarm) {

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
    // GET ASSIGNED FARMS
    //
    // Only dairyWorkers need this.
    //
    // The IDs come from:
    //
    //     ProjectUser.assignedFarm
    //
    // We then retrieve the actual Dairy documents.
    //
    // ======================================================

    let assignedFarms = [];


    if (userId) {

        const user =
            await ProjectUser
                .findById(userId)
                .select(
                    "role assignedFarm"
                );


        if (

            user &&

            user.role === "dairyWorker" &&

            Array.isArray(
                user.assignedFarm
            ) &&

            user.assignedFarm.length > 0

        ) {

            assignedFarms =
                await Dairy.find({

                    _id: {
                        $in:
                            user.assignedFarm
                    }

                });

        }

    }


    // ======================================================
    // PRESERVE ASSIGNED FARM ORDER
    //
    // MongoDB $in does not guarantee that the returned
    // documents will have the same order as assignedFarm.
    //
    // The invitation/assignment order matters because:
    //
    //     assignedFarm[0]
    //
    // is the first assigned farm.
    //
    // ======================================================

    if (
        assignedFarms.length > 1 &&
        userId
    ) {

        const user =
            await ProjectUser
                .findById(userId)
                .select(
                    "assignedFarm"
                );


        if (
            user &&
            Array.isArray(
                user.assignedFarm
            )
        ) {

            const farmMap =
                new Map(
                    assignedFarms.map(
                        farm => [

                            farm._id.toString(),

                            farm

                        ]
                    )
                );


            assignedFarms =
                user.assignedFarm
                    .map(
                        farmId =>

                            farmMap.get(
                                farmId.toString()
                            )
                    )
                    .filter(
                        Boolean
                    );

        }

    }


    // ======================================================
    // DETERMINE WHICH DAIRY RECORDS CAN SUPPLY FEED
    //
    // For a Dairy Farm:
    //
    //     Farm itself
    //     +
    //     all assets where assetCode === farm.code
    //
    // For an asset:
    //
    //     Current asset only.
    //
    // ======================================================

    let updateDairyIds = [

        dairy._id

    ];


    // ======================================================
    // CURRENT RECORD IS A DAIRY FARM
    // ======================================================

    if (isDairyFarm) {

        // ==================================================
        // FIND ALL ASSETS BELONGING TO THIS FARM
        //
        // assetCode is always the negative code of the
        // parent Dairy Farm.
        // ==================================================

        const farmAssets =
            await Dairy.find({

                assetCode:
                    Number(dairy.code)

            })
            .select(
                "_id"
            );


        // ==================================================
        // ADD ALL FARM ASSET IDs
        //
        // The farm's own ID was already included above.
        // ==================================================

        updateDairyIds.push(

            ...farmAssets.map(
                asset =>
                    asset._id
            )

        );

    }


    // ======================================================
    // GET UPDATES
    //
    // DAIRY FARM:
    //
    //     Includes:
    //
    //     - posts/updates made directly for the farm
    //     - posts/updates made for its assets
    //
    // ASSET:
    //
    //     Includes only posts/updates for that asset.
    //
    // ======================================================

    const updates =
        await Update.find({

            dairy: {

                $in:
                    updateDairyIds

            }

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
        await buildWeeklyMilkFeeds(
            id
        );


    // ======================================================
    // ADD WEEKLY MILK FEEDS
    // ======================================================

    feed.push(
        ...weeklyFeeds
    );


    // ======================================================
    // SORT COMPLETE FEED
    //
    // This ensures that:
    //
    // - Normal posts
    // - Images
    // - Medical updates
    // - Maintenance updates
    // - Weekly milk feeds
    //
    // all appear according to their actual creation/update
    // date rather than being grouped by type.
    // ======================================================

    feed.sort(

        (a, b) =>

            new Date(
                b.createdAt
            ) -

            new Date(
                a.createdAt
            )

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

        assetDairies,

        assignedFarms

    };

};


// ==========================================================
// GET ASSIGNED FARM FOR USER
//
// Used when a dairyWorker switches farms.
//
// Security:
//
// The requested farm MUST exist inside the logged-in
// user's assignedFarm array.
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
    // ASSIGNED FARM IDS
    // ======================================================

    const assignedFarmIds =
        Array.isArray(
            user.assignedFarm
        )

            ? user.assignedFarm

            : [];


    // ======================================================
    // CHECK ASSIGNMENT
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
    // FIND FARM
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