const mongoose = require("mongoose");

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
   CONSTANTS
========================================================= */

const ALLOWED_STATUSES = [

    "active",

    "sold",

    "disposed",

    "inactive"

];


/* =========================================================
   DETERMINE ASSET TYPE
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


    return "asset";

}


/* =========================================================
   NORMALIZE ASSET
========================================================= */

function normalizeAsset(asset) {

    if (!asset) {

        return null;

    }


    return asset;

}


/* =========================================================
   GET STRUCTURE BY CODE
========================================================= */

async function getStructureByCode(code) {

    const numericCode =
        Number(code);


    if (
        !Number.isInteger(numericCode) ||
        numericCode >= 0
    ) {

        return null;

    }


    return Dairy.findOne({

        code: numericCode

    });

}


/* =========================================================
   GET NET WORTH OVERVIEW

   ALL DATA COMES DIRECTLY FROM DAIRY.

   No synchronization is required because Dairy is now
   the only source of truth.
========================================================= */

exports.getNetWorthOverview =
async function () {

    /*
     * Active records contribute to net worth.
     */

    const activeAssets =
        await Dairy.find({

            status: "active"

        })
        .sort({

            name: 1

        });


    /*
     * Total current worth.
     */

    const totalResult =
        await Dairy.aggregate([

            {

                $match: {

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


    const totalNetWorth =
        totalResult.length > 0

            ? Number(
                totalResult[0].total || 0
            )

            : 0;


    /*
     * Negative-code records are structures.
     */

    const structures =
        activeAssets.filter(

            asset =>
                Number(asset.code) < 0

        );


    /*
     * Assets which do not belong to a structure.
     *
     * A positive-code Dairy record is standalone when
     * assetCode is empty/null.
     *
     * Code 0 is also treated as a standalone asset.
     */

    const standaloneAssets =
        activeAssets.filter(asset => {

            const code =
                Number(asset.code);


            const hasStructure =
                asset.assetCode !== null &&

                asset.assetCode !== undefined &&

                String(
                    asset.assetCode
                ).trim() !== "";


            return (
                code >= 0 &&
                !hasStructure
            );

        });


    return {

        totalNetWorth,

        standaloneAssets,

        structures

    };

};


/* =========================================================
   GET STRUCTURE BY ID

   STRUCTURE ID IS NOW Dairy._id.
========================================================= */

exports.getStructureById =
async function (id) {

    if (!isValidObjectId(id)) {

        return null;

    }


    const structure =
        await Dairy.findOne({

            _id: id,

            code: {
                $lt: 0
            },

            status: "active"

        });


    return normalizeAsset(
        structure
    );

};


/* =========================================================
   GET STRUCTURE DETAILS

   Structure:
       Dairy._id

   Child assets:
       Dairy.assetCode === structure.code
========================================================= */

exports.getStructureDetails =
async function (id) {

    if (!isValidObjectId(id)) {

        return null;

    }


    const structure =
        await Dairy.findOne({

            _id: id,

            code: {
                $lt: 0
            },

            status: "active"

        });


    if (!structure) {

        return null;

    }


    const structureCode =
        Number(
            structure.code
        );


    /*
     * All assets assigned to this structure are
     * identified by the structure's negative code.
     */

    const assets =
        await Dairy.find({

            assetCode:
                structureCode,

            status: "active"

        })
        .sort({

            name: 1

        });


    /*
     * Calculate the value of assets inside the structure.
     */

    const totalResult =
        await Dairy.aggregate([

            {

                $match: {

                    assetCode:
                        structureCode,

                    status:
                        "active"

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
        totalResult.length > 0

            ? Number(
                totalResult[0].total || 0
            )

            : 0;


    return {

        structure,

        assets,

        structureTotal

    };

};


/* =========================================================
   GET ASSET DETAILS

   IMPORTANT:

   The ID is now ALWAYS Dairy._id.

   There is no NetWorth ID anymore.
========================================================= */

exports.getAssetDetails =
async function (id) {

    if (!isValidObjectId(id)) {

        return null;

    }


    const asset =
        await Dairy.findById(id);


    if (!asset) {

        return null;

    }


    /*
     * Resolve the structure assignment.

     * Only positive-code assets can belong to a
     * negative-code structure.
     */

    let structure = null;


    if (
        Number(asset.code) > 0 &&
        asset.assetCode !== null &&
        asset.assetCode !== undefined &&
        String(asset.assetCode).trim() !== ""
    ) {

        structure =
            await getStructureByCode(
                asset.assetCode
            );

    }


    /*
     * Get all available structures.
     *
     * These are Dairy records with negative codes.
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

        dairy: asset,

        structure,

        structures

    };

};


/* =========================================================
   UPDATE ASSET

   EVERYTHING IS SAVED DIRECTLY TO DAIRY.

   There is no second model.

   The ID is Dairy._id.
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
        await Dairy.findById(id);


    if (!asset) {

        throw new Error(
            "Asset not found."
        );

    }


    const dairyCode =
        Number(asset.code);


    /* =====================================================
       NAME
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


        asset.name =
            name;

    }


    /* =====================================================
       BUYING PRICE
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


    /* =====================================================
       CURRENT WORTH
    ===================================================== */

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


    /* =====================================================
       DESCRIPTION
    ===================================================== */

    if (
        data.description !== undefined
    ) {

        asset.description =
            String(
                data.description
            ).trim();

    }


    /* =====================================================
       CONDITION
    ===================================================== */

    if (
        data.condition !== undefined
    ) {

        asset.condition =
            String(
                data.condition
            ).trim();

    }


    /* =====================================================
       LOCATION
    ===================================================== */

    if (
        data.location !== undefined
    ) {

        asset.location =
            String(
                data.location
            ).trim();

    }


    /* =====================================================
       STATUS
    ===================================================== */

    if (
        data.status !== undefined
    ) {

        const status =
            String(
                data.status
            ).trim();


        if (
            !ALLOWED_STATUSES.includes(
                status
            )
        ) {

            throw new Error(
                "Invalid asset status."
            );

        }


        asset.status =
            status;

    }


    /* =====================================================
       VALUATION DATE
    ===================================================== */

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
       STRUCTURE ASSIGNMENT
       
       Structures themselves cannot belong to another
       structure.
    ===================================================== */

    if (dairyCode < 0) {

        asset.assetCode =
            null;

    }


    /* =====================================================
       POSITIVE-CODE ASSET
    ===================================================== */

    else if (dairyCode > 0) {

        if (
            data.assetCode !== undefined
        ) {

            const rawCode =
                String(
                    data.assetCode
                ).trim();


            /*
             * Empty selection means standalone.
             */

            if (!rawCode) {

                asset.assetCode =
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


                const structure =
                    await Dairy.findOne({

                        code:
                            selectedCode,

                        status:
                            "active"

                    });


                if (!structure) {

                    throw new Error(
                        "Selected structure does not exist."
                    );

                }


                if (
                    Number(
                        structure.code
                    ) >= 0
                ) {

                    throw new Error(
                        "Selected structure must have a negative code."
                    );

                }


                /*
                 * The negative structure code is the
                 * authoritative relationship.
                 */

                asset.assetCode =
                    selectedCode;

            }

        }

    }


    /* =====================================================
       CODE ZERO / MANUAL ASSET
    ===================================================== */

    else {

        /*
         * A code-zero standalone asset does not belong
         * to a structure unless the model later explicitly
         * permits such a relationship.
         */

        if (
            data.assetCode !== undefined
        ) {

            const rawCode =
                String(
                    data.assetCode
                ).trim();


            if (!rawCode) {

                asset.assetCode =
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


                const structure =
                    await Dairy.findOne({

                        code:
                            selectedCode,

                        status:
                            "active"

                    });


                if (!structure) {

                    throw new Error(
                        "Selected structure does not exist."
                    );

                }


                asset.assetCode =
                    selectedCode;

            }

        }

    }


    /* =====================================================
       SAVE

       THIS IS THE IMPORTANT PART:

       The exact Dairy document found using the URL ID
       is saved.

       Its _id does not change.
    ===================================================== */

    await asset.save();


    return asset;

};


/* =========================================================
   ADD MANUAL ASSET TO STRUCTURE

   Everything is stored in Dairy.

   The new asset gets:
       code = 0
       assetCode = structure.code
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
        await Dairy.findOne({

            _id:
                structureId,

            code: {
                $lt: 0
            },

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
        await Dairy.create({

            name:
                item,

            /*
             * Code 0 identifies a manually-created
             * standalone/structure asset rather than
             * a cow or facility.
             */

            code:
                0,

            assetCode:
                Number(
                    structure.code
                ),

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
                "active"

        });


    return asset;

};


/* =========================================================
   OPTIONAL HELPER
========================================================= */

exports.getDairyAssetType =
getDairyAssetType;


/* =========================================================
   OPTIONAL HELPER
========================================================= */

exports.getStructureByCode =
getStructureByCode;