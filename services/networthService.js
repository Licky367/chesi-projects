// ==========================================================
// services/networthService.js
// ==========================================================
//
// NET WORTH SERVICE
//
// SINGLE SOURCE OF TRUTH:
//
//     models/dairy.js
//
// USER MODEL:
//
//     models/projectUser.js
//
// RESPONSIBILITIES:
//
// 1. Load the main Net Worth page
// 2. Load one Dairy Farm and its assigned assets
// 3. Prepare Add Asset page
// 4. Create a manual / structure asset
// 5. Load an individual Dairy record
// 6. Update an individual Dairy record
// 7. Supply JSON data for Net Worth
// 8. Supply JSON data for a Dairy Farm
// 9. Supply available non-admin users for asset assignment
// 10. Assign a standalone Dairy asset to a non-admin user
//
// RECORD CLASSIFICATION
// ----------------------------------------------------------
//
//     code < 0
//         = Dairy Farm
//
//     code > 0
//         = identified animal
//
//     code === null
//         = structure / facility / manual asset
//
// ASSIGNMENT
// ----------------------------------------------------------
//
// A standalone asset:
//
//     code === null
//
//     assetCode === null
//
// may be assigned to a User.
//
// User:
//
//     assignedAsset
//
// stores the Dairy document _id.
//
// IMPORTANT
// ----------------------------------------------------------
//
// The browser never controls:
//
//     code
//     assetCode
//
// Assignment is controlled by this service.
//
// ==========================================================

"use strict";

const mongoose = require("mongoose");

const Dairy = require("../models/dairy");
const User = require("../models/projectUser");


// ==========================================================
// CONSTANTS
// ==========================================================

const STATUS_VALUES = [
    "active",
    "sold",
    "disposed",
    "inactive"
];


// ----------------------------------------------------------
// These are the asset types exposed by networth-add.ejs.
// ----------------------------------------------------------

const ASSET_TYPES = [
    "machine",
    "equipment",
    "tool",
    "building",
    "cowshed",
    "milkingParlour",
    "feedStore",
    "hayShed",
    "waterSystem",
    "fencing",
    "vehicle",
    "generator",
    "solarSystem",
    "other"
];


// ==========================================================
// HELPERS
// ==========================================================

function createError(
    message,
    statusCode = 500
) {

    const error =
        new Error(message);

    error.statusCode =
        statusCode;

    return error;
}


// ==========================================================
// VALIDATE OBJECT ID
// ==========================================================

function isValidObjectId(id) {

    return mongoose.Types.ObjectId.isValid(id);

}


// ==========================================================
// REQUIRE OBJECT ID
// ==========================================================

function requireObjectId(
    id,
    label = "record"
) {

    if (!isValidObjectId(id)) {

        throw createError(
            `Invalid ${label} ID.`,
            400
        );

    }

    return new mongoose.Types.ObjectId(id);

}


// ==========================================================
// CONVERT DOCUMENT
// ==========================================================

function plainDocument(document) {

    if (!document) {

        return null;

    }

    if (
        typeof document.toObject ===
        "function"
    ) {

        return document.toObject();

    }

    return document;

}


// ==========================================================
// NUMERIC VALUE
// ==========================================================

function numericValue(value) {

    const number =
        Number(value);

    if (!Number.isFinite(number)) {

        return 0;

    }

    return number;

}


// ==========================================================
// NORMALIZE NUMBER
// ==========================================================

function normalizeNumber(
    value,
    fallback = 0
) {

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {

        return fallback;

    }

    const number =
        Number(value);

    return Number.isFinite(number)
        ? number
        : fallback;

}


// ==========================================================
// NORMALIZE BOOLEAN
// ==========================================================

function normalizeBoolean(value) {

    if (
        value === undefined ||
        value === null
    ) {

        return false;

    }

    if (
        typeof value === "boolean"
    ) {

        return value;

    }

    const normalized =
        String(value)
            .trim()
            .toLowerCase();

    return (
        normalized === "true" ||
        normalized === "1" ||
        normalized === "yes" ||
        normalized === "on"
    );

}


// ==========================================================
// NORMALIZE TEXT
// ==========================================================

function normalizeText(value) {

    if (
        value === undefined ||
        value === null
    ) {

        return "";

    }

    return String(value).trim();

}


// ==========================================================
// DATE NORMALIZATION
// ==========================================================

function normalizeDate(value) {

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {

        return null;

    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return null;

    }

    return date;

}


// ==========================================================
// AGE TEXT
// ==========================================================

function calculateAgeText(
    dateOfBirth
) {

    if (!dateOfBirth) {

        return "";

    }

    const dob =
        new Date(dateOfBirth);

    if (
        Number.isNaN(
            dob.getTime()
        )
    ) {

        return "";

    }

    const now =
        new Date();

    if (dob > now) {

        return "";

    }

    let years =
        now.getFullYear() -
        dob.getFullYear();

    let months =
        now.getMonth() -
        dob.getMonth();

    let days =
        now.getDate() -
        dob.getDate();

    if (days < 0) {

        months -= 1;

        const previousMonth =
            new Date(
                now.getFullYear(),
                now.getMonth(),
                0
            );

        days +=
            previousMonth.getDate();

    }

    if (months < 0) {

        years -= 1;

        months += 12;

    }

    const parts = [];

    if (years > 0) {

        parts.push(
            `${years} year${years === 1 ? "" : "s"}`
        );

    }

    if (months > 0) {

        parts.push(
            `${months} month${months === 1 ? "" : "s"}`
        );

    }

    if (
        years === 0 &&
        months === 0
    ) {

        parts.push(
            `${days} day${days === 1 ? "" : "s"}`
        );

    }

    return parts.join(" ");

}


// ==========================================================
// PREPARE DAIRY RECORD
// ==========================================================

function prepareDairyRecord(record) {

    const dairy =
        plainDocument(record);

    if (!dairy) {

        return null;

    }

    const code =
        dairy.code === null ||
        dairy.code === undefined
            ? null
            : Number(dairy.code);

    if (
        code !== null &&
        Number.isFinite(code) &&
        code > 0
    ) {

        dairy.ageText =
            calculateAgeText(
                dairy.dateOfBirth
            );

    } else {

        dairy.ageText = "";

    }

    return dairy;

}


// ==========================================================
// GET ALL DAIRY FARMS
//
// Dairy Farm:
//
//     code < 0
//
// Returned as `structures` because the EJS expects that
// variable.
// ==========================================================

async function getDairyFarms() {

    const farms =
        await Dairy
            .find({
                code: {
                    $lt: 0
                }
            })
            .sort({
                name: 1,
                code: 1
            })
            .lean();

    return farms;

}


// ==========================================================
// GET ALL ASSIGNED ASSETS FOR A FARM
//
// Farm:
//
//     dairy.code < 0
//
// Asset:
//
//     assetCode === dairy.code
// ==========================================================

async function getAssetsForFarm(
    farmCode
) {

    const numericFarmCode =
        Number(farmCode);

    if (
        !Number.isFinite(
            numericFarmCode
        ) ||
        numericFarmCode >= 0
    ) {

        return [];

    }

    const assets =
        await Dairy
            .find({
                assetCode:
                    numericFarmCode,

                code: {
                    $ne:
                        numericFarmCode
                }
            })
            .sort({
                name: 1,
                code: 1
            })
            .lean();

    return assets.map(
        prepareDairyRecord
    );

}


// ==========================================================
// GET STANDALONE ASSETS
//
// Standalone:
//
//     assetCode === null
//
// AND:
//
//     code is not negative
//
// ==========================================================

async function getStandaloneAssets() {

    const assets =
        await Dairy
            .find({
                assetCode: null,

                code: {
                    $not: {
                        $lt: 0
                    }
                }
            })
            .sort({
                name: 1,
                code: 1
            })
            .lean();

    return assets.map(
        prepareDairyRecord
    );

}


// ==========================================================
// GET AVAILABLE USERS FOR ASSET ASSIGNMENT
//
// ONLY users whose role is NOT:
//
//     admin
//
// are returned.
//
// This means:
//
//     dairyWorker
//     poultryWorker
//
// are eligible.
//
// Admin users are deliberately excluded.
// ==========================================================

async function getAvailableAssetUsers() {

    const users =
        await User
            .find({
                role: {
                    $ne: "admin"
                }
            })
            .select(
                "_id name email phone role assignedAsset"
            )
            .sort({
                name: 1
            })
            .lean();

    return users.map(
        user => {

            const assignedAssets =
                Array.isArray(
                    user.assignedAsset
                )
                    ? user.assignedAsset
                    : [];

            return {

                _id:
                    user._id,

                name:
                    user.name || "",

                email:
                    user.email || "",

                phone:
                    user.phone || null,

                role:
                    user.role || "",

                assignedAsset:
                    assignedAssets

            };

        }
    );

}


// ==========================================================
// FIND CURRENT USER ASSIGNED TO ASSET
//
// Looks through assignedAsset arrays.
//
// This is intentionally performed against User rather than
// adding another ownership field to Dairy.
//
// ==========================================================

async function findUsersAssignedToAsset(
    assetId
) {

    const objectId =
        requireObjectId(
            assetId,
            "asset"
        );

    const users =
        await User
            .find({
                role: {
                    $ne: "admin"
                },

                assignedAsset:
                    objectId
            })
            .select(
                "_id name email phone role"
            )
            .lean();

    return users;

}


// ==========================================================
// CALCULATE TOTAL NET WORTH
// ==========================================================

async function calculateTotalNetWorth() {

    const result =
        await Dairy.aggregate([
            {
                $group: {

                    _id: null,

                    total: {

                        $sum: {

                            $ifNull: [
                                "$currentWorth",
                                0
                            ]

                        }

                    }

                }

            }
        ]);

    if (
        !Array.isArray(result) ||
        result.length === 0
    ) {

        return 0;

    }

    return numericValue(
        result[0].total
    );

}


// ==========================================================
// GET MAIN NET WORTH
// ==========================================================

async function getNetWorth() {

    const [
        structures,
        standaloneAssets,
        totalNetWorth
    ] = await Promise.all([

        getDairyFarms(),

        getStandaloneAssets(),

        calculateTotalNetWorth()

    ]);

    return {

        structures,

        standaloneAssets,

        totalNetWorth,

        netWorth:
            totalNetWorth

    };

}


// ==========================================================
// FIND DAIRY FARM BY ID
// ==========================================================

async function findDairyFarmById(id) {

    const objectId =
        requireObjectId(
            id,
            "Dairy Farm"
        );

    const dairy =
        await Dairy
            .findById(
                objectId
            )
            .lean();

    if (!dairy) {

        throw createError(
            "Dairy Farm not found.",
            404
        );

    }

    if (
        dairy.code === null ||
        dairy.code === undefined ||
        Number(dairy.code) >= 0
    ) {

        throw createError(
            "The selected record is not a Dairy Farm.",
            400
        );

    }

    return dairy;

}


// ==========================================================
// GET DAIRY FARM PAGE
// ==========================================================

async function getDairyFarm(id) {

    const dairy =
        await findDairyFarmById(
            id
        );

    const [
        assets,
        totalNetWorth
    ] = await Promise.all([

        getAssetsForFarm(
            dairy.code
        ),

        calculateTotalNetWorth()

    ]);

    const dairyTotal =
        assets.reduce(
            (
                total,
                asset
            ) =>
                total +
                numericValue(
                    asset.currentWorth
                ),
            0
        );

    return {

        dairy:
            prepareDairyRecord(
                dairy
            ),

        assets,

        dairyTotal,

        totalNetWorth,

        netWorth:
            totalNetWorth

    };

}


// ==========================================================
// GET STRUCTURE TYPES
// ==========================================================

async function getStructureTypes() {

    const records =
        await Dairy
            .find({

                code: null,

                type: {

                    $exists: true,

                    $nin: [
                        null,
                        ""
                    ]

                }

            })
            .select({
                type: 1
            })
            .lean();

    const types =
        records
            .map(
                record =>
                    normalizeText(
                        record.type
                    )
            )
            .filter(Boolean);

    return [
        ...new Set(types)
    ].sort(
        (a, b) =>
            a.localeCompare(b)
    );

}


// ==========================================================
// GET DAIRY BREEDS
// ==========================================================

async function getDairyBreeds() {

    const records =
        await Dairy
            .find({

                code: {
                    $gt: 0
                },

                type: {

                    $exists: true,

                    $nin: [
                        null,
                        ""
                    ]

                }

            })
            .select({
                type: 1
            })
            .lean();

    const breeds =
        records
            .map(
                record =>
                    normalizeText(
                        record.type
                    )
            )
            .filter(Boolean);

    return [
        ...new Set(breeds)
    ].sort(
        (a, b) =>
            a.localeCompare(b)
    );

}


// ==========================================================
// GET ADD ASSET PAGE
// ==========================================================

async function getAddAsset(
    dairyFarmId
) {

    const parentFarm =
        await findDairyFarmById(
            dairyFarmId
        );

    const [
        structures,
        dairyBreeds,
        structureTypes
    ] = await Promise.all([

        getDairyFarms(),

        getDairyBreeds(),

        getStructureTypes()

    ]);

    return {

        dairy:
            prepareDairyRecord(
                parentFarm
            ),

        parentFarm:
            prepareDairyRecord(
                parentFarm
            ),

        structures,

        dairyBreeds,

        structureTypes,

        assetTypes: [
            ...ASSET_TYPES
        ]

    };

}


// ==========================================================
// BUILD CREATE DATA
// ==========================================================

function buildCreateData(data) {

    const source =
        data &&
        typeof data === "object"
            ? data
            : {};

    const result = {};

    const allowedFields = [

        "name",

        "type",

        "buyingPrice",

        "currentWorth",

        "description",

        "condition",

        "location",

        "status",

        "valuationDate",

        "acquisitionDate",

        "dateOfBirth",

        "mass",

        "isMilking",

        "about",

        "mission",

        "refNo",

        "vision",

        "profileImage"

    ];

    allowedFields.forEach(
        field => {

            if (
                Object.prototype.hasOwnProperty.call(
                    source,
                    field
                )
            ) {

                result[field] =
                    source[field];

            }

        }
    );


    [
        "name",
        "type",
        "description",
        "condition",
        "location",
        "status",
        "about",
        "mission",
        "refNo",
        "vision",
        "profileImage"
    ].forEach(
        field => {

            if (
                Object.prototype.hasOwnProperty.call(
                    result,
                    field
                )
            ) {

                result[field] =
                    normalizeText(
                        result[field]
                    );

            }

        }
    );


    [
        "buyingPrice",
        "currentWorth",
        "mass"
    ].forEach(
        field => {

            if (
                Object.prototype.hasOwnProperty.call(
                    result,
                    field
                )
            ) {

                result[field] =
                    normalizeNumber(
                        result[field]
                    );

            }

        }
    );


    if (
        Object.prototype.hasOwnProperty.call(
            result,
            "isMilking"
        )
    ) {

        result.isMilking =
            normalizeBoolean(
                result.isMilking
            );

    }


    [
        "valuationDate",
        "acquisitionDate",
        "dateOfBirth"
    ].forEach(
        field => {

            if (
                Object.prototype.hasOwnProperty.call(
                    result,
                    field
                )
            ) {

                result[field] =
                    normalizeDate(
                        result[field]
                    );

            }

        }
    );


    if (
        !result.status ||
        !STATUS_VALUES.includes(
            result.status
        )
    ) {

        result.status =
            "active";

    }


    if (
        result.buyingPrice === undefined
    ) {

        result.buyingPrice = 0;

    }


    if (
        result.currentWorth === undefined
    ) {

        result.currentWorth = 0;

    }


    return result;

}


// ==========================================================
// ADD ASSET
//
// SYSTEM CONTROLLED:
//
//     code = null
//
//     assetCode = parent farm code
//
// ==========================================================

async function addAsset(
    dairyFarmId,
    data,
    file = null
) {

    const parentFarm =
        await findDairyFarmById(
            dairyFarmId
        );

    const createData =
        buildCreateData(
            data
        );


    if (!createData.name) {

        throw createError(
            "Asset name is required.",
            400
        );

    }


    if (
        createData.currentWorth < 0
    ) {

        throw createError(
            "Current worth cannot be negative.",
            400
        );

    }


    if (
        createData.buyingPrice < 0
    ) {

        throw createError(
            "Buying price cannot be negative.",
            400
        );

    }


    if (
        file &&
        file.filename &&
        !createData.profileImage
    ) {

        createData.profileImage =
            `/uploads/${file.filename}`;

    }


    createData.code = null;

    createData.assetCode =
        Number(parentFarm.code);


    const asset =
        await Dairy.create(
            createData
        );

    return prepareDairyRecord(
        asset
    );

}


// ==========================================================
// GET INDIVIDUAL ASSET
//
// IMPORTANT:
//
// This now additionally supplies:
//
//     availableUsers
//
// and:
//
//     assignedUsers
//
// to the EJS.
//
// availableUsers contains ONLY users whose role is not admin.
// ==========================================================

async function getAsset(id) {

    const objectId =
        requireObjectId(
            id,
            "asset"
        );

    const dairy =
        await Dairy
            .findById(
                objectId
            )
            .lean();

    if (!dairy) {

        throw createError(
            "Asset not found.",
            404
        );

    }


    const [
        structures,
        dairyBreeds,
        structureTypes,
        availableUsers,
        assignedUsers
    ] = await Promise.all([

        getDairyFarms(),

        getDairyBreeds(),

        getStructureTypes(),

        getAvailableAssetUsers(),

        findUsersAssignedToAsset(
            objectId
        )

    ]);


    return {

        dairy:
            prepareDairyRecord(
                dairy
            ),

        structures,

        dairyBreeds,

        structureTypes,

        // --------------------------------------------------
        // USERS AVAILABLE FOR ASSIGNMENT
        // --------------------------------------------------

        availableUsers,

        // --------------------------------------------------
        // USERS CURRENTLY ASSIGNED TO THIS ASSET
        // --------------------------------------------------

        assignedUsers,

        // --------------------------------------------------
        // CONVENIENT SINGLE USER VALUE
        //
        // Normally there should be one assignee.
        // The array is still retained above so existing
        // inconsistent data does not disappear.
        // --------------------------------------------------

        assignedUser:
            assignedUsers.length > 0
                ? assignedUsers[0]
                : null,

        assignedUserId:
            assignedUsers.length > 0
                ? String(
                    assignedUsers[0]._id
                )
                : ""

    };

}


// ==========================================================
// NORMALIZE ASSIGNED USER ID
//
// Accepted service input:
//
//     assignedUserId
//
// For compatibility, the service also recognizes:
//
//     assignedUser
//     userId
//
// Empty value means:
//
//     remove assignment
//
// ==========================================================

function normalizeAssignedUserId(
    data
) {

    if (
        !data ||
        typeof data !== "object"
    ) {

        return null;

    }


    let value;


    if (
        Object.prototype.hasOwnProperty.call(
            data,
            "assignedUserId"
        )
    ) {

        value =
            data.assignedUserId;

    } else if (
        Object.prototype.hasOwnProperty.call(
            data,
            "assignedUser"
        )
    ) {

        value =
            data.assignedUser;

    } else if (
        Object.prototype.hasOwnProperty.call(
            data,
            "userId"
        )
    ) {

        value =
            data.userId;

    } else {

        // --------------------------------------------------
        // Assignment was not part of this update.
        //
        // `undefined` tells updateAsset not to change
        // assignments.
        // --------------------------------------------------

        return undefined;

    }


    if (
        value === undefined ||
        value === null ||
        String(value).trim() === ""
    ) {

        return null;

    }


    const normalized =
        String(value).trim();

    if (
        !isValidObjectId(
            normalized
        )
    ) {

        throw createError(
            "Invalid assigned user ID.",
            400
        );

    }

    return new mongoose.Types.ObjectId(
        normalized
    );

}


// ==========================================================
// VALIDATE ASSIGNMENT USER
//
// User MUST:
//
//     exist
//
// AND:
//
//     role !== "admin"
//
// ==========================================================

async function validateAssignmentUser(
    userId
) {

    if (!userId) {

        return null;

    }

    const user =
        await User
            .findOne({
                _id: userId,

                role: {
                    $ne: "admin"
                }
            })
            .select(
                "_id name email phone role"
            );

    if (!user) {

        throw createError(
            "The selected user does not exist or is an admin.",
            400
        );

    }

    return user;

}


// ==========================================================
// ASSIGN ASSET TO USER
//
// THIS IS THE CORE ASSIGNMENT LOGIC.
//
// Given:
//
//     assetId
//
//     userId
//
// The service:
//
// 1. Removes the asset from every non-admin user.
// 2. Adds the asset to the selected user.
// 3. Does not modify Dairy.code.
// 4. Does not modify Dairy.assetCode.
//
// If userId === null:
//
//     the asset becomes unassigned.
//
// ==========================================================

async function assignAssetToUser(
    assetId,
    userId
) {

    const assetObjectId =
        requireObjectId(
            assetId,
            "asset"
        );


    // ------------------------------------------------------
    // MAKE SURE THE DAIRY RECORD EXISTS
    // ------------------------------------------------------

    const asset =
        await Dairy
            .findById(
                assetObjectId
            )
            .select(
                "_id name code assetCode"
            )
            .lean();

    if (!asset) {

        throw createError(
            "Asset not found.",
            404
        );

    }


    // ------------------------------------------------------
    // THE ASSIGNMENT TARGET MUST BE A USER.
    //
    // Admin users are rejected by validateAssignmentUser.
    // ------------------------------------------------------

    const selectedUser =
        await validateAssignmentUser(
            userId
        );


    // ------------------------------------------------------
    // REMOVE THIS ASSET FROM ALL NON-ADMIN USERS
    //
    // This prevents the same standalone asset from remaining
    // assigned to multiple users after reassignment.
    //
    // $pull removes the Dairy _id from assignedAsset.
    // ------------------------------------------------------

    await User.updateMany(

        {
            role: {
                $ne: "admin"
            },

            assignedAsset:
                assetObjectId
        },

        {
            $pull: {
                assignedAsset:
                    assetObjectId
            }
        }

    );


    // ------------------------------------------------------
    // NO USER SELECTED
    //
    // The asset is now unassigned.
    // ------------------------------------------------------

    if (!selectedUser) {

        return {

            assetId:
                assetObjectId,

            assignedUser:
                null,

            assignedUserId:
                null

        };

    }


    // ------------------------------------------------------
    // ADD ASSET TO SELECTED USER
    //
    // $addToSet prevents duplicate Dairy IDs.
    // ------------------------------------------------------

    await User.updateOne(

        {
            _id:
                selectedUser._id,

            role: {
                $ne: "admin"
            }
        },

        {
            $addToSet: {

                assignedAsset:
                    assetObjectId

            }
        }

    );


    return {

        assetId:
            assetObjectId,

        assignedUser:
            plainDocument(
                selectedUser
            ),

        assignedUserId:
            selectedUser._id

    };

}


// ==========================================================
// BUILD UPDATE DATA
//
// IMPORTANT:
//
// Assignment is deliberately handled separately from the
// Dairy update.
//
// It is NOT written into the Dairy document.
//
// Instead:
//
//     assignedUserId
//
// is extracted and applied to:
//
//     User.assignedAsset
//
// ==========================================================

function buildUpdateData(data) {

    const source =
        data &&
        typeof data === "object"
            ? data
            : {};

    const update = {};

    const allowedFields = [

        "name",

        "type",

        "dateOfBirth",

        "mass",

        "isMilking",

        "description",

        "condition",

        "location",

        "status",

        "buyingPrice",

        "currentWorth",

        "valuationDate",

        "about",

        "mission",

        "refNo",

        "vision",

        "profileImage"

    ];


    allowedFields.forEach(
        field => {

            if (
                Object.prototype.hasOwnProperty.call(
                    source,
                    field
                )
            ) {

                update[field] =
                    source[field];

            }

        }
    );


    [
        "name",
        "type",
        "description",
        "condition",
        "location",
        "status",
        "about",
        "mission",
        "refNo",
        "vision",
        "profileImage"
    ].forEach(
        field => {

            if (
                Object.prototype.hasOwnProperty.call(
                    update,
                    field
                )
            ) {

                update[field] =
                    normalizeText(
                        update[field]
                    );

            }

        }
    );


    [
        "mass",
        "buyingPrice",
        "currentWorth"
    ].forEach(
        field => {

            if (
                Object.prototype.hasOwnProperty.call(
                    update,
                    field
                )
            ) {

                update[field] =
                    normalizeNumber(
                        update[field]
                    );

            }

        }
    );


    if (
        Object.prototype.hasOwnProperty.call(
            update,
            "isMilking"
        )
    ) {

        update.isMilking =
            normalizeBoolean(
                update.isMilking
            );

    }


    [
        "dateOfBirth",
        "valuationDate"
    ].forEach(
        field => {

            if (
                Object.prototype.hasOwnProperty.call(
                    update,
                    field
                )
            ) {

                update[field] =
                    normalizeDate(
                        update[field]
                    );

            }

        }
    );


    if (
        update.status !== undefined &&
        !STATUS_VALUES.includes(
            update.status
        )
    ) {

        update.status =
            "active";

    }


    if (
        update.buyingPrice !== undefined &&
        update.buyingPrice < 0
    ) {

        throw createError(
            "Buying price cannot be negative.",
            400
        );

    }


    if (
        update.currentWorth !== undefined &&
        update.currentWorth < 0
    ) {

        throw createError(
            "Current worth cannot be negative.",
            400
        );

    }


    return update;

}


// ==========================================================
// UPDATE ASSET
//
// This function now handles:
//
//     1. Normal Dairy updates
//
//     2. Standalone asset assignment
//
// Assignment is only processed when the request actually
// contains:
//
//     assignedUserId
//
// Therefore ordinary asset edits that do not contain the
// assignment field will not change existing assignments.
// ==========================================================

async function updateAsset(
    id,
    data
) {

    const objectId =
        requireObjectId(
            id,
            "asset"
        );


    // ======================================================
    // LOAD EXISTING ASSET
    // ======================================================

    const existing =
        await Dairy
            .findById(
                objectId
            );


    if (!existing) {

        throw createError(
            "Asset not found.",
            404
        );

    }


    // ======================================================
    // EXTRACT ASSIGNMENT
    // ======================================================
    //
    // undefined:
    //     assignment field was not submitted.
    //
    // null:
    //     explicitly unassign.
    //
    // ObjectId:
    //     assign to selected user.
    //

    const assignedUserId =
        normalizeAssignedUserId(
            data
        );


    // ======================================================
    // BUILD NORMAL DAIRY UPDATE
    // ======================================================

    const update =
        buildUpdateData(
            data
        );


    // ======================================================
    // STRUCTURE / FACILITY FIELDS
    //
    // about
    // mission
    // refNo
    // vision
    //
    // are already retained by buildUpdateData().
    // ======================================================


    // ======================================================
    // ANIMAL RULE
    // ======================================================

    const existingCode =
        existing.code === null ||
        existing.code === undefined
            ? null
            : Number(existing.code);


    if (
        existingCode === null ||
        !Number.isFinite(
            existingCode
        ) ||
        existingCode <= 0
    ) {

        if (
            Object.prototype.hasOwnProperty.call(
                update,
                "isMilking"
            )
        ) {

            update.isMilking =
                false;

        }

    }


    // ======================================================
    // SAVE DAIRY UPDATE
    // ======================================================

    Object.keys(update).forEach(
        field => {

            existing[field] =
                update[field];

        }
    );


    await existing.save();


    // ======================================================
    // UPDATE USER ASSIGNMENT
    // ======================================================
    //
    // IMPORTANT:
    //
    // This happens AFTER the Dairy record has successfully
    // saved.
    //
    // The Dairy document itself does NOT receive an
    // assignedUserId field.
    //
    // Instead:
    //
    //     User.assignedAsset
    //
    // is updated.
    // ======================================================

    let assignment = null;

    if (
        assignedUserId !== undefined
    ) {

        assignment =
            await assignAssetToUser(
                objectId,
                assignedUserId
            );

    }


    // ======================================================
    // RETURN UPDATED ASSET
    // ======================================================

    const prepared =
        prepareDairyRecord(
            existing
        );


    // ======================================================
    // INCLUDE ASSIGNMENT INFORMATION
    // ======================================================

    if (assignment) {

        prepared.assignedUser =
            assignment.assignedUser;

        prepared.assignedUserId =
            assignment.assignedUserId;

    }


    return prepared;

}


// ==========================================================
// GET NET WORTH DATA
// ==========================================================

async function getNetWorthData() {

    return getNetWorth();

}


// ==========================================================
// GET DAIRY FARM DATA
// ==========================================================

async function getDairyFarmData(id) {

    return getDairyFarm(id);

}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    getNetWorth,

    getDairyFarm,

    getAddAsset,

    addAsset,

    getAsset,

    updateAsset,

    getNetWorthData,

    getDairyFarmData

};