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
//     Any non-admin user may receive a standalone asset.
//
// ==========================================================

const mongoose = require("mongoose");

const User = require("../models/projectUser");

const Dairy = require("../models/dairy");


// ==========================================================
// CONSTANTS
// ==========================================================

const DAIRY_WORKER_ROLE = "dairyWorker";

const ADMIN_ROLE = "admin";

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
// Exact rule:
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
        String(dairy.recordType || "")
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

        ids = ids
            ? [ids]
            : [];

    }

    return ids
        .filter(id => {

            return (
                id !== null &&
                id !== undefined &&
                String(id).trim() !== ""
            );

        })
        .map(id => String(id).trim());

}


// ==========================================================
// REMOVE DUPLICATES
// ==========================================================

function getUniqueIds(ids) {

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
            !mongoose.Types.ObjectId.isValid(id)
        ) {

            throw new Error(message);

        }

    }

}


// ==========================================================
// GET ALL USERS
// ==========================================================

exports.getAllUsers = async () => {

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
// `dairies` contains only standalone/code-less assets
// available for assignment.
//
// ==========================================================

exports.getUserProfileData = async (userId) => {

    if (
        !mongoose.Types.ObjectId.isValid(userId)
    ) {

        return {
            user: null,
            dairies: []
        };

    }


    const user =
        await User.findById(userId)

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


    if (!user) {

        return {
            user: null,
            dairies: []
        };

    }


    // --------------------------------------------------------
    // Standalone assets.
    //
    // MongoDB:
    //
    //     { code: null }
    //
    // matches both:
    //
    //     code === null
    //
    // and
    //
    //     code does not exist.
    //
    // The same applies to assetCode.
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

exports.getUserById = async (userId) => {

    if (
        !mongoose.Types.ObjectId.isValid(userId)
    ) {

        return null;

    }


    return await User.findById(userId)

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
// assignedAsset:
//
//     dairyWorker
//         allowed
//
//     poultryWorker
//         allowed
//
//     admin
//         not allowed
//
// ==========================================================

exports.updateUserRole = async (
    userId,
    role
) => {

    if (
        !ALLOWED_ROLES.includes(role)
    ) {

        throw new Error(
            "Invalid user role."
        );

    }


    const user =
        await User.findById(userId);


    if (!user) {

        throw new Error(
            "User not found."
        );

    }


    user.role = role;


    // --------------------------------------------------------
    // Only dairyWorker can have Dairy Farms.
    // --------------------------------------------------------

    if (
        role !== DAIRY_WORKER_ROLE
    ) {

        user.assignedFarm = [];

    }


    // --------------------------------------------------------
    // Admins cannot have standalone assets.
    // --------------------------------------------------------

    if (
        role === ADMIN_ROLE
    ) {

        user.assignedAsset = [];

    }


    await user.save();


    return user;

};


// ==========================================================
// ASSIGN DAIRY FARMS
// ==========================================================
//
// ONLY dairyWorker.
//
// Valid farm:
//
//     code < 0
//
// Relationship:
//
//     User.assignedFarm
//
// ==========================================================

exports.assignDairyFarms = async (
    userId,
    assignedFarms
) => {

    const user =
        await User.findById(userId);


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


    // IMPORTANT:
    //
    // Do not use:
    //
    //     const uniqueIds = uniqueIds(...)
    //
    // because that shadows the helper function.
    //
    const farmIds =
        getUniqueIds(assignedFarms);


    if (!farmIds.length) {

        return user;

    }


    validateObjectIds(
        farmIds,
        "One or more selected Dairy Farms are invalid."
    );


    // --------------------------------------------------------
    // Find only valid Dairy Farms.
    //
    // Dairy Farm:
    //
    //     code < 0
    //
    // --------------------------------------------------------

    const farms =
        await Dairy.find({

            _id: {
                $in: farmIds
            },

            code: {
                $lt: 0
            }

        })
        .select(
            "_id code name"
        );


    if (
        farms.length !== farmIds.length
    ) {

        throw new Error(
            "One or more selected records are not valid Dairy Farms."
        );

    }


    // --------------------------------------------------------
    // Existing assignments.
    // --------------------------------------------------------

    const existingFarmIds =
        new Set(

            (user.assignedFarm || [])
                .map(id => {

                    return String(
                        id._id || id
                    );

                })

        );


    // --------------------------------------------------------
    // Add only new assignments.
    // --------------------------------------------------------

    for (const farm of farms) {

        const farmId =
            String(farm._id);


        if (
            !existingFarmIds.has(farmId)
        ) {

            user.assignedFarm.push(
                farm._id
            );

            existingFarmIds.add(
                farmId
            );

        }

    }


    await user.save();


    return user;

};


// ==========================================================
// UNASSIGN ONE DAIRY FARM
// ==========================================================

exports.unassignDairyFarm = async (
    userId,
    farmId
) => {

    const user =
        await User.findById(userId);


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
        (user.assignedFarm || [])
            .filter(id => {

                return (
                    String(
                        id._id || id
                    ) !==
                    String(farmId)
                );

            });


    await user.save();


    return user;

};


// ==========================================================
// ASSIGN STANDALONE ASSETS
// ==========================================================
//
// Allowed:
//
//     dairyWorker
//     poultryWorker
//
// Not allowed:
//
//     admin
//
// ==========================================================

exports.assignDairyAssets = async (
    userId,
    assignedAssets
) => {

    const user =
        await User.findById(userId);


    if (!user) {

        throw new Error(
            "User not found."
        );

    }


    if (
        user.role === ADMIN_ROLE
    ) {

        throw new Error(
            "Standalone assets cannot be assigned to an Administrator."
        );

    }


    // IMPORTANT:
    //
    // Use a different variable name so that the helper
    // function is not shadowed.
    //
    const assetIds =
        getUniqueIds(assignedAssets);


    if (!assetIds.length) {

        return user;

    }


    validateObjectIds(
        assetIds,
        "One or more selected assets are invalid."
    );


    // --------------------------------------------------------
    // Find ONLY standalone assets.
    //
    // Exact rule:
    //
    //     recordType === "structure"
    //     code === null / missing
    //     assetCode === null / missing
    //
    // --------------------------------------------------------

    const assets =
        await Dairy.find({

            _id: {
                $in: assetIds
            },

            recordType: "structure",

            code: null,

            assetCode: null

        })
        .select(
            "_id name code assetCode recordType type condition location description displayImage profileImage status"
        );


    // --------------------------------------------------------
    // Every submitted ID must be a valid standalone asset.
    // --------------------------------------------------------

    if (
        assets.length !== assetIds.length
    ) {

        throw new Error(
            "One or more selected records are not valid standalone assets."
        );

    }


    // --------------------------------------------------------
    // Existing assigned assets.
    // --------------------------------------------------------

    const existingAssetIds =
        new Set(

            (user.assignedAsset || [])
                .map(id => {

                    return String(
                        id._id || id
                    );

                })

        );


    // --------------------------------------------------------
    // Add only assets that are not already assigned.
    // --------------------------------------------------------

    for (const asset of assets) {

        const assetId =
            String(asset._id);


        if (
            !existingAssetIds.has(assetId)
        ) {

            user.assignedAsset.push(
                asset._id
            );

            existingAssetIds.add(
                assetId
            );

        }

    }


    await user.save();


    return user;

};


// ==========================================================
// UNASSIGN ONE STANDALONE ASSET
// ==========================================================
//
// The Dairy record is NOT deleted.
//
// Only:
//
//     User.assignedAsset
//
// is modified.
//
// ==========================================================

exports.unassignDairyAsset = async (
    userId,
    assetId
) => {

    const user =
        await User.findById(userId);


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
        (user.assignedAsset || [])
            .filter(id => {

                return (
                    String(
                        id._id || id
                    ) !==
                    String(assetId)
                );

            });


    await user.save();


    return user;

};


// ==========================================================
// DELETE USER
// ==========================================================

exports.deleteUser = async (
    userId
) => {

    if (
        !mongoose.Types.ObjectId.isValid(userId)
    ) {

        throw new Error(
            "Invalid user ID."
        );

    }


    const user =
        await User.findById(userId);


    if (!user) {

        throw new Error(
            "User not found."
        );

    }


    await User.findByIdAndDelete(
        userId
    );


    return user;

};