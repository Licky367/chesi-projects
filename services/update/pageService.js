// ==========================================================
// services/update/pageService.js
// ==========================================================
//
// DAIRY PAGE SERVICE
//
// Responsibilities:
//
// - Current Dairy Farm / Asset
// - Farm assets
// - Updates
// - Weekly milk feeds
// - Comment count
// - Assigned farms for dairy workers
// - AgroStore animal-feed contents
//
// ==========================================================
//
// AGROSTORE ANIMAL FEED LOGIC
//
// When /dairy/:id points to an AgroStore:
//
//     id
//       ↓
//     AgroStore._id
//       ↓
//     AgroStore.roomNumber
//       ↓
//     Dairy.dwellNumber
//
// Therefore:
//
//     AgroStore._id
//         identifies the AgroStore
//
//     AgroStore.roomNumber
//         identifies its contents
//
//     Dairy.dwellNumber
//         identifies which AgroStore a stock item belongs to
//
// IMPORTANT:
//
// An AgroStore is identified by:
//
//     roomNumber < 0
//
// The AgroStore itself is NOT an animal-feed item.
//
// Animal feeds are Dairy records whose:
//
//     dwellNumber === AgroStore.roomNumber
//
// The normal Update feed remains completely separate.
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
// AGROSTORE ANIMAL FEED SERVICE
// ==========================================================
//
// Used ONLY for obtaining the inventory contents of an
// AgroStore.
//
// It does NOT replace the normal Update feed.
//
// ==========================================================

const animalFeedsService =
    require("./storage/animalFeedsService");


// ==========================================================
// GET COMPLETE DAIRY PAGE
// ==========================================================
//
// Loads:
//
// - Current Dairy Farm / Asset
// - Farm assets
// - Updates
// - Weekly milk feeds
// - Comment count
// - Assigned farms for the logged-in dairy worker
// - AgroStore animal-feed contents
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
// AGROSTORE INVENTORY:
//
// When the current Dairy is an AgroStore:
//
//     animalFeeds contains ONLY Dairy records whose:
//
//         dwellNumber === AgroStore.roomNumber
//
// The AgroStore itself is NOT included in animalFeeds.
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
        await Dairy.findById(
            id
        );


    if (!dairy) {

        throw new Error(
            "Dairy profile not found."
        );

    }


    // ======================================================
    // AGROSTORE ANIMAL FEEDS
    // ======================================================
    //
    // THE FORMULA:
    //
    //     /dairy/:id
    //          ↓
    //     AgroStore._id
    //          ↓
    //     AgroStore.roomNumber
    //          ↓
    //     Dairy.dwellNumber
    //
    // An AgroStore MUST have:
    //
    //     roomNumber < 0
    //
    // The matching Dairy records are its contents.
    //
    // We deliberately keep these records separate from
    // the normal Update feed.
    // ======================================================

    let animalFeeds = [];


    const isAgroStore =

        dairy.roomNumber !== null &&

        dairy.roomNumber !== undefined &&

        Number(
            dairy.roomNumber
        ) < 0;


    if (isAgroStore) {

        const animalFeedResult =
            await animalFeedsService.getAnimalFeeds(
                dairy._id
            );


        animalFeeds =
            animalFeedResult &&
            Array.isArray(
                animalFeedResult.feeds
            )

                ? animalFeedResult.feeds

                : [];

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
                    Number(
                        dairy.code
                    )

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
                .findById(
                    userId
                )
                .select(
                    "role assignedFarm"
                );


        if (

            user &&

            user.role ===
                "dairyWorker" &&

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
                .findById(
                    userId
                )
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
    // ======================================================
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
    // The SAME list is used for:
    //
    //     - normal posts
    //     - medical updates
    //     - maintenance updates
    //     - weekly milk feeds
    //
    // AgroStore inventory is NOT added to this list.
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
                    Number(
                        dairy.code
                    )

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
    // ======================================================
    //
    // This query remains completely independent of
    // AgroStore animalFeeds.
    //
    // AgroStore inventory does NOT enter the Update feed.
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
    // CREATE QUICK DAIRY LOOKUP MAP
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
        // ==================================================

        dairyWeeklyFeeds.forEach(
            milkFeed => {

                milkFeed.dairyId =
                    dairyRecord._id;


                milkFeed.dairyName =
                    dairyRecord.name ||
                    "";


                milkFeed.dairyCode =

                    dairyRecord.code !==
                    undefined

                        ? dairyRecord.code

                        : null;


                milkFeed.dairyAssetCode =

                    dairyRecord.assetCode !==
                    undefined

                        ? dairyRecord.assetCode

                        : null;


                milkFeed.dairyImage =
                    dairyRecord.profileImage ||
                    "";

            }
        );


        // ==================================================
        // ADD THIS DAIRY'S MILK FEEDS
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
    // Everything here remains the normal dairy feed:
    //
    // - Normal posts
    // - Image posts
    // - Medical updates
    // - Maintenance updates
    // - Weekly milk reports
    //
    // AgroStore inventory is NOT included here.
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

        // --------------------------------------------------
        // CURRENT DAIRY / ASSET
        // --------------------------------------------------

        dairy,


        // --------------------------------------------------
        // NORMAL UPDATE FEED
        // --------------------------------------------------

        feed,


        // --------------------------------------------------
        // WEEKLY MILK FEEDS
        // --------------------------------------------------

        weeklyFeeds,


        // --------------------------------------------------
        // COMMENT COUNT
        // --------------------------------------------------

        commentCount,


        // --------------------------------------------------
        // CURRENT FARM ASSETS
        // --------------------------------------------------

        assetDairies,


        // --------------------------------------------------
        // ASSIGNED FARMS
        // --------------------------------------------------

        assignedFarms,


        // --------------------------------------------------
        // AGROSTORE INVENTORY
        //
        // Populated ONLY when:
        //
        //     dairy.roomNumber < 0
        //
        // The animalFeeds service resolves:
        //
        //     AgroStore._id
        //          ↓
        //     AgroStore.roomNumber
        //          ↓
        //     Dairy.dwellNumber
        //
        // These records are deliberately separate from
        // `feed`.
        // --------------------------------------------------

        animalFeeds

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
            .findById(
                userId
            )
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
        user.role !==
        "dairyWorker"
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