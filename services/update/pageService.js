// ==========================================================
// services/update/pageService.js
// ==========================================================
//
// DAIRY PAGE SERVICE
//
// ENTITY IDENTITY
// ----------------------------------------------------------
//
// Dairy.code < 0
//     = DAIRY FARM
//
// Dairy.code > 0
//     = ANIMAL / ASSET
//
// Dairy.code === null
//     = FACILITY / ASSET
//
// AgroStore.roomNumber < 0
//     = AGROSTORE
//
// AgroStore.roomNumber
//     ↕
// Dairy.dwellNumber
//     = identifies AgroStore contents
//
// ==========================================================
//
// RESPONSIBILITIES
// ----------------------------------------------------------
//
// • Load current Dairy / Asset
// • Determine whether current record is a Dairy Farm
// • Determine whether current record is an AgroStore
// • Load farm assets
// • Load normal updates
// • Load weekly milk feeds
// • Count comments
// • Load assigned farms for dairy workers
// • Load AgroStore animal-feed inventory
// • Toggle milking status
// • Validate assigned-farm access
//
// ==========================================================
//
// IMPORTANT
// ----------------------------------------------------------
//
// AgroStore inventory is completely separate from the normal
// Update feed.
//
// The AgroStore itself is NOT an animal-feed item.
//
// If the current record is an AgroStore:
//
//     AgroStore._id
//          ↓
//     AgroStore.roomNumber
//          ↓
//     Dairy.dwellNumber
//
// animalFeeds contains only the Dairy records belonging to
// that AgroStore.
//
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


const animalFeedsService =
    require("./storage/animalFeedsService");


// ==========================================================
// GET COMPLETE DAIRY PAGE
// ==========================================================
//
// For a Dairy Farm:
//
//     code < 0
//
// The normal feed contains:
//
//     • Farm updates
//     • Updates from all assets belonging to that farm
//     • Farm weekly milk feeds
//     • Asset weekly milk feeds
//
// For an Animal / Asset:
//
//     code > 0
//
// Only that specific Dairy record supplies the feed.
//
// For a Facility / Asset:
//
//     code === null
//
// Only that specific Dairy record supplies the feed.
//
// For an AgroStore:
//
//     roomNumber < 0
//
// animalFeeds is populated separately.
//
// ==========================================================

exports.getDairyPage = async (
    id,
    userId
) => {

    // ======================================================
    // VALIDATE DAIRY ID
    // ======================================================

    if (!id) {

        throw new Error(
            "Dairy ID is required."
        );

    }


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
    // DETERMINE RECORD TYPE
    // ======================================================
    //
    // IMPORTANT:
    //
    // code < 0
    //     = Dairy Farm
    //
    // code > 0
    //     = Animal / Asset
    //
    // code === null
    //     = Facility / Asset
    //
    // ======================================================

    const hasCode =
        dairy.code !== null &&
        dairy.code !== undefined;


    const numericCode =
        hasCode
            ? Number(dairy.code)
            : null;


    const isDairyFarm =
        hasCode &&
        numericCode < 0;


    const isAnimalOrAsset =
        hasCode &&
        numericCode > 0;


    const isFacilityOrAsset =
        dairy.code === null ||
        dairy.code === undefined;


    // ======================================================
    // DETERMINE WHETHER CURRENT RECORD IS AN AGROSTORE
    // ======================================================
    //
    // AgroStore identity is determined by:
    //
    //     roomNumber < 0
    //
    // NOT by Dairy.code.
    //
    // Therefore a record may be:
    //
    //     code > 0
    //     AND
    //     roomNumber < 0
    //
    // depending on the application's data model.
    //
    // ======================================================

    const hasRoomNumber =
        dairy.roomNumber !== null &&
        dairy.roomNumber !== undefined;


    const isAgroStore =
        hasRoomNumber &&
        Number(
            dairy.roomNumber
        ) < 0;


    // ======================================================
    // AGROSTORE ANIMAL FEEDS
    // ======================================================
    //
    // This remains completely separate from `feed`.
    //
    // animalFeedsService receives the AgroStore _id.
    //
    // It is responsible for resolving:
    //
    //     AgroStore._id
    //          ↓
    //     AgroStore.roomNumber
    //          ↓
    //     Dairy.dwellNumber
    //
    // ======================================================

    let animalFeeds = [];


    if (isAgroStore) {

        const result =
            await animalFeedsService.getAnimalFeeds(
                dairy._id
            );


        if (
            result &&
            Array.isArray(
                result.feeds
            )
        ) {

            animalFeeds =
                result.feeds;

        }

    }


    // ======================================================
    // GET ASSETS BELONGING TO CURRENT DAIRY FARM
    // ======================================================
    //
    // ONLY a record whose:
    //
    //     code < 0
    //
    // is treated as a Dairy Farm.
    //
    // Its assets are identified by:
    //
    //     assetCode === farm.code
    //
    // ======================================================

    let assetDairies = [];


    if (isDairyFarm) {

        assetDairies =
            await Dairy.find({

                assetCode:
                    numericCode

            })
            .sort({

                code: 1,

                name: 1

            });

    }


    // ======================================================
    // GET ASSIGNED FARMS
    // ======================================================
    //
    // Only dairyWorker users need assigned farms.
    //
    // ======================================================

    let assignedFarms = [];


    let workerUser = null;


    if (userId) {

        workerUser =
            await ProjectUser
                .findById(
                    userId
                )
                .select(
                    "role assignedFarm"
                );


        if (
            workerUser &&
            workerUser.role ===
                "dairyWorker" &&
            Array.isArray(
                workerUser.assignedFarm
            ) &&
            workerUser.assignedFarm.length > 0
        ) {

            assignedFarms =
                await Dairy.find({

                    _id: {

                        $in:
                            workerUser.assignedFarm

                    }

                });

        }

    }


    // ======================================================
    // PRESERVE ASSIGNED FARM ORDER
    // ======================================================
    //
    // MongoDB does not guarantee that $in results will be
    // returned in the same order as assignedFarm.
    //
    // Therefore rebuild the result using assignedFarm order.
    //
    // ======================================================

    if (
        workerUser &&
        workerUser.role ===
            "dairyWorker" &&
        Array.isArray(
            workerUser.assignedFarm
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
            workerUser.assignedFarm

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


    // ======================================================
    // DETERMINE WHICH DAIRY RECORDS SUPPLY NORMAL FEED
    // ======================================================
    //
    // FARM:
    //
    //     code < 0
    //
    //     Current farm
    //          +
    //     all assets where
    //
    //         assetCode === farm.code
    //
    //
    // ANIMAL / ASSET:
    //
    //     code > 0
    //
    //     Current record only.
    //
    //
    // FACILITY / ASSET:
    //
    //     code === null
    //
    //     Current record only.
    //
    // AgroStore animal feeds are NEVER added here.
    //
    // ======================================================

    let updateDairyIds = [

        dairy._id

    ];


    // ======================================================
    // DAIRY FARM LOGIC
    // ======================================================
    //
    // THIS IS THE IMPORTANT NEGATIVE-CODE LOGIC.
    //
    // A Dairy Farm is identified by:
    //
    //     code < 0
    //
    // All records having:
    //
    //     assetCode === farm.code
    //
    // belong to that farm's normal feed.
    //
    // ======================================================

    if (isDairyFarm) {

        const farmAssets =
            await Dairy.find({

                assetCode:
                    numericCode

            })
            .select(
                "_id code name assetCode"
            );


        updateDairyIds.push(

            ...farmAssets.map(
                asset =>
                    asset._id
            )

        );

    }


    // ======================================================
    // POSITIVE-CODE ANIMAL / ASSET LOGIC
    // ======================================================
    //
    // A positive code means:
    //
    //     code > 0
    //
    // Such a record is an animal / asset and DOES NOT
    // automatically include its parent farm feed.
    //
    // The current record remains the only feed source.
    //
    // updateDairyIds already contains dairy._id.
    //
    // ======================================================

    if (isAnimalOrAsset) {

        // Current animal / asset only.
        //
        // No farm expansion occurs here.

    }


    // ======================================================
    // NULL-CODE FACILITY / ASSET LOGIC
    // ======================================================
    //
    // code === null
    //
    // This record is treated as an individual facility /
    // asset for normal feed purposes.
    //
    // It does NOT inherit a farm's feed.
    //
    // ======================================================

    if (isFacilityOrAsset) {

        // Current facility / asset only.
        //
        // No farm expansion occurs here.

    }


    // ======================================================
    // REMOVE DUPLICATE DAIRY IDS
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
    // GET NORMAL UPDATES
    // ======================================================
    //
    // This query is completely independent of AgroStore
    // inventory.
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
    // FORMAT NORMAL UPDATE FEED
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
    // CREATE DAIRY LOOKUP MAP
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
    //
    // Every Dairy record supplying the normal feed gets
    // its own weekly milk feeds.
    //
    // For a farm:
    //
    //     farm milk
    //     +
    //     asset milk
    //
    // For an animal / asset:
    //
    //     current record milk only
    //
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


        const dairyWeeklyFeeds =
            await buildWeeklyMilkFeeds(
                dairyId
            );


        // ==================================================
        // ATTACH DAIRY INFORMATION
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
        // ADD TO WEEKLY FEEDS
        // ==================================================

        weeklyFeeds.push(
            ...dairyWeeklyFeeds
        );

    }


    // ======================================================
    // ADD WEEKLY MILK FEEDS TO NORMAL FEED
    // ======================================================

    feed.push(
        ...weeklyFeeds
    );


    // ======================================================
    // SORT COMPLETE NORMAL FEED
    // ======================================================
    //
    // Contains:
    //
    // • Posts
    // • Images
    // • Medical updates
    // • Maintenance updates
    // • Weekly milk feeds
    //
    // DOES NOT contain AgroStore animalFeeds.
    //
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

        // ==================================================
        // CURRENT RECORD
        // ==================================================

        dairy,


        // ==================================================
        // RECORD TYPE FLAGS
        // ==================================================
        //
        // These make the identity explicit for the
        // controller / view if required.
        //
        // ==================================================

        isDairyFarm,

        isAnimalOrAsset,

        isFacilityOrAsset,

        isAgroStore,


        // ==================================================
        // NORMAL FEED
        // ==================================================

        feed,


        // ==================================================
        // WEEKLY MILK FEEDS
        // ==================================================

        weeklyFeeds,


        // ==================================================
        // COMMENT COUNT
        // ==================================================

        commentCount,


        // ==================================================
        // ASSETS BELONGING TO CURRENT FARM
        // ==================================================

        assetDairies,


        // ==================================================
        // ASSIGNED FARMS
        // ==================================================

        assignedFarms,


        // ==================================================
        // AGROSTORE INVENTORY
        // ==================================================
        //
        // Populated ONLY when:
        //
        //     roomNumber < 0
        //
        // It is deliberately NOT merged into `feed`.
        //
        // ==================================================

        animalFeeds

    };

};


// ==========================================================
// TOGGLE MILKING STATUS
// ==========================================================
//
// Toggles ONLY:
//
//     isMilking
//
// false → true
// true  → false
//
// Does NOT:
//
// • create milk records
// • delete milk records
// • modify milk history
// • modify milk totals
// • modify name
// • modify code
// • modify mass
// • modify dateOfBirth
// • modify any other Dairy field
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


    if (!dairy) {

        throw new Error(
            "Dairy asset not found."
        );

    }


    // ======================================================
    // TOGGLE MILKING STATUS
    // ======================================================

    dairy.isMilking =
        !dairy.isMilking;


    // ======================================================
    // SAVE
    // ======================================================

    await dairy.save();


    // ======================================================
    // RETURN UPDATED DAIRY
    // ======================================================

    return dairy;

};


// ==========================================================
// GET ASSIGNED FARM FOR USER
// ==========================================================
//
// Used when a dairyWorker switches between farms.
//
// SECURITY:
//
// The requested farm MUST exist inside:
//
//     user.assignedFarm
//
// A dairyWorker cannot request an arbitrary farm ID.
//
// ==========================================================

exports.getAssignedFarmForUser =
async (
    userId,
    farmId
) => {

    // ======================================================
    // VALIDATE INPUT
    // ======================================================

    if (
        !userId ||
        !farmId
    ) {

        return null;

    }


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
    // GET ASSIGNED FARM IDS
    // ======================================================

    const assignedFarmIds =
        Array.isArray(
            user.assignedFarm
        )

            ? user.assignedFarm

            : [];


    // ======================================================
    // CHECK WHETHER REQUESTED FARM IS ASSIGNED
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