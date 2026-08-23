// ==========================================================
// services/update/pageService.js
// ==========================================================
//
// DAIRY PAGE SERVICE
//
// Responsibilities:
//
//   • Load current Dairy / Animal / Structure / Asset
//   • Load farm assets
//   • Load normal updates
//   • Build weekly milk feeds
//   • Count comments
//   • Load assigned farms for dairy workers
//   • Load AgroStore inventory
//   • Toggle animal milking status
//   • Verify assigned farms
//
// ==========================================================
//
// IMPORTANT MODEL RULES
// ==========================================================
//
// recordType:
//
//   "farm"
//       = Dairy Farm
//
//   "animal"
//       = Animal
//
//   "structure"
//       = Structure / Facility / Asset
//
// code:
//
//   < 0
//       = Dairy Farm
//
//   > 0
//       = Animal
//
//   null
//       = Structure / Asset
//
// assetCode:
//
//   null
//       = Farm / Standalone Structure
//
//   negative farm code
//       = Animal / Structure belongs to that farm
//
// ==========================================================
//
// STORAGE RULES
// ==========================================================
//
// Storage facility:
//
//   recordType = "structure"
//   type       = "room"
//   roomNumber > 0
//
// OR:
//
//   recordType = "structure"
//   type       = "agroStore"
//   roomNumber < 0
//
// Storage content:
//
//   dwellNumber === storage roomNumber
//
// Therefore:
//
//   AgroStore.roomNumber
//          ↓
//   matching Dairy.dwellNumber
//
// IMPORTANT:
//
// The AgroStore itself is NOT an inventory item.
//
// ==========================================================
//
// NORMAL FEED vs AGROSTORE INVENTORY
// ==========================================================
//
// `feed`:
//
//   • normal posts
//   • medical updates
//   • maintenance updates
//   • image updates
//   • weekly milk feeds
//
// `animalFeeds`:
//
//   • AgroStore inventory only
//
// AgroStore inventory is NEVER pushed into `feed`.
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
// HELPER: VALID OBJECT ID
// ==========================================================

function isValidObjectId(id) {

    return (
        id &&
        Dairy.base &&
        Dairy.base.Types &&
        Dairy.base.Types.ObjectId &&
        Dairy.base.Types.ObjectId.isValid(id)
    );

}


// ==========================================================
// HELPER: SAFE ID STRING
// ==========================================================

function idString(id) {

    if (!id) {

        return null;

    }


    return id.toString();

}


// ==========================================================
// HELPER: UNIQUE OBJECT IDS
// ==========================================================
//
// Prevents duplicate Dairy IDs from entering:
//
//   • Update query
//   • Milk query
//   • weekly milk feed loop
//
// ==========================================================

function uniqueIds(ids) {

    const map =
        new Map();


    for (
        const id of ids
    ) {

        if (!id) {

            continue;

        }


        const key =
            idString(id);


        if (!map.has(key)) {

            map.set(
                key,
                id
            );

        }

    }


    return Array.from(
        map.values()
    );

}


// ==========================================================
// HELPER: IS DAIRY FARM
// ==========================================================
//
// Prefer recordType because it is now the single source
// of truth.
//
// The negative code rule is retained as a fallback for
// compatibility with older records.
//
// ==========================================================

function isDairyFarm(dairy) {

    if (!dairy) {

        return false;

    }


    if (
        dairy.recordType === "farm"
    ) {

        return true;

    }


    return (

        dairy.recordType == null &&

        Number.isInteger(
            dairy.code
        ) &&

        dairy.code < 0

    );

}


// ==========================================================
// HELPER: IS AGROSTORE
// ==========================================================
//
// An AgroStore is:
//
//   recordType = "structure"
//   type       = "agroStore"
//   roomNumber < 0
//
// We deliberately DO NOT identify it merely by:
//
//   roomNumber < 0
//
// because the model defines `roomNumber` according to the
// structure type.
//
// ==========================================================

function isAgroStore(dairy) {

    if (!dairy) {

        return false;

    }


    return (

        dairy.recordType === "structure" &&

        dairy.type === "agroStore" &&

        Number.isInteger(
            Number(
                dairy.roomNumber
            )
        ) &&

        Number(
            dairy.roomNumber
        ) < 0

    );

}


// ==========================================================
// HELPER: GET FARM CODE
// ==========================================================
//
// For a farm:
//
//   farm.code
//
// For an animal / assigned structure:
//
//   assetCode
//
// ==========================================================

function getFarmCode(dairy) {

    if (!dairy) {

        return null;

    }


    if (
        isDairyFarm(dairy)
    ) {

        return Number(
            dairy.code
        );

    }


    if (
        dairy.assetCode !== null &&
        dairy.assetCode !== undefined
    ) {

        return Number(
            dairy.assetCode
        );

    }


    return null;

}


// ==========================================================
// GET COMPLETE DAIRY PAGE
// ==========================================================

exports.getDairyPage =
async (
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


    if (
        !isValidObjectId(id)
    ) {

        const error =
            new Error(
                "Invalid Dairy ID."
            );

        error.status = 400;

        throw error;

    }


    // ======================================================
    // LOAD CURRENT DAIRY
    // ======================================================

    const dairy =
        await Dairy.findById(
            id
        );


    if (!dairy) {

        const error =
            new Error(
                "Dairy profile not found."
            );

        error.status = 404;

        throw error;

    }


    // ======================================================
    // BASIC IDENTIFICATION
    // ======================================================

    const farm =
        isDairyFarm(
            dairy
        );


    const agroStore =
        isAgroStore(
            dairy
        );


    // ======================================================
    // AGROSTORE INVENTORY
    // ======================================================
    //
    // IMPORTANT:
    //
    // The AgroStore itself remains separate from its contents.
    //
    // Example:
    //
    // AgroStore:
    //
    //   roomNumber = -3
    //
    // Content:
    //
    //   dwellNumber = -3
    //
    // animalFeedsService is responsible for resolving this
    // relationship.
    //
    // ======================================================

    let animalFeeds = [];


    if (agroStore) {

        try {

            const result =
                await animalFeedsService
                    .getAnimalFeeds(
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

        } catch (error) {

            // ----------------------------------------------
            // Preserve service error.
            // ----------------------------------------------

            throw error;

        }

    }


    // ======================================================
    // GET FARM ASSETS
    // ======================================================

    let assetDairies = [];


    if (farm) {

        const farmCode =
            Number(
                dairy.code
            );


        assetDairies =
            await Dairy.find({

                assetCode:
                    farmCode,

                recordType: {

                    $in: [

                        "animal",
                        "structure"

                    ]

                }

            })
            .sort({

                recordType: 1,

                code: 1,

                name: 1

            });

    }


    // ======================================================
    // GET ASSIGNED FARMS
    // ======================================================
    //
    // Only dairyWorker users receive assigned farms.
    //
    // We retrieve the user ONCE and preserve the exact order
    // stored in assignedFarm.
    //
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
                )
                .lean();


        if (
            user &&
            user.role === "dairyWorker" &&
            Array.isArray(
                user.assignedFarm
            ) &&
            user.assignedFarm.length > 0
        ) {

            const farmIds =
                user.assignedFarm
                    .filter(
                        farmId =>
                            isValidObjectId(
                                farmId
                            )
                    );


            if (
                farmIds.length > 0
            ) {

                const farms =
                    await Dairy.find({

                        _id: {

                            $in:
                                farmIds

                        },

                        recordType: "farm",

                        status: "active"

                    });


                // ------------------------------------------
                // Preserve assignedFarm order.
                // ------------------------------------------

                const farmMap =
                    new Map(

                        farms.map(
                            farmRecord => [

                                idString(
                                    farmRecord._id
                                ),

                                farmRecord

                            ]
                        )

                    );


                assignedFarms =
                    farmIds

                        .map(
                            farmId =>

                                farmMap.get(
                                    idString(
                                        farmId
                                    )
                                )
                        )

                        .filter(
                            Boolean
                        );

            }

        }

    }


    // ======================================================
    // DETERMINE RECORDS THAT SUPPLY NORMAL FEED
    // ======================================================
    //
    // Farm:
    //
    //   Farm itself
    //   +
    //   every animal / structure assigned to the farm
    //
    // Asset:
    //
    //   Current asset only
    //
    // AgroStore:
    //
    //   Current AgroStore only
    //
    // Its inventory does NOT become part of the normal feed.
    // ======================================================

    let updateDairyIds = [

        dairy._id

    ];


    if (farm) {

        const farmCode =
            Number(
                dairy.code
            );


        const farmAssets =
            await Dairy.find({

                assetCode:
                    farmCode,

                recordType: {

                    $in: [

                        "animal",
                        "structure"

                    ]

                }

            })
            .select(
                "_id"
            )
            .lean();


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
        uniqueIds(
            updateDairyIds
        );


    // ======================================================
    // LOAD NORMAL UPDATES
    // ======================================================
//
// IMPORTANT:
//
// This query NEVER searches using dwellNumber.
//
// AgroStore inventory is not an Update.
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
                [
                    "name",
                    "code",
                    "recordType",
                    "assetCode",
                    "profileImage",
                    "profileImages"
                ].join(" ")

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
    // LOAD DAIRY INFORMATION FOR MILK FEEDS
    // ======================================================

    const milkDairies =
        await Dairy.find({

            _id: {

                $in:
                    updateDairyIds

            }

        })
        .select(
            [
                "_id",
                "name",
                "code",
                "recordType",
                "assetCode",
                "profileImage",
                "profileImages"
            ].join(" ")
        )
        .lean();


    // ======================================================
    // CREATE MILK DAIRY MAP
    // ======================================================

    const milkDairyMap =
        new Map(

            milkDairies.map(
                dairyRecord => [

                    idString(
                        dairyRecord._id
                    ),

                    dairyRecord

                ]
            )

        );


    // ======================================================
    // BUILD WEEKLY MILK FEEDS
    // ======================================================
//
// We intentionally build feeds per Dairy record.
//
// This allows a farm page to display milk reports belonging
// to:
//
//   • the farm
//   • animals
//   • other milk-producing assets
//
// while an individual asset page displays only its own milk.
//
// ======================================================

    let weeklyFeeds = [];


    for (
        const dairyId
        of updateDairyIds
    ) {

        const dairyRecord =
            milkDairyMap.get(
                idString(
                    dairyId
                )
            );


        if (!dairyRecord) {

            continue;

        }


        const dairyWeeklyFeeds =
            await buildWeeklyMilkFeeds(
                dairyId
            );


        if (
            !Array.isArray(
                dairyWeeklyFeeds
            )
        ) {

            continue;

        }


        // ==================================================
        // ATTACH SOURCE DAIRY INFORMATION
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


                milkFeed.dairyRecordType =
                    dairyRecord.recordType ||
                    null;


                milkFeed.dairyAssetCode =
                    dairyRecord.assetCode !==
                    undefined

                        ? dairyRecord.assetCode

                        : null;


                milkFeed.dairyImage =
                    dairyRecord.profileImage ||
                    (
                        Array.isArray(
                            dairyRecord.profileImages
                        ) &&
                        dairyRecord.profileImages.length
                            ? dairyRecord.profileImages[0]
                            : ""
                    );

            }
        );


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

    feed.sort(
        (a, b) => {

            const dateA =
                new Date(
                    a.createdAt ||
                    a.date ||
                    0
                ).getTime();


            const dateB =
                new Date(
                    b.createdAt ||
                    b.date ||
                    0
                ).getTime();


            return dateB - dateA;

        }
    );


    // ======================================================
    // COUNT COMMENTS
    // ======================================================

    let commentCount = 0;


    for (
        const item
        of feed
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
        // CURRENT RECORD
        // --------------------------------------------------

        dairy,


        // --------------------------------------------------
        // RECORD FLAGS
        // --------------------------------------------------

        isDairyFarm:
            farm,

        isAgroStore:
            agroStore,


        // --------------------------------------------------
        // NORMAL FEED
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
        // FARM ASSETS
        // --------------------------------------------------

        assetDairies,


        // --------------------------------------------------
        // ASSIGNED FARMS
        // --------------------------------------------------

        assignedFarms,


        // --------------------------------------------------
        // AGROSTORE INVENTORY
        // --------------------------------------------------
        //
        // IMPORTANT:
        //
        // Only populated for an AgroStore.
        //
        // These records are NOT part of `feed`.
        //
        // --------------------------------------------------

        animalFeeds

    };

};


// ==========================================================
// TOGGLE MILKING STATUS
// ==========================================================
//
// Toggles:
//
//     false → true
//     true  → false
//
// This operation modifies ONLY isMilking.
//
// It does NOT:
//
//     • create milk records
//     • delete milk records
//     • alter milk history
//     • alter milk totals
//     • alter animal code
//     • alter animal ownership
//
// The Dairy model itself will enforce its normal validation.
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

        const error =
            new Error(
                "Dairy ID is required."
            );

        error.status = 400;

        throw error;

    }


    if (
        !isValidObjectId(
            dairyId
        )
    ) {

        const error =
            new Error(
                "Invalid Dairy ID."
            );

        error.status = 400;

        throw error;

    }


    // ======================================================
    // LOAD DAIRY
    // ======================================================

    const dairy =
        await Dairy.findById(
            dairyId
        );


    if (!dairy) {

        const error =
            new Error(
                "Dairy asset not found."
            );

        error.status = 404;

        throw error;

    }


    // ======================================================
    // ONLY ANIMALS CAN BE MILKING
    // ======================================================

    if (
        dairy.recordType !== "animal"
    ) {

        const error =
            new Error(
                "Only animal records can have their milking status changed."
            );

        error.status = 400;

        throw error;

    }


    // ======================================================
    // TOGGLE
    // ======================================================

    dairy.isMilking =
        !Boolean(
            dairy.isMilking
        );


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
// Used by dairyWorker farm switching.
//
// Security:
//
// The requested farm MUST:
//
//   1. belong to the requested user
//   2. user role must be dairyWorker
//   3. farm must exist
//   4. farm must actually be a farm record
//
// ==========================================================

exports.getAssignedFarmForUser =
async (
    userId,
    farmId
) => {

    // ======================================================
    // VALIDATE IDs
    // ======================================================

    if (
        !userId ||
        !farmId
    ) {

        return null;

    }


    if (
        !isValidObjectId(
            userId
        ) ||
        !isValidObjectId(
            farmId
        )
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
            )
            .lean();


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
    // ASSIGNED FARM LIST
    // ======================================================

    const assignedFarmIds =
        Array.isArray(
            user.assignedFarm
        )

            ? user.assignedFarm

            : [];


    // ======================================================
    // CHECK WHETHER FARM IS ASSIGNED
    // ======================================================

    const requestedFarmId =
        farmId.toString();


    const isAssigned =
        assignedFarmIds.some(
            assignedId =>

                assignedId &&
                assignedId.toString() ===
                    requestedFarmId

        );


    if (!isAssigned) {

        return null;

    }


    // ======================================================
    // LOAD FARM
    // ======================================================

    const farm =
        await Dairy.findOne({

            _id:
                farmId,

            recordType:
                "farm",

            status:
                "active"

        });


    if (!farm) {

        return null;

    }


    // ======================================================
    // RETURN FARM
    // ======================================================

    return farm;

};


// ==========================================================
// OPTIONAL HELPER:
// GET FARM ASSETS
// ==========================================================
//
// Kept here so controllers can use the page service without
// duplicating the farm-asset query.
//
// ==========================================================

exports.getFarmAssets =
async (
    farmCode
) => {

    const code =
        Number(
            farmCode
        );


    if (
        !Number.isInteger(code) ||
        code >= 0
    ) {

        return [];

    }


    return Dairy.find({

        assetCode:
            code,

        recordType: {

            $in: [

                "animal",
                "structure"

            ]

        },

        status:
            "active"

    })
    .sort({

        recordType: 1,

        code: 1,

        name: 1

    });

};


// ==========================================================
// OPTIONAL HELPER:
// GET AGROSTORE CONTENT
// ==========================================================
//
// This provides a direct page-service method for controllers
// that need AgroStore contents without loading the entire
// Dairy page.
//
// ==========================================================

exports.getAgroStoreContent =
async (
    agroStoreId
) => {

    // ======================================================
    // VALIDATE ID
    // ======================================================

    if (
        !agroStoreId ||
        !isValidObjectId(
            agroStoreId
        )
    ) {

        const error =
            new Error(
                "Invalid AgroStore ID."
            );

        error.status = 400;

        throw error;

    }


    // ======================================================
    // LOAD AGROSTORE
    // ======================================================

    const agroStore =
        await Dairy.findById(
            agroStoreId
        );


    if (!agroStore) {

        const error =
            new Error(
                "AgroStore not found."
            );

        error.status = 404;

        throw error;

    }


    // ======================================================
    // VERIFY AGROSTORE
    // ======================================================

    if (
        !isAgroStore(
            agroStore
        )
    ) {

        const error =
            new Error(
                "The selected record is not an AgroStore."
            );

        error.status = 400;

        throw error;

    }


    // ======================================================
    // LOAD CONTENT
    // ======================================================

    const result =
        await animalFeedsService
            .getAnimalFeeds(
                agroStore._id
            );


    if (
        result &&
        Array.isArray(
            result.feeds
        )
    ) {

        return {

            agroStore,

            feeds:
                result.feeds

        };

    }


    return {

        agroStore,

        feeds: []

    };

};


// ==========================================================
// EXPORT HELPERS FOR TESTING / OTHER SERVICES
// ==========================================================

exports.isDairyFarm =
    isDairyFarm;


exports.isAgroStore =
    isAgroStore;


exports.getFarmCode =
    getFarmCode;