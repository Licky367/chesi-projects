// ==========================================================
// services/farmService.js
// ==========================================================

const ProjectUser =
    require("../models/projectUser");

const Dairy =
    require("../models/dairy");


// ==========================================================
// GET ASSIGNED FARMS
// ==========================================================

exports.getAssignedFarms =
async (userId) => {

    // --------------------------------------------------------
    // FIND USER
    // --------------------------------------------------------

    const user =
        await ProjectUser
            .findById(userId)
            .select("role assignedFarm");


    if (!user) {

        throw new Error(
            "User not found"
        );

    }


    // --------------------------------------------------------
    // ROLE CHECK
    // --------------------------------------------------------

    if (
        user.role !== "dairyWorker"
    ) {

        throw new Error(
            "Only dairy workers can access assigned farms."
        );

    }


    // --------------------------------------------------------
    // GET FARM IDS
    // --------------------------------------------------------

    const assignedFarmIds =
        Array.isArray(user.assignedFarm)
            ? user.assignedFarm
            : [];


    // --------------------------------------------------------
    // NO ASSIGNED FARMS
    // --------------------------------------------------------

    if (
        assignedFarmIds.length === 0
    ) {

        return [];

    }


    // --------------------------------------------------------
    // LOAD FARM RECORDS
    // --------------------------------------------------------

    const farms =
        await Dairy.find({

            _id: {
                $in: assignedFarmIds
            }

        });


    return farms;

};


// ==========================================================
// VERIFY ASSIGNED FARM
// ==========================================================
//
// Returns the Dairy farm only if it:
//
// 1. Exists
// 2. Is assigned to the user
//
// ==========================================================

exports.getAssignedFarm =
async (
    userId,
    farmId
) => {

    // --------------------------------------------------------
    // FIND USER
    // --------------------------------------------------------

    const user =
        await ProjectUser
            .findById(userId)
            .select("role assignedFarm");


    if (!user) {

        throw new Error(
            "User not found"
        );

    }


    // --------------------------------------------------------
    // ROLE CHECK
    // --------------------------------------------------------

    if (
        user.role !== "dairyWorker"
    ) {

        throw new Error(
            "Only dairy workers can switch assigned farms."
        );

    }


    // --------------------------------------------------------
    // CHECK FARM ID
    // --------------------------------------------------------

    if (!farmId) {

        throw new Error(
            "Farm ID is required."
        );

    }


    // --------------------------------------------------------
    // CHECK ASSIGNMENT
    // --------------------------------------------------------

    const assignedFarmIds =
        Array.isArray(user.assignedFarm)
            ? user.assignedFarm
            : [];


    const isAssigned =
        assignedFarmIds.some(
            assignedId =>
                assignedId.toString() ===
                farmId.toString()
        );


    if (!isAssigned) {

        throw new Error(
            "This Dairy Farm is not assigned to your account."
        );

    }


    // --------------------------------------------------------
    // FIND FARM
    // --------------------------------------------------------

    const farm =
        await Dairy.findById(
            farmId
        );


    if (!farm) {

        throw new Error(
            "Dairy Farm not found."
        );

    }


    return farm;

};