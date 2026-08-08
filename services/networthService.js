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
   SYNCHRONIZE DAIRY RECORDS
========================================================= */

async function syncDairyAssets() {

    const dairyRecords =
        await Dairy.find({}).lean();

    const structures =
        dairyRecords.filter(
            dairy => Number(dairy.code) < 0
        );

    const cows =
        dairyRecords.filter(
            dairy => Number(dairy.code) > 0
        );


    /* =====================================================
       STRUCTURE MAP
    ===================================================== */

    const structureMap = new Map();

    for (const dairy of structures) {

        let asset =
            await NetWorth.findOne({

                source: "dairy",

                sourceId: dairy._id

            });


        if (!asset) {

            asset =
                await NetWorth.create({

                    item: dairy.name,

                    type: "dairy Facility",

                    buyingPrice: 0,

                    currentWorth: 0,

                    description: "",

                    condition: "",

                    location: "",

                    acquisitionDate:
                        dairy.createdAt || new Date(),

                    valuationDate: null,

                    status: "active",

                    source: "dairy",

                    sourceId: dairy._id,

                    parentStructure: null,

                    structureCode: null

                });

        } else {

            /*
             * Keep the Dairy name synchronized.
             * Financial fields remain untouched.
             */

            if (asset.item !== dairy.name) {

                asset.item = dairy.name;

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
       COW / POSITIVE-CODE ASSETS
    ===================================================== */

    for (const dairy of cows) {

        const assignedCode =
            dairy.assetCode !== null &&
            dairy.assetCode !== undefined &&
            dairy.assetCode !== ""
                ? Number(dairy.assetCode)
                : null;


        let parentStructure = null;

        let structureCode = null;


        /*
         * Only assign the cow to a structure when
         * assetCode matches an existing negative Dairy code.
         */

        if (
            assignedCode !== null &&
            structureMap.has(assignedCode)
        ) {

            const structure =
                structureMap.get(assignedCode);

            parentStructure =
                structure.netWorth._id;

            structureCode =
                assignedCode;

        }


        let asset =
            await NetWorth.findOne({

                source: "dairy",

                sourceId: dairy._id

            });


        if (!asset) {

            asset =
                await NetWorth.create({

                    item: dairy.name,

                    type: "cow",

                    buyingPrice: 0,

                    currentWorth: 0,

                    description: "",

                    condition: "",

                    location: "",

                    acquisitionDate:
                        dairy.createdAt || new Date(),

                    valuationDate: null,

                    status: "active",

                    source: "dairy",

                    sourceId: dairy._id,

                    parentStructure,

                    structureCode

                });

        } else {

            /*
             * Synchronize identity information.
             * Do not overwrite user-maintained financial fields.
             */

            let changed = false;


            if (asset.item !== dairy.name) {

                asset.item = dairy.name;

                changed = true;

            }


            if (asset.type !== "cow") {

                asset.type = "cow";

                changed = true;

            }


            if (
                String(asset.parentStructure || "") !==
                String(parentStructure || "")
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

exports.getNetWorthOverview = async function () {

    await syncDairyAssets();


    /*
     * Only active assets contribute to net worth.
     */

    const totalNetWorth =
        await NetWorth.calculateNetWorth();


    /*
     * Standalone assets:
     *
     * Assets with no parent structure.
     *
     * This includes:
     * - standalone cows
     * - structures
     */

    const standaloneAssets =
        await NetWorth.find({

            status: "active",

            parentStructure: null

        })
        .sort({
            type: 1,
            item: 1
        });


    /*
     * Structures are Dairy-generated assets whose
     * type is dairy Facility.
     */

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

exports.getStructureById = async function (id) {

    if (!isValidObjectId(id)) {

        return null;

    }


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

exports.getStructureDetails = async function (id) {

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

                        $sum: "$currentWorth"

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

exports.getAssetDetails = async function (id) {

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


    /*
     * Only negative-code Dairy records are allowed
     * in the assetCode dropdown.
     */

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
========================================================= */

exports.updateAsset = async function (
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
       UPDATE FINANCIAL / DESCRIPTION FIELDS
    ===================================================== */

    if (data.item !== undefined) {

        asset.item =
            String(data.item).trim();

    }


    if (data.type !== undefined) {

        asset.type =
            String(data.type).trim();

    }


    if (data.buyingPrice !== undefined) {

        asset.buyingPrice =
            toNumber(data.buyingPrice);

    }


    if (data.currentWorth !== undefined) {

        asset.currentWorth =
            toNumber(data.currentWorth);

    }


    if (data.description !== undefined) {

        asset.description =
            String(data.description).trim();

    }


    if (data.condition !== undefined) {

        asset.condition =
            String(data.condition).trim();

    }


    if (data.location !== undefined) {

        asset.location =
            String(data.location).trim();

    }


    if (data.status !== undefined) {

        const allowedStatuses = [

            "active",
            "sold",
            "disposed",
            "inactive"

        ];


        if (
            allowedStatuses.includes(
                data.status
            )
        ) {

            asset.status =
                data.status;

        }

    }


    if (data.valuationDate) {

        const valuationDate =
            new Date(data.valuationDate);


        if (!Number.isNaN(
            valuationDate.getTime()
        )) {

            asset.valuationDate =
                valuationDate;

        }

    }


    /* =====================================================
       UPDATE COW STRUCTURE ASSIGNMENT
       
       Only Dairy assets can have assetCode.
    ===================================================== */

    if (
        asset.source === "dairy" &&
        asset.sourceId
    ) {

        const dairy =
            await Dairy.findById(
                asset.sourceId
            );


        if (dairy) {

            /*
             * Structures themselves cannot have assetCode.
             */

            if (Number(dairy.code) < 0) {

                dairy.assetCode = null;

                asset.parentStructure =
                    null;

                asset.structureCode =
                    null;

            }


            /*
             * Positive-code Dairy records can be
             * assigned to a structure.
             */

            else if (
                Number(dairy.code) > 0
            ) {

                let selectedCode = null;


                if (
                    data.assetCode !== undefined &&
                    data.assetCode !== null &&
                    String(data.assetCode).trim() !== ""
                ) {

                    selectedCode =
                        Number(data.assetCode);

                }


                /*
                 * No structure selected.
                 */

                if (
                    selectedCode === null ||
                    !Number.isFinite(
                        selectedCode
                    )
                ) {

                    dairy.assetCode =
                        null;

                    asset.parentStructure =
                        null;

                    asset.structureCode =
                        null;

                }


                /*
                 * Structure selected.
                 */

                else {

                    const structureDairy =
                        await Dairy.findOne({

                            code: selectedCode,

                            $expr: {
                                $lt: [
                                    "$code",
                                    0
                                ]
                            }

                        });


                    if (!structureDairy) {

                        throw new Error(
                            "Selected structure does not exist."
                        );

                    }


                    const structureAsset =
                        await NetWorth.findOne({

                            source: "dairy",

                            sourceId:
                                structureDairy._id,

                            type:
                                "dairy Facility"

                        });


                    if (!structureAsset) {

                        throw new Error(
                            "Selected structure is not available in Net Worth."
                        );

                    }


                    dairy.assetCode =
                        selectedCode;

                    asset.parentStructure =
                        structureAsset._id;

                    asset.structureCode =
                        selectedCode;

                }

            }


            await dairy.save();

        }

    }


    await asset.save();


    return asset;

};


/* =========================================================
   ADD MANUAL STRUCTURE ASSET
========================================================= */

exports.addManualAsset = async function (

    structureId,

    data

) {

    if (!isValidObjectId(
        structureId
    )) {

        throw new Error(
            "Invalid structure ID."
        );

    }


    const structure =
        await NetWorth.findOne({

            _id: structureId,

            source: "dairy",

            type: "dairy Facility",

            status: "active"

        });


    if (!structure) {

        throw new Error(
            "Structure not found."
        );

    }


    /* =====================================================
       REQUIRED MANUAL FIELDS
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


    if (!Number.isFinite(
        buyingPrice
    )) {

        throw new Error(
            "Buying price is required."
        );

    }


    if (!Number.isFinite(
        currentWorth
    )) {

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
       CREATE MANUAL ASSET
       
       Acquisition date is the actual save time.
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

            status: "active",

            source: "structure",

            sourceId: null,

            parentStructure:
                structure._id,

            structureCode:
                structure.structureCode

        });


    return asset;

};


/* =========================================================
   EXPORT SYNC FUNCTION
========================================================= */

exports.syncDairyAssets =
    syncDairyAssets;