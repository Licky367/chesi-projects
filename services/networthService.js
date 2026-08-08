const mongoose = require("mongoose");

const NetWorth = require("../models/netWorth");

const Dairy = require("../models/dairy");

/* =========================================================
HELPERS
========================================================= */

function toNumber(value, defaultValue = 0) {

const number = Number(value);

return Number.isFinite(number)
    ? number
    : defaultValue;

}

function isValidObjectId(id) {

return mongoose.Types.ObjectId.isValid(id);

}

/* =========================================================
DAIRY ASSET TYPE
========================================================= */

function getDairyAssetType(code) {

const numericCode =
    Number(code);

if (numericCode > 0) {

    return "cow";

}

if (numericCode < 0) {

    return "dairy Facility";

}

return "dairy";

}

/* =========================================================
VALID NET WORTH STATUS
========================================================= */

const ALLOWED_STATUSES = [

"active",

"sold",

"disposed",

"inactive"

];

/* =========================================================
SYNCHRONIZE DAIRY ASSETS

SOURCE OF TRUTH:

Dairy owns:
- name
- code
- assetCode
- Dairy identity

NetWorth owns:
- buyingPrice
- currentWorth
- description
- condition
- location
- valuationDate
- status
- financial information

This function creates missing NetWorth representations
and synchronizes Dairy identity/relationship fields.

It NEVER copies NetWorth financial fields from Dairy.
========================================================= */

async function syncDairyAssets() {

const dairyRecords =
    await Dairy.find({}).lean();


const structures =
    dairyRecords.filter(

        dairy =>
            Number(dairy.code) < 0

    );


const cows =
    dairyRecords.filter(

        dairy =>
            Number(dairy.code) > 0

    );


/* =====================================================
   STRUCTURE MAP
===================================================== */

const structureMap =
    new Map();


/* =====================================================
   SYNCHRONIZE STRUCTURES
===================================================== */

for (const dairy of structures) {

    const type =
        getDairyAssetType(
            dairy.code
        );


    let asset =
        await NetWorth.findOne({

            source: "dairy",

            sourceId: dairy._id

        });


    /* -------------------------------------------------
       CREATE MISSING STRUCTURE ASSET
    ------------------------------------------------- */

    if (!asset) {

        asset =
            await NetWorth.create({

                item:
                    dairy.name,

                type,

                buyingPrice: 0,

                currentWorth: 0,

                description: "",

                condition: "",

                location: "",

                acquisitionDate:
                    dairy.createdAt ||
                    new Date(),

                valuationDate: null,

                status: "active",

                source: "dairy",

                sourceId:
                    dairy._id,

                parentStructure: null,

                structureCode: null

            });

    }


    /* -------------------------------------------------
       SYNCHRONIZE IDENTITY
    ------------------------------------------------- */

    else {

        let changed = false;


        if (
            asset.item !== dairy.name
        ) {

            asset.item =
                dairy.name;

            changed = true;

        }


        if (
            asset.type !== type
        ) {

            asset.type =
                type;

            changed = true;

        }


        /*
         * Structures cannot have a parent structure.
         */

        if (
            asset.parentStructure !== null
        ) {

            asset.parentStructure =
                null;

            changed = true;

        }


        if (
            asset.structureCode !== null
        ) {

            asset.structureCode =
                null;

            changed = true;

        }


        if (changed) {

            await asset.save();

        }

    }


    structureMap.set(

        Number(dairy.code),

        {

            dairy,

            netWorth:
                asset

        }

    );

}


/* =====================================================
   SYNCHRONIZE POSITIVE-CODE DAIRY ASSETS
===================================================== */

for (const dairy of cows) {

    const assignedCode =

        dairy.assetCode !== null &&

        dairy.assetCode !== undefined &&

        dairy.assetCode !== ""

            ? Number(dairy.assetCode)

            : null;


    let parentStructure =
        null;


    let structureCode =
        null;


    /* -------------------------------------------------
       FIND ASSIGNED STRUCTURE
    ------------------------------------------------- */

    if (

        assignedCode !== null &&

        Number.isFinite(assignedCode) &&

        assignedCode < 0 &&

        structureMap.has(assignedCode)

    ) {

        const structure =
            structureMap.get(
                assignedCode
            );


        parentStructure =
            structure.netWorth._id;


        structureCode =
            assignedCode;

    }


    const type =
        getDairyAssetType(
            dairy.code
        );


    let asset =
        await NetWorth.findOne({

            source: "dairy",

            sourceId:
                dairy._id

        });


    /* -------------------------------------------------
       CREATE MISSING COW ASSET
    ------------------------------------------------- */

    if (!asset) {

        asset =
            await NetWorth.create({

                item:
                    dairy.name,

                type,

                buyingPrice: 0,

                currentWorth: 0,

                description: "",

                condition: "",

                location: "",

                acquisitionDate:
                    dairy.createdAt ||
                    new Date(),

                valuationDate: null,

                status: "active",

                source: "dairy",

                sourceId:
                    dairy._id,

                parentStructure,

                structureCode

            });

    }


    /* -------------------------------------------------
       SYNCHRONIZE COW IDENTITY
    ------------------------------------------------- */

    else {

        let changed = false;


        if (
            asset.item !== dairy.name
        ) {

            asset.item =
                dairy.name;

            changed = true;

        }


        if (
            asset.type !== type
        ) {

            asset.type =
                type;

            changed = true;

        }


        if (

            String(
                asset.parentStructure || ""
            ) !==

            String(
                parentStructure || ""
            )

        ) {

            asset.parentStructure =
                parentStructure;

            changed = true;

        }


        if (
            asset.structureCode !==
            structureCode
        ) {

            asset.structureCode =
                structureCode;

            changed = true;

        }


        if (changed) {

            await asset.save();

        }

    }

}


return {

    structures,

    cows

};

}

/* =========================================================
GET NET WORTH OVERVIEW
========================================================= */

exports.getNetWorthOverview =
async function () {

await syncDairyAssets();


const totalNetWorth =
    await NetWorth.calculateNetWorth();


const standaloneAssets =
    await NetWorth.find({

        status: "active",

        parentStructure: null

    })
    .sort({

        type: 1,

        item: 1

    });


const structures =
    await NetWorth.find({

        status: "active",

        source: "dairy",

        type: "dairy Facility",

        parentStructure: null

    })
    .sort({

        item: 1

    });


return {

    totalNetWorth,

    standaloneAssets,

    structures

};

};

/* =========================================================
GET STRUCTURE BY ID
========================================================= */

exports.getStructureById =
async function (id) {

if (!isValidObjectId(id)) {

    return null;

}


await syncDairyAssets();


const structure =
    await NetWorth.findOne({

        _id: id,

        source: "dairy",

        type: "dairy Facility",

        status: "active",

        parentStructure: null

    });


return structure;

};

/* =========================================================
GET STRUCTURE DETAILS
========================================================= */

exports.getStructureDetails =
async function (id) {

if (!isValidObjectId(id)) {

    return null;

}


await syncDairyAssets();


const structure =
    await NetWorth.findOne({

        _id: id,

        source: "dairy",

        type: "dairy Facility",

        status: "active"

    });


if (!structure) {

    return null;

}


const assets =
    await NetWorth.find({

        parentStructure:
            structure._id,

        status: "active"

    })
    .sort({

        type: 1,

        item: 1

    });


const result =
    await NetWorth.aggregate([

        {

            $match: {

                parentStructure:
                    structure._id,

                status: "active"

            }

        },

        {

            $group: {

                _id: null,

                total: {

                    $sum:
                        "$currentWorth"

                }

            }

        }

    ]);


const structureTotal =
    result.length

        ? result[0].total

        : 0;


return {

    structure,

    assets,

    structureTotal

};

};

/* =========================================================
GET ASSET DETAILS
========================================================= */

exports.getAssetDetails =
async function (id) {

if (!isValidObjectId(id)) {

    return null;

}


await syncDairyAssets();


/*
 * IMPORTANT:
 *
 * This ID is always a NetWorth _id.
 */

const asset =
    await NetWorth.findById(id);


if (!asset) {

    return null;

}


let dairy = null;


/* -----------------------------------------------------
   Resolve the underlying Dairy record.
----------------------------------------------------- */

if (

    asset.source === "dairy" &&

    asset.sourceId

) {

    dairy =
        await Dairy.findById(
            asset.sourceId
        );

}


/* -----------------------------------------------------
   Structures available for assignment.
----------------------------------------------------- */

const structures =
    await Dairy.find({

        code: {
            $lt: 0
        }

    })
    .select(

        "code name"

    )
    .sort({

        code: 1

    })
    .lean();


return {

    asset,

    dairy,

    structures

};

};

/* =========================================================
UPDATE DAIRY-GENERATED ASSET
========================================================= */

async function updateDairyAsset(
asset,
data
) {

const dairy =
    await Dairy.findById(
        asset.sourceId
    );


if (!dairy) {

    throw new Error(
        "The Dairy record linked to this asset was not found."
    );

}


const dairyCode =
    Number(dairy.code);


/* =====================================================
   UPDATE DAIRY IDENTITY
===================================================== */

if (data.item !== undefined) {

    const name =
        String(
            data.item
        ).trim();


    if (!name) {

        throw new Error(
            "Asset name is required."
        );

    }


    dairy.name =
        name;

}


/* =====================================================
   STRUCTURE ASSIGNMENT
   
   Only positive-code Dairy records can have
   assetCode.
===================================================== */

if (dairyCode < 0) {

    /*
     * A structure cannot belong to another structure.
     */

    dairy.assetCode =
        null;

    asset.parentStructure =
        null;

    asset.structureCode =
        null;

}


else if (dairyCode > 0) {

    /*
     * If assetCode was submitted, update the
     * authoritative Dairy relationship.
     */

    if (
        data.assetCode !== undefined
    ) {

        const rawCode =
            String(
                data.assetCode
            ).trim();


        if (!rawCode) {

            dairy.assetCode =
                null;

            asset.parentStructure =
                null;

            asset.structureCode =
                null;

        }


        else {

            const selectedCode =
                Number(rawCode);


            if (
                !Number.isInteger(
                    selectedCode
                ) ||
                selectedCode >= 0
            ) {

                throw new Error(
                    "Selected structure is invalid."
                );

            }


            const structureDairy =
                await Dairy.findOne({

                    code:
                        selectedCode

                });


            if (!structureDairy) {

                throw new Error(
                    "Selected structure does not exist."
                );

            }


            if (
                Number(
                    structureDairy.code
                ) >= 0
            ) {

                throw new Error(
                    "Selected structure must have a negative code."
                );

            }


            /*
             * Find the corresponding NetWorth
             * representation.
             *
             * This is the NetWorth ID that the
             * parentStructure field must contain.
             */

            let structureAsset =
                await NetWorth.findOne({

                    source: "dairy",

                    sourceId:
                        structureDairy._id,

                    type:
                        "dairy Facility"

                });


            /*
             * If the structure representation does
             * not yet exist, create it.
             */

            if (!structureAsset) {

                structureAsset =
                    await NetWorth.create({

                        item:
                            structureDairy.name,

                        type:
                            "dairy Facility",

                        buyingPrice: 0,

                        currentWorth: 0,

                        description: "",

                        condition: "",

                        location: "",

                        acquisitionDate:
                            structureDairy.createdAt ||
                            new Date(),

                        valuationDate: null,

                        status:
                            "active",

                        source:
                            "dairy",

                        sourceId:
                            structureDairy._id,

                        parentStructure:
                            null,

                        structureCode:
                            null

                    });

            }


            /*
             * Dairy is the authoritative source
             * for the assignment.
             */

            dairy.assetCode =
                selectedCode;


            /*
             * NetWorth stores the resolved
             * relationship for querying.
             */

            asset.parentStructure =
                structureAsset._id;

            asset.structureCode =
                selectedCode;

        }

    }

}


/* =====================================================
   SAVE DAIRY FIRST
===================================================== */

await dairy.save();


/* =====================================================
   NETWORTH IDENTITY SYNCHRONIZATION
===================================================== */

asset.item =
    dairy.name;

asset.type =
    getDairyAssetType(
        dairy.code
    );


/* =====================================================
   NETWORTH FINANCIAL FIELDS
   
   These belong to NetWorth.
===================================================== */

if (
    data.buyingPrice !== undefined
) {

    const buyingPrice =
        toNumber(
            data.buyingPrice,
            NaN
        );


    if (
        !Number.isFinite(
            buyingPrice
        ) ||
        buyingPrice < 0
    ) {

        throw new Error(
            "Buying price must be a valid non-negative number."
        );

    }


    asset.buyingPrice =
        buyingPrice;

}


if (
    data.currentWorth !== undefined
) {

    const currentWorth =
        toNumber(
            data.currentWorth,
            NaN
        );


    if (
        !Number.isFinite(
            currentWorth
        ) ||
        currentWorth < 0
    ) {

        throw new Error(
            "Current worth must be a valid non-negative number."
        );

    }


    asset.currentWorth =
        currentWorth;

}


if (
    data.description !== undefined
) {

    asset.description =
        String(
            data.description
        ).trim();

}


if (
    data.condition !== undefined
) {

    asset.condition =
        String(
            data.condition
        ).trim();

}


if (
    data.location !== undefined
) {

    asset.location =
        String(
            data.location
        ).trim();

}


if (
    data.status !== undefined
) {

    if (
        !ALLOWED_STATUSES.includes(
            data.status
        )
    ) {

        throw new Error(
            "Invalid asset status."
        );

    }


    asset.status =
        data.status;

}


if (
    data.valuationDate !== undefined
) {

    const rawDate =
        String(
            data.valuationDate
        ).trim();


    if (!rawDate) {

        asset.valuationDate =
            null;

    }


    else {

        const valuationDate =
            new Date(rawDate);


        if (
            Number.isNaN(
                valuationDate.getTime()
            )
        ) {

            throw new Error(
                "Invalid valuation date."
            );

        }


        asset.valuationDate =
            valuationDate;

    }

}


/* =====================================================
   SAVE NETWORTH
===================================================== */

await asset.save();


/*
 * Return the same NetWorth document.
 *
 * Its _id has NOT changed.
 */

return asset;

}

/* =========================================================
UPDATE MANUAL NETWORTH ASSET
========================================================= */

async function updateManualAsset(
asset,
data
) {

/* -----------------------------------------------------
   Manual assets are owned directly by NetWorth.
----------------------------------------------------- */

if (data.item !== undefined) {

    const item =
        String(
            data.item
        ).trim();


    if (!item) {

        throw new Error(
            "Asset item is required."
        );

    }


    asset.item =
        item;

}


if (data.type !== undefined) {

    const type =
        String(
            data.type
        ).trim();


    if (!type) {

        throw new Error(
            "Asset type is required."
        );

    }


    asset.type =
        type;

}


if (
    data.buyingPrice !== undefined
) {

    const buyingPrice =
        toNumber(
            data.buyingPrice,
            NaN
        );


    if (
        !Number.isFinite(
            buyingPrice
        ) ||
        buyingPrice < 0
    ) {

        throw new Error(
            "Buying price must be a valid non-negative number."
        );

    }


    asset.buyingPrice =
        buyingPrice;

}


if (
    data.currentWorth !== undefined
) {

    const currentWorth =
        toNumber(
            data.currentWorth,
            NaN
        );


    if (
        !Number.isFinite(
            currentWorth
        ) ||
        currentWorth < 0
    ) {

        throw new Error(
            "Current worth must be a valid non-negative number."
        );

    }


    asset.currentWorth =
        currentWorth;

}


if (
    data.description !== undefined
) {

    asset.description =
        String(
            data.description
        ).trim();

}


if (
    data.condition !== undefined
) {

    asset.condition =
        String(
            data.condition
        ).trim();

}


if (
    data.location !== undefined
) {

    asset.location =
        String(
            data.location
        ).trim();

}


if (
    data.status !== undefined
) {

    if (
        !ALLOWED_STATUSES.includes(
            data.status
        )
    ) {

        throw new Error(
            "Invalid asset status."
        );

    }


    asset.status =
        data.status;

}


if (
    data.valuationDate !== undefined
) {

    const rawDate =
        String(
            data.valuationDate
        ).trim();


    if (!rawDate) {

        asset.valuationDate =
            null;

    }


    else {

        const valuationDate =
            new Date(rawDate);


        if (
            Number.isNaN(
                valuationDate.getTime()
            )
        ) {

            throw new Error(
                "Invalid valuation date."
            );

        }


        asset.valuationDate =
            valuationDate;

    }

}


await asset.save();


return asset;

}

/* =========================================================
UPDATE ASSET

IMPORTANT:

The ID passed here is ALWAYS NetWorth._id.

For Dairy assets:

   NetWorth._id
        ↓
   NetWorth.sourceId
        ↓
      Dairy

Dairy identity is updated first.

NetWorth financial data is then updated.

For manual assets:

   NetWorth is updated directly.

========================================================= */

exports.updateAsset =
async function (
id,
data
) {

if (!isValidObjectId(id)) {

    throw new Error(
        "Invalid asset ID."
    );

}


const asset =
    await NetWorth.findById(id);


if (!asset) {

    throw new Error(
        "Asset not found."
    );

}


if (

    asset.source === "dairy" &&

    asset.sourceId

) {

    return updateDairyAsset(
        asset,
        data
    );

}


return updateManualAsset(
    asset,
    data
);

};

/* =========================================================
ADD MANUAL STRUCTURE ASSET
========================================================= */

exports.addManualAsset =
async function (
structureId,
data
) {

if (
    !isValidObjectId(
        structureId
    )
) {

    throw new Error(
        "Invalid structure ID."
    );

}


const structure =
    await NetWorth.findOne({

        _id:
            structureId,

        source:
            "dairy",

        type:
            "dairy Facility",

        status:
            "active"

    });


if (!structure) {

    throw new Error(
        "Structure not found."
    );

}


const item =
    String(
        data.item || ""
    ).trim();


const type =
    String(
        data.type || ""
    ).trim();


const description =
    String(
        data.description || ""
    ).trim();


const condition =
    String(
        data.condition || ""
    ).trim();


const location =
    String(
        data.location || ""
    ).trim();


if (!item) {

    throw new Error(
        "Asset item is required."
    );

}


if (!type) {

    throw new Error(
        "Asset type is required."
    );

}


if (!description) {

    throw new Error(
        "Asset description is required."
    );

}


if (!condition) {

    throw new Error(
        "Asset condition is required."
    );

}


if (!location) {

    throw new Error(
        "Asset location is required."
    );

}


const buyingPrice =
    toNumber(
        data.buyingPrice,
        NaN
    );


const currentWorth =
    toNumber(
        data.currentWorth,
        NaN
    );


if (
    !Number.isFinite(
        buyingPrice
    )
) {

    throw new Error(
        "Buying price is required."
    );

}


if (
    !Number.isFinite(
        currentWorth
    )
) {

    throw new Error(
        "Current worth is required."
    );

}


if (
    buyingPrice < 0 ||
    currentWorth < 0
) {

    throw new Error(
        "Asset prices cannot be negative."
    );

}


const asset =
    await NetWorth.create({

        item,

        type,

        buyingPrice,

        currentWorth,

        description,

        condition,

        location,

        acquisitionDate:
            new Date(),

        valuationDate:
            new Date(),

        status:
            "active",

        source:
            "structure",

        sourceId:
            null,

        parentStructure:
            structure._id,

        structureCode:
            structure.structureCode

    });


return asset;

};

/* =========================================================
EXPORT SYNCHRONIZATION
========================================================= */

exports.syncDairyAssets =
syncDairyAssets;