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
//     assetCode === Dairy Farm.code
//         = asset belongs to that Dairy Farm
//
//     assetCode === null
//         = standalone asset
//
// VALUE
// ----------------------------------------------------------
//
//     currentWorth
//         = authoritative Net Worth value
//
// IMPORTANT
// ----------------------------------------------------------
//
// The browser never controls:
//
//     code
//     assetCode
//
// The service derives those values where necessary.
//
// ==========================================================

"use strict";

const mongoose = require("mongoose");

const Dairy = require("../models/dairy");


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

function createError(message, statusCode = 500) {
    const error = new Error(message);

    error.statusCode = statusCode;

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

function requireObjectId(id, label = "record") {
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
//
// Using lean() already gives plain objects.
//
// This helper is retained so all returned records have a
// predictable shape.
// ==========================================================

function plainDocument(document) {
    if (!document) {
        return null;
    }

    if (typeof document.toObject === "function") {
        return document.toObject();
    }

    return document;
}


// ==========================================================
// NUMERIC VALUE
// ==========================================================

function numericValue(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return 0;
    }

    return number;
}


// ==========================================================
// NORMALIZE NUMBER
// ==========================================================

function normalizeNumber(value, fallback = 0) {
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
// NORMALIZE BOOLEAN
// ==========================================================

function normalizeBoolean(value) {
    if (
        value === undefined ||
        value === null
    ) {
        return false;
    }

    if (typeof value === "boolean") {
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

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date;
}


// ==========================================================
// AGE TEXT
//
// The EJS expects:
//
//     dairy.ageText
//
// This is calculated for animal records.
// ==========================================================

function calculateAgeText(dateOfBirth) {
    if (!dateOfBirth) {
        return "";
    }

    const dob = new Date(dateOfBirth);

    if (Number.isNaN(dob.getTime())) {
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

        days += previousMonth.getDate();
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
// ADD AGE TEXT TO DOCUMENT
// ==========================================================

function prepareDairyRecord(record) {
    const dairy = plainDocument(record);

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
// Returned as `structures` because the EJS deliberately
// expects that variable.
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
//
// The farm itself is excluded because the farm's assetCode
// is normally null.
// ==========================================================

async function getAssetsForFarm(farmCode) {
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
// Source EJS contract:
//
//     assetCode === null
//
// Dairy Farms are excluded because they have:
//
//     code < 0
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
// GET TOTAL NET WORTH
//
// Uses:
//
//     currentWorth
//
// The service sums all Dairy records.
//
// This keeps currentWorth as the single financial value
// used by the Net Worth system.
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
//
// Controller:
//
//     networthService.getNetWorth()
//
// EJS requires:
//
//     structures
//     standaloneAssets
//
// Additional values are supplied for API consumers.
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
//
// Controller:
//
//     getDairyFarm(req.params.id)
//
// EJS requires:
//
//     dairy
//     assets
//     dairyTotal
//
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
//
// The EJS expects:
//
//     structureTypes
//
// The source material does not define a separate authoritative
// constant list for structure types.
//
// Therefore the service derives the list from existing
// structure records' `type` values.
//
// This avoids inventing database values that are not present.
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
//
// The EJS expects:
//
//     dairyBreeds
//
// Animal records are identified by:
//
//     code > 0
//
// Their `type` field is used by the view as the breed.
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
//
// Controller:
//
//     getAddAsset(req.params.id)
//
// EJS expects:
//
//     dairy
//
// The EJS itself supplies the assetTypes list.
//
// The service additionally supplies structureTypes and
// dairyBreeds so the data contract remains consistent.
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
//
// This is deliberately restrictive.
//
// Browser-controlled protected fields:
//
//     _id
//     code
//     assetCode
//     __v
//     createdAt
//     updatedAt
//
// are ignored.
//
// ==========================================================

function buildCreateData(
    data
) {
    const source =
        data && typeof data === "object"
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

    // ------------------------------------------------------
    // TEXT
    // ------------------------------------------------------

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


    // ------------------------------------------------------
    // NUMBERS
    // ------------------------------------------------------

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


    // ------------------------------------------------------
    // BOOLEAN
    // ------------------------------------------------------

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


    // ------------------------------------------------------
    // DATES
    // ------------------------------------------------------

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


    // ------------------------------------------------------
    // DEFAULT STATUS
    // ------------------------------------------------------

    if (
        !result.status ||
        !STATUS_VALUES.includes(
            result.status
        )
    ) {
        result.status = "active";
    }


    // ------------------------------------------------------
    // DEFAULT VALUES
    // ------------------------------------------------------

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
// Controller:
//
//     addAsset(
//         dairyFarmId,
//         body,
//         req.file
//     )
//
// SYSTEM CONTROLLED:
//
//     code
//     assetCode
//
// For this Add Asset page:
//
//     code = null
//
//     assetCode = parent Dairy Farm code
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


    // ------------------------------------------------------
    // NAME
    // ------------------------------------------------------

    if (!createData.name) {
        throw createError(
            "Asset name is required.",
            400
        );
    }


    // ------------------------------------------------------
    // CURRENT WORTH
    // ------------------------------------------------------

    if (
        createData.currentWorth < 0
    ) {
        throw createError(
            "Current worth cannot be negative.",
            400
        );
    }


    // ------------------------------------------------------
    // BUYING PRICE
    // ------------------------------------------------------

    if (
        createData.buyingPrice < 0
    ) {
        throw createError(
            "Buying price cannot be negative.",
            400
        );
    }


    // ------------------------------------------------------
    // PROFILE IMAGE
    //
    // The controller normally supplies the browser URL in
    // body.profileImage.
    //
    // The file argument is accepted for compatibility.
    // ------------------------------------------------------

    if (
        file &&
        file.filename &&
        !createData.profileImage
    ) {
        createData.profileImage =
            `/uploads/${file.filename}`;
    }


    // ------------------------------------------------------
    // SYSTEM CONTROLLED IDENTITY
    // ------------------------------------------------------

    createData.code = null;

    createData.assetCode =
        Number(parentFarm.code);


    // ------------------------------------------------------
    // CREATE
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
//
// Controller:
//
//     getAsset(req.params.id)
//
// EJS expects:
//
//     dairy
//     structures
//     dairyBreeds
//     structureTypes
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
        structureTypes
    ] = await Promise.all([
        getDairyFarms(),
        getDairyBreeds(),
        getStructureTypes()
    ]);

    return {
        dairy:
            prepareDairyRecord(
                dairy
            ),

        structures,

        dairyBreeds,

        structureTypes
    };
}


// ==========================================================
// BUILD UPDATE DATA
//
// Only fields represented by the supplied EJS/controller are
// accepted.
//
// Protected fields are deliberately excluded.
//
// ==========================================================

function buildUpdateData(
    data
) {
    const source =
        data && typeof data === "object"
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


    // ------------------------------------------------------
    // TEXT
    // ------------------------------------------------------

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


    // ------------------------------------------------------
    // NUMBERS
    // ------------------------------------------------------

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


    // ------------------------------------------------------
    // BOOLEAN
    // ------------------------------------------------------

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


    // ------------------------------------------------------
    // DATES
    // ------------------------------------------------------

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


    // ------------------------------------------------------
    // STATUS
    // ------------------------------------------------------

    if (
        update.status !== undefined &&
        !STATUS_VALUES.includes(
            update.status
        )
    ) {
        update.status = "active";
    }


    // ------------------------------------------------------
    // FINANCIAL VALIDATION
    // ------------------------------------------------------

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
// Controller:
//
//     updateAsset(
//         id,
//         updateData
//     )
//
// Protected:
//
//     code
//     assetCode
//
// are NEVER modified here.
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


    const update =
        buildUpdateData(
            data
        );


    // ------------------------------------------------------
    // STRUCTURE-SPECIFIC FIELDS
    //
    // The controller explicitly preserves:
    //
    //     about
    //     mission
    //     refNo
    //     vision
    //
    // The service allows them through.
    // ------------------------------------------------------


    // ------------------------------------------------------
    // ANIMAL RULE
    //
    // A structure cannot be treated as a milking animal.
    //
    // Existing animal status remains controlled by its code.
    // ------------------------------------------------------

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
            update.isMilking = false;
        }
    }


    // ------------------------------------------------------
    // SAVE
    // ------------------------------------------------------

    Object.keys(update).forEach(
        field => {
            existing[field] =
                update[field];
        }
    );


    await existing.save();


    return prepareDairyRecord(
        existing
    );
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

    getNetWorthData:
        getNetWorth,

    getDairyFarmData:
        getDairyFarm
};