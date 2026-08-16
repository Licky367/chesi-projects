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
//     3. Weekly milk feeds belonging to the Dairy Farm.
//     4. Weekly milk feeds belonging to every asset
//        belonging to the Dairy Farm.
//
// ASSET FEED:
//
// When the current Dairy is an animal, structure, machine,
// tool, or other asset:
//
//     Only updates belonging to that specific asset.
//     Only weekly milk feeds belonging to that asset.
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
    // DETERMINE WHICH DAIRY RECORDS SUPPLY THE FEED
    //
    // For a Dairy Farm:
    //
    //     Farm itself
    //     +
    //     every asset belonging to that farm
    //
    // For an asset:
    //
    //     Current asset only.
    //
    // The SAME list is now used for:
    //
    //     - normal posts
    //     - medical updates
    //     - maintenance updates
    //     - weekly milk feeds
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
        // ADD ALL ASSET IDS
        // ==================================================

        updateDairyIds.push(

            ...farmAssets.map(
                asset =>
                    asset._id
            )

        );

    }


    // ======================================================
    // REMOVE DUPLICATE IDS
    //
    // Normally there should not be duplicates, but this
    // protects the feed from accidentally loading the same
    // Dairy twice.
    // ======================================================

    updateDairyIds =
        Array.from(

            new Map(

                updateDairyIds.map(
                    dairyId => [

                        dairyId.toString(),

                        dairyId

                    ]
                )

            ).values()

        );


    // ======================================================
    // GET UPDATES
    //
    // The same updateDairyIds list is used here.
    //
    // Therefore a Dairy Farm sees:
    //
    //     Farm posts
    //     Asset posts
    //     Farm medical updates
    //     Asset medical updates
    //     Farm maintenance
    //     Asset maintenance
    //
    // ======================================================

    const updates =
        await Update.find({

            dairy: {

                $in:
                    updateDairyIds

            }

        })
        .populate({

            path:
                "dairy",

            select:
                "name code assetCode profileImage"

        })
        .sort({

            createdAt: -1

        });


    // ======================================================
    // FORMAT NORMAL FEED
    // ======================================================

    const feed =
        updates.map(
            formatFeed
        );


    // ======================================================
    // GET DAIRY INFORMATION FOR MILK FEEDS
    //
    // We need this because the weekly milk feed must know
    // which Dairy produced the milk.
    //
    // Example:
    //
    //     Weekly Milk Report for Daisy Freshman
    //
    // or:
    //
    //     Weekly Milk Report for Cowshed C
    //
    // ======================================================

    const milkDairies =
        await Dairy.find({

            _id: {

                $in:
                    updateDairyIds

            }

        })
        .select(
            "_id name code assetCode profileImage"
        );


    // ======================================================
    // CREATE A QUICK DAIRY LOOKUP MAP
    // ======================================================

    const milkDairyMap =
        new Map(

            milkDairies.map(
                dairyRecord => [

                    dairyRecord._id.toString(),

                    dairyRecord

                ]
            )

        );


    // ======================================================
    // BUILD WEEKLY MILK FEEDS
    //
    // IMPORTANT:
    //
    // Previously this was:
    //
    //     buildWeeklyMilkFeeds(id)
    //
    // which meant that when viewing a Dairy Farm, milk
    // records belonging to its assets were NOT included.
    //
    // Now we build a weekly milk feed for EVERY Dairy
    // record that belongs in the current feed.
    // ======================================================

    let weeklyFeeds = [];


    for (
        const dairyId of updateDairyIds
    ) {

        const dairyKey =
            dairyId.toString();


        const dairyRecord =
            milkDairyMap.get(
                dairyKey
            );


        if (!dairyRecord) {

            continue;

        }


        // ==================================================
        // BUILD WEEKLY MILK FEEDS FOR THIS DAIRY
        // ==================================================

        const dairyWeeklyFeeds =
            await buildWeeklyMilkFeeds(
                dairyId
            );


        // ==================================================
        // ATTACH DAIRY INFORMATION TO EACH MILK FEED
        //
        // This is what allows milk.ejs to display:
        //
        //     Weekly Milk Report for Daisy Freshman
        //
        // and also gives us the ID for:
        //
        //     /dairy/:id
        //
        // ==================================================

        dairyWeeklyFeeds.forEach(
            milkFeed => {

                milkFeed.dairyId =
                    dairyRecord._id;


                milkFeed.dairyName =
                    dairyRecord.name || "";


                milkFeed.dairyCode =
                    dairyRecord.code !== undefined

                        ? dairyRecord.code

                        : null;


                milkFeed.dairyAssetCode =
                    dairyRecord.assetCode !== undefined

                        ? dairyRecord.assetCode

                        : null;


                milkFeed.dairyImage =
                    dairyRecord.profileImage || "";

            }
        );


        // ==================================================
        // ADD THIS DAIRY'S MILK FEEDS TO COMPLETE FEED
        // ==================================================

        weeklyFeeds.push(
            ...dairyWeeklyFeeds
        );

    }


    // ======================================================
    // ADD WEEKLY MILK FEEDS TO COMPLETE FEED
    // ======================================================

    feed.push(
        ...weeklyFeeds
    );


    // ======================================================
    // SORT COMPLETE FEED
    //
    // Everything is sorted together:
    //
    // - Normal posts
    // - Image posts
    // - Medical updates
    // - Maintenance updates
    // - Weekly milk reports
    //
    // Newest item appears first.
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
// TOGGLE MILKING STATUS
//
// Toggles only the isMilking field.
//
//     false -> true
//     true  -> false
//
// Does NOT:
//
//     • create milk records
//     • delete milk records
//     • modify milk history
//     • modify milk totals
//     • modify any other Dairy fields
//
// Returns the updated Dairy document.
//
// ==========================================================

exports.toggleMilking =
async (
    dairyId
) => {

    // ======================================================
    // VALIDATE ID
    // ======================================================

    if (!dairyId) {

        throw new Error(
            "Dairy ID is required."
        );

    }


    // ======================================================
    // GET DAIRY
    // ======================================================

    const dairy =
        await Dairy.findById(
            dairyId
        );


    // ======================================================
    // DAIRY NOT FOUND
    // ======================================================

    if (!dairy) {

        throw new Error(
            "Dairy asset not found."
        );

    }


    // ======================================================
    // TOGGLE isMilking
    // ======================================================

    dairy.isMilking =
        !dairy.isMilking;


    // ======================================================
    // SAVE ONLY THE TOGGLED DOCUMENT
    // ======================================================

    await dairy.save();


    // ======================================================
    // RETURN UPDATED DAIRY
    // ======================================================

    return dairy;

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