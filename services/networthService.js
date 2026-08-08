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
   DETERMINE DAIRY ASSET TYPE
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
   SYNCHRONIZE DAIRY RECORDS INTO NET WORTH
       
   IMPORTANT:

   Dairy is the SOURCE OF TRUTH.

   This function does NOT modify Dairy.

   It reads Dairy and updates/creates the corresponding
   NetWorth representation.
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
           CREATE STRUCTURE ASSET
        ------------------------------------------------- */

        if (!asset) {

            asset =
                await NetWorth.create({

                    item:
                        dairy.name,

                    type,

                    buyingPrice:
                        toNumber(
                            dairy.buyingPrice
                        ),

                    currentWorth:
                        toNumber(
                            dairy.currentWorth
                        ),

                    description:
                        dairy.description || "",

                    condition:
                        dairy.condition || "",

                    location:
                        dairy.location || "",

                    acquisitionDate:
                        dairy.createdAt ||
                        new Date(),

                    valuationDate:
                        dairy.valuationDate ||
                        null,

                    status:
                        dairy.status || "active",

                    source:
                        "dairy",

                    sourceId:
                        dairy._id,

                    parentStructure:
                        null,

                    structureCode:
                        null

                });

        }

        /* -------------------------------------------------
           UPDATE STRUCTURE ASSET FROM DAIRY
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


            const buyingPrice =
                toNumber(
                    dairy.buyingPrice
                );


            if (
                asset.buyingPrice !==
                buyingPrice
            ) {

                asset.buyingPrice =
                    buyingPrice;

                changed = true;

            }


            const currentWorth =
                toNumber(
                    dairy.currentWorth
                );


            if (
                asset.currentWorth !==
                currentWorth
            ) {

                asset.currentWorth =
                    currentWorth;

                changed = true;

            }


            const description =
                dairy.description || "";


            if (
                asset.description !==
                description
            ) {

                asset.description =
                    description;

                changed = true;

            }


            const condition =
                dairy.condition || "";


            if (
                asset.condition !==
                condition
            ) {

                asset.condition =
                    condition;

                changed = true;

            }


            const location =
                dairy.location || "";


            if (
                asset.location !==
                location
            ) {

                asset.location =
                    location;

                changed = true;

            }


            const status =
                dairy.status || "active";


            if (
                asset.status !==
                status
            ) {

                asset.status =
                    status;

                changed = true;

            }


            const dairyValuationDate =
                dairy.valuationDate
                    ? new Date(
                        dairy.valuationDate
                    ).getTime()
                    : null;


            const assetValuationDate =
                asset.valuationDate
                    ? new Date(
                        asset.valuationDate
                    ).getTime()
                    : null;


            if (
                dairyValuationDate !==
                assetValuationDate
            ) {

                asset.valuationDate =
                    dairy.valuationDate ||
                    null;

                changed = true;

            }


            if (
                asset.parentStructure !==
                null
            ) {

                asset.parentStructure =
                    null;

                changed = true;

            }


            if (
                asset.structureCode !==
                null
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

                netWorth: asset

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
           FIND PARENT STRUCTURE
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

                sourceId: dairy._id

            });


        /* -------------------------------------------------
           CREATE COW ASSET
        ------------------------------------------------- */

        if (!asset) {

            asset =
                await NetWorth.create({

                    item:
                        dairy.name,

                    type,

                    buyingPrice:
                        toNumber(
                            dairy.buyingPrice
                        ),

                    currentWorth:
                        toNumber(
                            dairy.currentWorth
                        ),

                    description:
                        dairy.description || "",

                    condition:
                        dairy.condition || "",

                    location:
                        dairy.location || "",

                    acquisitionDate:
                        dairy.createdAt ||
                        new Date(),

                    valuationDate:
                        dairy.valuationDate ||
                        null,

                    status:
                        dairy.status || "active",

                    source:
                        "dairy",

                    sourceId:
                        dairy._id,

                    parentStructure,

                    structureCode

                });

        }

        /* -------------------------------------------------
           UPDATE COW ASSET FROM DAIRY
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


            const buyingPrice =
                toNumber(
                    dairy.buyingPrice
                );


            if (
                asset.buyingPrice !==
                buyingPrice
            ) {

                asset.buyingPrice =
                    buyingPrice;

                changed = true;

            }


            const currentWorth =
                toNumber(
                    dairy.currentWorth
                );


            if (
                asset.currentWorth !==
                currentWorth
            ) {

                asset.currentWorth =
                    currentWorth;

                changed = true;

            }


            const description =
                dairy.description || "";


            if (
                asset.description !==
                description
            ) {

                asset.description =
                    description;

                changed = true;

            }


            const condition =
                dairy.condition || "";


            if (
                asset.condition !==
                condition
            ) {

                asset.condition =
                    condition;

                changed = true;

            }


            const location =
                dairy.location || "";


            if (
                asset.location !==
                location
            ) {

                asset.location =
                    location;

                changed = true;

            }


            const status =
                dairy.status || "active";


            if (
                asset.status !==
                status
            ) {

                asset.status =
                    status;

                changed = true;

            }


            const dairyValuationDate =
                dairy.valuationDate
                    ? new Date(
                        dairy.valuationDate
                    ).getTime()
                    : null;


            const assetValuationDate =
                asset.valuationDate
                    ? new Date(
                        asset.valuationDate
                    ).getTime()
                    : null;


            if (
                dairyValuationDate !==
                assetValuationDate
            ) {

                asset.valuationDate =
                    dairy.valuationDate ||
                    null;

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


    const asset =
        await NetWorth.findById(id);


    if (!asset) {

        return null;

    }


    let dairy = null;


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
       Only negative-code Dairy records can be selected
       as structures.
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
   UPDATE ASSET
       
   SOURCE-OF-TRUTH RULE:

   Dairy-generated asset:
       UPDATE DAIRY FIRST.
       THEN SYNC NET WORTH.

   Manual NetWorth asset:
       UPDATE NET WORTH DIRECTLY.
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


    /* =====================================================
       DAIRY-GENERATED ASSET
    ===================================================== */

    if (

        asset.source === "dairy" &&

        asset.sourceId

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


        /* =================================================
           NAME
        ================================================= */

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


        /* =================================================
           BUYING PRICE
        ================================================= */

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


            dairy.buyingPrice =
                buyingPrice;

        }


        /* =================================================
           CURRENT WORTH
        ================================================= */

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


            dairy.currentWorth =
                currentWorth;

        }


        /* =================================================
           DESCRIPTION
        ================================================= */

        if (
            data.description !== undefined
        ) {

            dairy.description =
                String(
                    data.description
                ).trim();

        }


        /* =================================================
           CONDITION
        ================================================= */

        if (
            data.condition !== undefined
        ) {

            dairy.condition =
                String(
                    data.condition
                ).trim();

        }


        /* =================================================
           LOCATION
        ================================================= */

        if (
            data.location !== undefined
        ) {

            dairy.location =
                String(
                    data.location
                ).trim();

        }


        /* =================================================
           STATUS
        ================================================= */

        if (
            data.status !== undefined
        ) {

            const allowedStatuses = [

                "active",

                "sold",

                "disposed",

                "inactive"

            ];


            if (
                !allowedStatuses.includes(
                    data.status
                )
            ) {

                throw new Error(
                    "Invalid asset status."
                );

            }


            dairy.status =
                data.status;

        }


        /* =================================================
           VALUATION DATE
        ================================================= */

        if (
            data.valuationDate !== undefined
        ) {

            if (
                String(
                    data.valuationDate
                ).trim() === ""
            ) {

                dairy.valuationDate =
                    null;

            }

            else {

                const valuationDate =
                    new Date(
                        data.valuationDate
                    );


                if (
                    Number.isNaN(
                        valuationDate.getTime()
                    )
                ) {

                    throw new Error(
                        "Invalid valuation date."
                    );

                }


                dairy.valuationDate =
                    valuationDate;

            }

        }


        /* =================================================
           STRUCTURE ASSIGNMENT

           ONLY positive-code Dairy records may have
           assetCode.
        ================================================= */

        if (dairyCode < 0) {

            dairy.assetCode =
                null;

        }

        else if (dairyCode > 0) {

            let selectedCode =
                null;


            if (

                data.assetCode !==
                    undefined &&

                data.assetCode !==
                    null &&

                String(
                    data.assetCode
                ).trim() !== ""

            ) {

                selectedCode =
                    Number(
                        data.assetCode
                    );

            }


            /* ---------------------------------------------
               REMOVE STRUCTURE ASSIGNMENT
            --------------------------------------------- */

            if (

                selectedCode === null ||

                !Number.isFinite(
                    selectedCode
                )

            ) {

                dairy.assetCode =
                    null;

            }

            /* ---------------------------------------------
               ASSIGN TO STRUCTURE
            --------------------------------------------- */

            else {

                if (
                    selectedCode >= 0
                ) {

                    throw new Error(
                        "A Dairy asset can only be assigned to a negative structure code."
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
                        "Selected Dairy record is not a structure."
                    );

                }


                dairy.assetCode =
                    selectedCode;

            }

        }


        /* =================================================
           SAVE DAIRY

           THIS IS NOW THE AUTHORITATIVE SAVE.
        ================================================= */

        await dairy.save();


        /* =================================================
           SYNCHRONIZE NET WORTH

           This reads the newly saved Dairy record and
           updates its NetWorth representation.
        ================================================= */

        await syncDairyAssets();


        const updatedAsset =
            await NetWorth.findOne({

                source: "dairy",

                sourceId: dairy._id

            });


        if (!updatedAsset) {

            throw new Error(
                "Dairy was updated, but its Net Worth asset could not be synchronized."
            );

        }


        return updatedAsset;

    }


    /* =====================================================
       MANUAL NETWORTH ASSET
       
       These assets do not originate from Dairy.
       
       Therefore NetWorth remains their source of truth.
    ===================================================== */

    if (
        data.item !== undefined
    ) {

        asset.item =
            String(
                data.item
            ).trim();

    }


    if (
        data.type !== undefined
    ) {

        asset.type =
            String(
                data.type
            ).trim();

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

        const allowedStatuses = [

            "active",

            "sold",

            "disposed",

            "inactive"

        ];


        if (
            !allowedStatuses.includes(
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

        if (
            String(
                data.valuationDate
            ).trim() === ""
        ) {

            asset.valuationDate =
                null;

        }

        else {

            const valuationDate =
                new Date(
                    data.valuationDate
                );


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


    /* =====================================================
       REQUIRED FIELDS
    ===================================================== */

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


    /* =====================================================
       GET STRUCTURE CODE FROM SOURCE DAIRY RECORD
    ===================================================== */

    let structureCode =
        null;


    if (
        structure.sourceId
    ) {

        const structureDairy =
            await Dairy.findById(
                structure.sourceId
            );


        if (
            structureDairy &&
            Number(
                structureDairy.code
            ) < 0
        ) {

            structureCode =
                Number(
                    structureDairy.code
                );

        }

    }


    /* =====================================================
       CREATE MANUAL ASSET
    ===================================================== */

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

            structureCode

        });


    return asset;

};


/* =========================================================
   EXPORT SYNC FUNCTION
========================================================= */

exports.syncDairyAssets =
    syncDairyAssets;