// ==========================================================
// services/extrasService.js
// ASSIGNED ASSETS SERVICE
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
//
// Retrieves standalone/code-less Dairy assets assigned
// directly to a user.
//
// ASSIGNED ASSET RULE:
//
//     Dairy.code      === null
//     Dairy.assetCode === null
//
// User.assignedAsset:
//     [
//         Dairy._id,
//         Dairy._id,
//         ...
//     ]
//
// ==========================================================


const mongoose =
    require("mongoose");

const User =
    require("../models/User");

const Dairy =
    require("../models/dairy");


// ==========================================================
// GET ASSIGNED ASSETS
// ==========================================================

async function getAssignedAssets(userId) {

    // ------------------------------------------------------
    // Validate user ID
    // ------------------------------------------------------

    if (
        !mongoose.Types.ObjectId.isValid(
            userId
        )
    ) {

        return [];

    }


    // ------------------------------------------------------
    // Find user
    // ------------------------------------------------------

    const user =
        await User.findById(
            userId
        )
        .select("assignedAsset")
        .lean();


    if (!user) {

        return [];

    }


    // ------------------------------------------------------
    // No assigned assets
    // ------------------------------------------------------

    if (
        !Array.isArray(
            user.assignedAsset
        ) ||
        user.assignedAsset.length === 0
    ) {

        return [];

    }


    // ------------------------------------------------------
    // Retrieve ONLY legitimate assigned assets
    // ------------------------------------------------------
    //
    // The database query itself enforces the architecture:
    //
    //     recordType = structure
    //     code       = null
    //     assetCode  = null
    //
    // ------------------------------------------------------

    return Dairy.find({

        _id: {
            $in: user.assignedAsset
        },

        recordType: "structure",

        code: null,

        assetCode: null,

        status: "active"

    })
    .sort({
        name: 1
    });

}


// ==========================================================
// GET USER + ASSIGNED ASSETS
// ==========================================================

async function getUserAssignedAssets(userId) {

    if (
        !mongoose.Types.ObjectId.isValid(
            userId
        )
    ) {

        return {

            user: null,

            extras: []

        };

    }


    const user =
        await User.findById(
            userId
        )
        .select(
            "name email role assignedAsset"
        )
        .lean();


    if (!user) {

        return {

            user: null,

            extras: []

        };

    }


    const extras =
        await getAssignedAssets(
            userId
        );


    return {

        user,

        extras

    };

}


// ==========================================================
// EXPORT
// ==========================================================

module.exports = {

    getAssignedAssets,

    getUserAssignedAssets

};