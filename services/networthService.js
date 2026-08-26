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
// RECORD CLASSIFICATION
// ----------------------------------------------------------
//
//     code < 0
//         = Dairy Farm / parent structure
//
//     code > 0
//         = identified Dairy asset / animal
//
//     code === null
//         = manual / standalone asset
//
// ASSET RELATIONSHIP
// ----------------------------------------------------------
//
//     assetCode === parentFarm.code
//
// identifies an asset belonging to a Dairy Farm.
//
// A TRUE STANDALONE ASSET:
//
//     code === null
//     assetCode === null
//
// USER ASSIGNMENT
// ----------------------------------------------------------
//
//     User.assignedAsset
//
// stores Dairy document _ids.
//
// Only non-admin users may receive assignments.
//
// IMPORTANT
// ----------------------------------------------------------
//
// This service NEVER accepts or changes:
//
//     _id
//     code
//     assetCode
//     __v
//     createdAt
//     updatedAt
//
// Assignment is stored ONLY on User.assignedAsset.
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
// Types exposed by the Net Worth Add Asset view.
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
// ERROR HELPER
// ==========================================================

function createError(
    message,
    statusCode = 500
) {

    const error = new Error(message);

    error.statusCode = statusCode;

    return error;

}


// ==========================================================
// OBJECT ID HELPERS
// ==========================================================

function isValidObjectId(id) {

    return mongoose.Types.ObjectId.isValid(id);

}


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
// DOCUMENT HELPERS
// ==========================================================

function plainDocument(document) {

    if (!document) {

        return null;

    }

    if (
        typeof document.toObject === "function"
    ) {

        return document.toObject();

    }

    return document;

}


// ==========================================================
// NUMBER HELPERS
// ==========================================================

function numericValue(value) {

    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : 0;

}


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

    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : fallback;

}


// ==========================================================
// BOOLEAN
// ==========================================================

function normalizeBoolean(value) {

    if (
        typeof value === "boolean"
    ) {

        return value;

    }

    if (
        value === undefined ||
        value === null
    ) {

        return false;

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
// TEXT
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
// DATE
// ==========================================================

function normalizeDate(value) {

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {

        return null;

    }

    const date = new Date(value);

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
// AGE
// ==========================================================

function calculateAgeText(
    dateOfBirth
) {

    if (!dateOfBirth) {

        return "";

    }

    const dob = new Date(dateOfBirth);

    if (
        Number.isNaN(
            dob.getTime()
        )
    ) {

        return "";

    }

    const now = new Date();

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
// GET DAIRY FARMS
// ==========================================================
//
// A Dairy Farm is identified exclusively by:
//
//     code < 0
//
// MongoDB _id remains the URL identity.
//
// ==========================================================

async function getDairyFarms() {

    return Dairy
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

}


// ==========================================================
// GET ASSETS BELONGING TO FARM
// ==========================================================
//
// Parent:
//
//     farm.code < 0
//
// Child:
//
//     assetCode === farm.code
//
// The farm itself is excluded.
//
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
// GET TRUE STANDALONE ASSETS
// ==========================================================
//
// A standalone asset MUST have:
//
//     code === null
//     assetCode === null
//
// Do not classify records with an assetCode as standalone.
//
// ==========================================================

async function getStandaloneAssets() {

    const assets =
        await Dairy
            .find({

                code: null,

                assetCode: null

            })
            .sort({
                name: 1,
                _id: 1
            })
            .lean();

    return assets.map(
        prepareDairyRecord
    );

}


// ==========================================================
// GET AVAILABLE ASSIGNMENT USERS
// ==========================================================
//
// Only non-admin users are eligible.
//
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
                name: 1,
                email: 1
            })
            .lean();

    return users.map(
        user => {

            const assignedAsset =
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

                assignedAsset

            };

        }
    );

}


// ==========================================================
// FIND USERS ASSIGNED TO ASSET
// ==========================================================

async function findUsersAssignedToAsset(
    assetId
) {

    const objectId =
        requireObjectId(
            assetId,
            "asset"
        );

    return User
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
        .sort({
            name: 1
        })
        .lean();

}


// ==========================================================
// TOTAL NET WORTH
// ==========================================================
//
// Net Worth is explicitly:
//
//     SUM(currentWorth)
//
// across all Dairy records.
//
// No classification is applied here because the requested
// Net Worth total is the sum of all currentWorth values.
//
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
        !result.length
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
//
// The URL uses MongoDB _id.
//
// The negative code only determines whether the record is a
// Dairy Farm.
//
// ==========================================================

async function findDairyFarmById(
    id
) {

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

    const code =
        Number(dairy.code);

    if (
        !Number.isFinite(code) ||
        code >= 0
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

async function getDairyFarm(
    id
) {

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
//
// Structure/facility records are records with code === null.
//
// Their `type` values can be used by the view as existing
// structure types.
//
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
// GET DAIRY TYPES / BREEDS
// ==========================================================
//
// Positive code records represent identified Dairy
// animals/assets. Their type values are supplied to the
// add form as existing Dairy types/breeds.
//
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

        assetTypes:
            [...ASSET_TYPES]

    };

}


// ==========================================================
// BUILD CREATE DATA
// ==========================================================
//
// Only fields that the add form is allowed to submit are
// copied.
//
// code and assetCode are deliberately absent.
//
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


    const textFields = [

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

    ];

    textFields.forEach(
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


    const numberFields = [

        "buyingPrice",
        "currentWorth",
        "mass"

    ];

    numberFields.forEach(
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


    const dateFields = [

        "valuationDate",
        "acquisitionDate",
        "dateOfBirth"

    ];

    dateFields.forEach(
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

        result.status = "active";

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
// ==========================================================
//
// IMPORTANT:
//
// Assets created from:
//
//     /networth/structure/:id/add
//
// belong to the selected Dairy Farm.
//
// Therefore:
//
//     code
//         remains system controlled.
//
//     assetCode
//         is set to the parent farm's negative code.
//
// The asset is NOT a standalone asset.
//
// A standalone asset has:
//
//     code === null
//     assetCode === null
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


    // ------------------------------------------------------
    // SYSTEM CONTROLLED RELATIONSHIP
    // ------------------------------------------------------
    //
    // This asset belongs to the parent farm.
    //
    // The parent farm code is authoritative.
    //
    // Do NOT accept these values from the browser.
    //
    createData.assetCode =
        Number(parentFarm.code);


    // ------------------------------------------------------
    // CODE IS LEFT UNSET.
    //
    // The Dairy model/default/application logic is responsible
    // for determining the correct code for a newly-created
    // asset.
    //
    // This service must not invent a positive animal code.
    //
    // ------------------------------------------------------

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
// ==========================================================

async function getAsset(
    id
) {

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

        availableUsers,

        assignedUsers,

        assignedUser:
            assignedUsers.length
                ? assignedUsers[0]
                : null,

        assignedUserId:
            assignedUsers.length
                ? String(
                    assignedUsers[0]._id
                )
                : ""

    };

}


// ==========================================================
// NORMALIZE ASSIGNED USER ID
// ==========================================================
//
// undefined
//     = assignment was not submitted
//
// null
//     = explicitly remove assignment
//
// ObjectId
//     = assign to selected user
//
// Compatibility aliases:
//
//     assignedUser
//     userId
//
// ==========================================================

function normalizeAssignedUserId(
    data
) {

    if (
        !data ||
        typeof data !== "object"
    ) {

        return undefined;

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

                _id:
                    userId,

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
// ==========================================================
//
// Only TRUE standalone assets can be assigned:
//
//     code === null
//     assetCode === null
//
// This prevents a farm-owned asset from accidentally being
// treated as an independent standalone asset.
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
    // Assignment is only for standalone assets.
    // ------------------------------------------------------

    const isStandalone =
        (
            asset.code === null ||
            asset.code === undefined
        ) &&
        (
            asset.assetCode === null ||
            asset.assetCode === undefined
        );


    if (!isStandalone) {

        throw createError(
            "Only standalone assets can be assigned to a project user.",
            400
        );

    }


    const selectedUser =
        await validateAssignmentUser(
            userId
        );


    // ------------------------------------------------------
    // First remove this asset from every non-admin user.
    //
    // This guarantees one standalone asset cannot remain
    // assigned to multiple users.
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
    // Explicit unassignment.
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
    // Assign to selected non-admin user.
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
// ==========================================================
//
// Assignment is NOT included here.
//
// assignedUserId belongs to User.assignedAsset and must never
// be written into Dairy.
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


    const textFields = [

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

    ];

    textFields.forEach(
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


    const numberFields = [

        "mass",
        "buyingPrice",
        "currentWorth"

    ];

    numberFields.forEach(
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


    const dateFields = [

        "dateOfBirth",
        "valuationDate"

    ];

    dateFields.forEach(
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

        throw createError(
            "Invalid asset status.",
            400
        );

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
// ==========================================================
//
// Handles:
//
//     1. Ordinary Dairy field updates
//     2. Standalone-user assignment
//
// Never modifies:
//
//     code
//     assetCode
//
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


    // ------------------------------------------------------
    // Determine whether assignment was actually submitted.
    // ------------------------------------------------------

    const assignedUserId =
        normalizeAssignedUserId(
            data
        );


    // ------------------------------------------------------
    // Build safe Dairy update.
    // ------------------------------------------------------

    const update =
        buildUpdateData(
            data
        );


    // ------------------------------------------------------
    // Animal-specific rule.
    //
    // Only positive-code records can be milking animals.
    //
    // Structures/manual assets cannot become milking animals
    // through this editor.
    // ------------------------------------------------------

    const existingCode =
        existing.code === null ||
        existing.code === undefined
            ? null
            : Number(existing.code);

    if (
        existingCode === null ||
        !Number.isFinite(existingCode) ||
        existingCode <= 0
    ) {

        if (
            Object.prototype.hasOwnProperty.call(
                update,
                "isMilking"
            )
        ) {

            update.isMilking = false;

        }

    }


    // ------------------------------------------------------
    // Apply only whitelisted fields.
    // ------------------------------------------------------

    Object.keys(update).forEach(
        field => {

            existing[field] =
                update[field];

        }
    );


    await existing.save();


    // ------------------------------------------------------
    // Assignment is deliberately separate from Dairy update.
    // ------------------------------------------------------

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


    // ------------------------------------------------------
    // Prepare response.
    // ------------------------------------------------------

    const prepared =
        prepareDairyRecord(
            existing
        );


    if (assignment) {

        prepared.assignedUser =
            assignment.assignedUser;

        prepared.assignedUserId =
            assignment.assignedUserId;

    }


    return prepared;

}


// ==========================================================
// JSON DATA HELPERS
// ==========================================================

async function getNetWorthData() {

    return getNetWorth();

}


async function getDairyFarmData(
    id
) {

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