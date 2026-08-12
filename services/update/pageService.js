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

exports.getDairyPage = async (id) => {


    // ======================================================
    // GET CURRENT DAIRY
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
    // Dairy Farm:
    //     code < 0
    //
    // Child assets:
    //     assetCode === dairy.code
    //
    // Includes:
    //     Animals
    //     Structures
    //     Machines
    //     Tools
    //     Other farm property
    //
    // Does NOT include:
    //     Other Dairy Farms
    //     Other farm assets
    //     Standalone assets
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
        updates.map(formatFeed);


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
            Array.isArray(item.comments)
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
// GET ASSIGNED FARMS
//
// Returns the Dairy Farm records assigned to a dairyWorker.
//
// IMPORTANT:
// The order of assignedFarm is preserved.
//
// Therefore:
//
// assignedFarm[0]
//     = first farm
//
// assignedFarm[1]
//     = second farm
//
// etc.
//
// This is important because the first assigned farm is also
// the farm used by authController after login.
// ==========================================================

exports.getAssignedFarms =
async (userId) => {


    // ======================================================
    // FIND USER
    // ======================================================

    const user =
        await ProjectUser
            .findById(userId)
            .select(
                "role assignedFarm"
            )
            .lean();


    if (!user) {

        throw new Error(
            "User not found."
        );

    }


    // ======================================================
    // ONLY DAIRY WORKERS
    // ======================================================

    if (
        user.role !==
        "dairyWorker"
    ) {

        return [];

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
    // NO ASSIGNED FARMS
    // ======================================================

    if (
        assignedFarmIds.length === 0
    ) {

        return [];

    }


    // ======================================================
    // GET FARM RECORDS
    // ======================================================

    const farms =
        await Dairy.find({

            _id: {

                $in:
                    assignedFarmIds

            }

        }).lean();


    // ======================================================
    // CREATE FARM LOOKUP
    // ======================================================

    const farmMap =
        new Map(

            farms.map(
                farm => [

                    farm._id.toString(),

                    farm

                ]
            )

        );


    // ======================================================
    // PRESERVE assignedFarm ORDER
    // ======================================================

    const orderedFarms =
        assignedFarmIds
            .map(

                farmId =>
                    farmMap.get(
                        farmId.toString()
                    )

            )
            .filter(Boolean);


    return orderedFarms;

};


// ==========================================================
// GET ONE ASSIGNED FARM
//
// Returns the farm only when it is actually assigned to
// the specified dairy worker.
//
// Returns:
//     Dairy document
//
// or:
//     null
// ==========================================================

exports.getAssignedFarm =
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
            )
            .lean();


    if (!user) {

        throw new Error(
            "User not found."
        );

    }


    // ======================================================
    // ONLY DAIRY WORKERS
    // ======================================================

    if (
        user.role !==
        "dairyWorker"
    ) {

        return null;

    }


    // ======================================================
    // ASSIGNED FARMS
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
        await Dairy
            .findById(farmId)
            .lean();


    return farm || null;

};