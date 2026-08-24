// ==========================================================
// services/farmContextService.js
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
// Resolves the farm the authenticated user is currently
// operating against.
//
// RULES
// ----------------------------------------------------------
//
// dairyWorker:
//     Can only use farms contained in assignedFarm.
//
// admin:
//     Has no assignedFarm requirement.
//     Can use any Dairy Farm.
//
// ACTIVE FARM
// ----------------------------------------------------------
// The currently selected farm is stored in the session:
//
//     req.session.activeFarm
//
// The session stores the Dairy ObjectId.
//
// IMPORTANT
// ----------------------------------------------------------
// This service does NOT calculate milk production.
// It only resolves farm identity and authorization.
// ==========================================================

const mongoose =
    require("mongoose");

const Dairy =
    require("../models/dairy");


// ==========================================================
// GET USER ID
// ==========================================================

function getUserId(user) {

    return (
        user?._id ||
        user?.id ||
        null
    );

}


// ==========================================================
// OBJECT ID
// ==========================================================

function isValidObjectId(value) {

    return mongoose.Types.ObjectId.isValid(
        value
    );

}


// ==========================================================
// GET ASSIGNED FARM IDS
// ==========================================================

function getAssignedFarmIds(user) {

    if (!Array.isArray(user?.assignedFarm)) {

        return [];

    }

    return user.assignedFarm
        .map(farm => {

            if (
                typeof farm === "object" &&
                farm !== null
            ) {

                return farm._id;

            }

            return farm;

        })
        .filter(Boolean)
        .map(String);

}


// ==========================================================
// VERIFY FARM IS ACTUALLY A DAIRY FARM
// ==========================================================
//
// Your Dairy schema identifies a Dairy Farm by:
//
//     code < 0
//
// ==========================================================

async function getFarmById(farmId) {

    if (
        !farmId ||
        !isValidObjectId(farmId)
    ) {

        return null;

    }

    return Dairy.findOne({

        _id: farmId,

        code: {
            $lt: 0
        }

    });

}


// ==========================================================
// GET AVAILABLE FARMS
// ==========================================================

async function getAvailableFarms(user) {

    if (!user) {

        return [];

    }


    // ======================================================
    // ADMIN
    // ======================================================
    //
    // Admin can operate any dairy farm.
    //
    // ======================================================

    if (
        user.role === "admin"
    ) {

        return Dairy.find({

            code: {
                $lt: 0
            }

        })
        .sort({
            name: 1
        });

    }


    // ======================================================
    // DAIRY WORKER
    // ======================================================

    const assignedIds =
        getAssignedFarmIds(user);


    if (!assignedIds.length) {

        return [];

    }


    return Dairy.find({

        _id: {
            $in: assignedIds
        },

        code: {
            $lt: 0
        }

    })
    .sort({
        name: 1
    });

}


// ==========================================================
// RESOLVE ACTIVE FARM
// ==========================================================
//
// Priority:
//
// 1. Explicit requested farm
// 2. Existing session activeFarm
// 3. First authorized farm
//
// For admin:
//
// Any valid Dairy Farm is allowed.
//
// For dairyWorker:
//
// Only assigned farms are allowed.
//
// ==========================================================

async function resolveActiveFarm({

    user,

    requestedFarmId,

    session

}) {

    if (!user) {

        const error =
            new Error(
                "Authenticated user is required."
            );

        error.code =
            "FARM_USER_REQUIRED";

        throw error;

    }


    const availableFarms =
        await getAvailableFarms(
            user
        );


    if (!availableFarms.length) {

        const error =
            new Error(
                "No dairy farm is available for this user."
            );

        error.code =
            "FARM_NOT_AVAILABLE";

        throw error;

    }


    const availableIds =
        availableFarms.map(
            farm => String(farm._id)
        );


    // ======================================================
    // REQUESTED FARM
    // ======================================================

    if (
        requestedFarmId
    ) {

        const requestedId =
            String(
                requestedFarmId
            );


        if (
            !availableIds.includes(
                requestedId
            )
        ) {

            const error =
                new Error(
                    "You are not authorized to use this dairy farm."
                );

            error.code =
                "FARM_NOT_ASSIGNED";

            throw error;

        }


        const farm =
            availableFarms.find(
                item =>
                    String(item._id) ===
                    requestedId
            );


        if (session) {

            session.activeFarm =
                String(farm._id);

        }


        return farm;

    }


    // ======================================================
    // SESSION FARM
    // ======================================================

    const sessionFarmId =
        session?.activeFarm;


    if (
        sessionFarmId &&
        availableIds.includes(
            String(sessionFarmId)
        )
    ) {

        const farm =
            availableFarms.find(
                item =>
                    String(item._id) ===
                    String(sessionFarmId)
            );


        return farm;

    }


    // ======================================================
    // DEFAULT FARM
    // ======================================================

    const farm =
        availableFarms[0];


    if (session) {

        session.activeFarm =
            String(farm._id);

    }


    return farm;

}


// ==========================================================
// SET ACTIVE FARM
// ==========================================================

async function setActiveFarm({

    user,

    farmId,

    session

}) {

    return resolveActiveFarm({

        user,

        requestedFarmId:
            farmId,

        session

    });

}


// ==========================================================
// CLEAR ACTIVE FARM
// ==========================================================

function clearActiveFarm(session) {

    if (!session) {

        return;

    }

    delete session.activeFarm;

}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    getAvailableFarms,

    getFarmById,

    resolveActiveFarm,

    setActiveFarm,

    clearActiveFarm,

    getAssignedFarmIds

};