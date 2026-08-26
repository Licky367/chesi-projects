// ==========================================================
// services/accountsService.js
// ==========================================================
//
// ACCOUNT SERVICE
//
// RESPONSIBILITIES:
//
// 1. Retrieve users
// 2. Retrieve user profile information
// 3. Update user roles
// 4. Assign Dairy Farms to dairyWorkers
// 5. Unassign Dairy Farms
// 6. Assign standalone/code-less Dairy assets
// 7. Unassign standalone/code-less Dairy assets
// 8. Delete users
//
// SINGLE SOURCE OF TRUTH:
//
//     models/dairy.js
//
// ASSIGNED FARM RULE:
//
//     A Dairy Farm is:
//
//         code < 0
//
//     Farm assignments are stored in:
//
//         User.assignedFarm
//
//     Only dairyWorker users may have assigned farms.
//
//
// ASSIGNED ASSET RULE:
//
//     A standalone assigned asset is:
//
//         recordType === "structure"
//         AND
//         code === null / undefined
//         AND
//         assetCode === null / undefined
//
//     These assets are stored in:
//
//         User.assignedAsset
//
//     assignedAsset is NOT restricted to dairyWorker.
//
//     Any user may receive a standalone asset EXCEPT:
//
//         role === "admin"
//
// ==========================================================


const mongoose =
    require("mongoose");


const User =
    require("../models/projectUser");


const Dairy =
    require("../models/dairy");


// ==========================================================
// CONSTANTS
// ==========================================================

const DAIRY_WORKER_ROLE =
    "dairyWorker";


const ADMIN_ROLE =
    "admin";


const ALLOWED_ROLES = [
    "dairyWorker",
    "poultryWorker",
    "admin"
];


// ==========================================================
// HELPER
// ==========================================================
//
// Determines whether a Dairy record is a valid standalone
// asset.
//
// THIS MUST MATCH:
//
//     views/admin/standalone.ejs
//
// Exactly:
//
//     recordType === "structure"
//     code === null / undefined
//     assetCode === null / undefined
//
// ==========================================================

function isStandaloneAsset(dairy) {

    if (!dairy) {
        return false;
    }


    const recordType =
        String(
            dairy.recordType || ""
        )
            .trim()
            .toLowerCase();


    const codeIsNull =
        dairy.code === null ||
        dairy.code === undefined;


    const assetCodeIsNull =
        dairy.assetCode === null ||
        dairy.assetCode === undefined;


    return (
        recordType === "structure" &&
        codeIsNull &&
        assetCodeIsNull
    );

}


// ==========================================================
// NORMALIZE IDS
// ==========================================================

function normalizeIds(ids) {

    if (!Array.isArray(ids)) {

        ids =
            ids
                ? [ids]
                : [];

    }


    return ids
        .filter(
            id =>
                id !== null &&
                id !== undefined &&
                String(id).trim() !== ""
        )
        .map(
            id =>
                String(id).trim()
        );

}


// ==========================================================
// REMOVE DUPLICATES
// ==========================================================

function uniqueIds(ids) {

    return [
        ...new Set(
            normalizeIds(ids)
        )
    ];

}


// ==========================================================
// VALIDATE OBJECT IDS
// ==========================================================

function validateObjectIds(
    ids,
    message
) {

    for (const id of ids) {

        if (
            !mongoose.Types.ObjectId.isValid(
                id
            )
        ) {

            throw new Error(
                message
            );

        }

    }

}


// ==========================================================
// GET ALL USERS
// ==========================================================

exports.getAllUsers =
async () => {

    return await User.find()
        .sort({
            name: 1
        });

};


// ==========================================================
// GET USER PROFILE DATA
// ==========================================================
//
// Returns:
//
//     user
//     dairies
//
// `dairies` contains ONLY standalone/code-less assets.
//
// This is what populates the Assigned Asset dropdown.
//
// ==========================================================

exports.getUserProfileData =
async (userId) => {

    const user =
        await User.findById(
            userId
        )
        .populate({
            path: "assignedFarm",
            select:
                "name code profileImage status recordType"
        })
        .populate({
            path: "assignedAsset",
            select:
                "name code assetCode recordType type condition location description displayImage profileImage status"
        });


    // --------------------------------------------------------
    // Standalone assets available for assignment.
    // --------------------------------------------------------
    //
    // IMPORTANT:
    //
    // Do NOT query:
    //
    //     code: { $exists: false }
    //
    // alone.
    //
    // The standalone definition is the same definition
    // used by views/admin/standalone.ejs.
    //
    // --------------------------------------------------------

    const dairies =
        await Dairy.find({

            recordType: "structure",

            code: null,

            assetCode: null

        })
        .select(
            "name code assetCode recordType type condition location description displayImage profileImage status"
        )
        .sort({
            name: 1
        });


    return {

        user,

        dairies

    };

};


// ==========================================================
// GET SINGLE USER
// ==========================================================

exports.getUserById =
async (userId) => {

    return await User.findById(
        userId
    )
    .populate({
        path: "assignedFarm",
        select:
            "name code profileImage status recordType"
    })
    .populate({
        path: "assignedAsset",
        select:
            "name code assetCode recordType type condition location description displayImage profileImage status"
    });

};


// ==========================================================
// UPDATE USER ROLE
// ==========================================================
//
// RULE:
//
//     dairyWorker
//         may have assignedFarm
//
//     poultryWorker
//         cannot have assignedFarm
//
//     admin
//         cannot have assignedFarm
//
// IMPORTANT:
//
//     assignedAsset is NOT cleared here.
//
// A standalone asset may remain assigned to a user even if
// their role changes between dairyWorker and poultryWorker.
//
// However, an admin must not retain assigned assets because
// admins are not permitted to receive assignedAsset records.
//
// ==========================================================

exports.updateUserRole =
async (
    userId,
    role
) => {

    if (
        !ALLOWED_ROLES.includes(
            role
        )
    ) {

        throw new Error(
            "Invalid user role."
        );

    }


    const update = {
        role
    };


    // --------------------------------------------------------
    // Only dairyWorker can have Dairy Farms.
    // --------------------------------------------------------

    if (
        role !== DAIRY_WORKER_ROLE
    ) {

        update.assignedFarm = [];

    }


    // --------------------------------------------------------
    // Admins cannot have assigned standalone assets.
    // --------------------------------------------------------

    if (
        role === ADMIN_ROLE
    ) {

        update.assignedAsset = [];

    }


    return await User.findByIdAndUpdate(

        userId,

        update,

        {
            new: true,
            runValidators: true
        }

    );

};


// ==========================================================
// ASSIGN DAIRY FARMS
// ==========================================================
//
// ONLY dairyWorker.
//
// A valid farm:
//
//     code < 0
//
// Farm relationship:
//
//     User.assignedFarm
//
// ==========================================================

exports.assignDairyFarms =
async (
    userId,
    assignedFarms
) => {

    const user =
        await User.findById(
            userId
        );


    if (!user) {

        throw new Error(
            "User not found."
        );

    }


    if (
        user.role !== DAIRY_WORKER_ROLE
    ) {

        throw new Error(
            "Only a Dairy Worker can be assigned Dairy Farms."
        );

    }


    const uniqueIds =
        uniqueIds(
            assignedFarms
        );


    if (!uniqueIds.length) {

        return user;

    }


    validateObjectIds(
        uniqueIds,
        "One or more selected Dairy Farms are invalid."
    );


    // --------------------------------------------------------
    // Find only Dairy Farm structures.
    //
    // Farm:
    //
    //     code < 0
    //
    // --------------------------------------------------------

    const farms =
        await Dairy.find({

            _id: {
                $in: uniqueIds
            },

            code: {
                $lt: 0
            }

        })
        .select(
            "_id code name"
        );


    if (
        farms.length !== uniqueIds.length
    ) {

        throw new Error(
            "One or more selected records are not valid Dairy Farms."
        );

    }


    // --------------------------------------------------------
    // Existing assignments.
    // --------------------------------------------------------

    const existingIds =
        new Set(

            (user.assignedFarm || [])
                .map(
                    id =>
                        String(
                            id._id || id
                        )
                )

        );


    // --------------------------------------------------------
    // Add only new assignments.
    // --------------------------------------------------------

    for (
        const farm
        of farms
    ) {

        const id =
            String(
                farm._id
            );


        if (
            !existingIds.has(id)
        ) {

            user.assignedFarm.push(
                farm._id
            );

            existingIds.add(id);

        }

    }


    await user.save();


    return user;

};


// ==========================================================
// UNASSIGN ONE DAIRY FARM
// ==========================================================

exports.unassignDairyFarm =
async (
    userId,
    farmId
) => {

    const user =
        await User.findById(
            userId
        );


    if (!user) {

        throw new Error(
            "User not found."
        );

    }


    if (
        user.role !== DAIRY_WORKER_ROLE
    ) {

        throw new Error(
            "Only a Dairy Worker can have assigned Dairy Farms."
        );

    }


    if (
        !mongoose.Types.ObjectId.isValid(
            farmId
        )
    ) {

        throw new Error(
            "Invalid Dairy Farm."
        );

    }


    const farm =
        await Dairy.findOne({

            _id: farmId,

            code: {
                $lt: 0
            }

        });


    if (!farm) {

        throw new Error(
            "The selected record is not a valid Dairy Farm."
        );

    }


    user.assignedFarm =
        (
            user.assignedFarm || []
        )
        .filter(
            id =>
                String(
                    id._id || id
                ) !==
                String(farmId)
        );


    await user.save();


    return user;

};


// ==========================================================
// ASSIGN STANDALONE ASSETS
// ==========================================================
//
// IMPORTANT:
//
// Unlike assignedFarm:
//
//     assignedAsset
//
// can be assigned to:
//
//     dairyWorker
//     poultryWorker
//     any other non-admin user
//
// but NEVER:
//
//     admin
//
// ==========================================================

exports.assignDairyAssets =
async (
    userId,
    assignedAssets
) => {

    const user =
        await User.findById(
            userId
        );


    if (!user) {

        throw new Error(
            "User not found."
        );

    }


    // --------------------------------------------------------
    // Admins cannot receive assigned assets.
    // --------------------------------------------------------

    if (
        user.role === ADMIN_ROLE
    ) {

        throw new Error(
            "Standalone assets cannot be assigned to an Administrator."
        );

    }


    const uniqueIds =
        uniqueIds(
            assignedAssets
        );


    if (!uniqueIds.length) {

        return user;

    }


    validateObjectIds(
        uniqueIds,
        "One or more selected assets are invalid."
    );


    // --------------------------------------------------------
    // Find ONLY standalone assets.
    //
    // Exact standalone rule:
    //
    //     recordType === "structure"
    //     code === null
    //     assetCode === null
    //
    // --------------------------------------------------------

    const assets =
        await Dairy.find({

            _id: {
                $in: uniqueIds
            },

            recordType: "structure",

            code: null,

            assetCode: null

        })
        .select(
            "_id name code assetCode recordType type condition location description displayImage profileImage status"
        );


    // --------------------------------------------------------
    // Every submitted ID must resolve to a standalone asset.
    // --------------------------------------------------------

    if (
        assets.length !== uniqueIds.length
    ) {

        throw new Error(
            "One or more selected records are not valid standalone assets."
        );

    }


    // --------------------------------------------------------
    // Existing assigned assets.
    // --------------------------------------------------------

    const existingIds =
        new Set(

            (user.assignedAsset || [])
                .map(
                    id =>
                        String(
                            id._id || id
                        )
                )

        );


    // --------------------------------------------------------
    // Add only assets that are not already assigned.
    // --------------------------------------------------------

    for (
        const asset
        of assets
    ) {

        const id =
            String(
                asset._id
            );


        if (
            !existingIds.has(id)
        ) {

            user.assignedAsset.push(
                asset._id
            );

            existingIds.add(id);

        }

    }


    await user.save();


    return user;

};


// ==========================================================
// UNASSIGN ONE STANDALONE ASSET
// ==========================================================
//
// The asset itself remains in the Dairy collection.
//
// Only the relationship:
//
//     User.assignedAsset
//
// is removed.
//
// ==========================================================

exports.unassignDairyAsset =
async (
    userId,
    assetId
) => {

    const user =
        await User.findById(
            userId
        );


    if (!user) {

        throw new Error(
            "User not found."
        );

    }


    if (
        !mongoose.Types.ObjectId.isValid(
            assetId
        )
    ) {

        throw new Error(
            "Invalid standalone asset."
        );

    }


    // --------------------------------------------------------
    // Confirm that the record is still a standalone asset.
    // --------------------------------------------------------

    const asset =
        await Dairy.findOne({

            _id: assetId,

            recordType: "structure",

            code: null,

            assetCode: null

        });


    if (!asset) {

        throw new Error(
            "The selected record is not a valid standalone asset."
        );

    }


    user.assignedAsset =
        (
            user.assignedAsset || []
        )
        .filter(
            id =>
                String(
                    id._id || id
                ) !==
                String(assetId)
        );


    await user.save();


    return user;

};


// ==========================================================
// DELETE USER
// ==========================================================

exports.deleteUser =
async (
    userId
) => {

    return await User.findByIdAndDelete(
        userId
    );

};