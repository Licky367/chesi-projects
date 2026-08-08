const mongoose =
    require("mongoose");


const Dairy =
    require(
        "../models/dairy"
    );


/* =========================================================
   HELPERS
========================================================= */


/* ---------------------------------------------------------
   VALIDATE MONGOOSE OBJECT ID
--------------------------------------------------------- */

function isValidObjectId(
    id
) {

    return mongoose.Types.ObjectId.isValid(
        id
    );

}


/* ---------------------------------------------------------
   NORMALIZE NUMBER
--------------------------------------------------------- */

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


/* ---------------------------------------------------------
   NORMALIZE STRING
--------------------------------------------------------- */

function normalizeString(
    value
) {

    if (
        value === undefined ||
        value === null
    ) {

        return "";

    }


    return String(value).trim();

}


/* =========================================================
   GET NET WORTH DASHBOARD
========================================================= */

exports.getNetWorth =
async function () {

    /*
     * Active records are the records that contribute
     * to Net Worth.
     *
     * There is no separate NetWorth collection.
     */

    const assets =
        await Dairy.find({

            assetStatus:
                "active"

        })

        .sort({

            currentWorth:
                -1,

            name:
                1

        })

        .lean();


    /*
     * Structures are kept separately for the UI.
     *
     * They are still Dairy documents.
     */

    const structures =
        await Dairy.find({

            code:
                {
                    $lt: 0
                }

        })

        .sort({

            code:
                1

        })

        .lean();


    /*
     * Total Net Worth comes from Dairy.currentWorth
     * where assetStatus is active.
     */

    const totalNetWorth =
        await Dairy.calculateNetWorth();


    /*
     * Useful summary counts.
     */

    const activeAssetsCount =
        await Dairy.countDocuments({

            assetStatus:
                "active",

            code:
                {
                    $gte: 0
                }

        });


    const activeStructuresCount =
        await Dairy.countDocuments({

            assetStatus:
                "active",

            code:
                {
                    $lt: 0
                }

        });


    return {

        assets,

        structures,

        totalNetWorth,

        activeAssetsCount,

        activeStructuresCount

    };

};


/* =========================================================
   GET STRUCTURE

   :id is the MongoDB _id of the structure.

   A structure MUST have:

       code < 0
========================================================= */

exports.getStructure =
async function (
    id
) {

    if (!isValidObjectId(id)) {

        return null;

    }


    const structure =
        await Dairy.findOne({

            _id:
                id,

            code:
                {
                    $lt: 0
                }

        });


    if (!structure) {

        return null;

    }


    /*
     * The structure relationship is based on the
     * structure's NEGATIVE code.
     *
     * Example:
     *
     * structure.code = -10
     *
     * assets belonging to it:
     *
     * assetCode = -10
     */

    const assets =
        await Dairy.find({

            assetCode:
                structure.code

        })

        .sort({

            assetStatus:
                1,

            currentWorth:
                -1,

            name:
                1

        });


    /*
     * Calculate the current value of assets assigned
     * to this structure.
     *
     * Only active assets contribute.
     */

    const result =
        await Dairy.aggregate([

            {

                $match: {

                    assetCode:
                        structure.code,

                    assetStatus:
                        "active"

                }

            },

            {

                $group: {

                    _id:
                        null,

                    totalCurrentWorth: {

                        $sum:
                            "$currentWorth"

                    }

                }

            }

        ]);


    const totalCurrentWorth =
        result.length

            ? Number(
                result[0].totalCurrentWorth || 0
            )

            : 0;


    return {

        structure,

        assets,

        totalCurrentWorth

    };

};


/* =========================================================
   ADD MANUAL ASSET

   POST /networth/structure/:id/add

   MANUAL ASSET RULE:

       code = null

   NEVER:

       code = 0

   STRUCTURE RULE:

       assetCode = negative code of parent structure

   The client does NOT determine assetCode.
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

        const error =
            new Error(
                "Invalid Dairy Farm."
            );

        error.status =
            400;

        throw error;

    }


    /*
     * Resolve the parent structure from MongoDB.
     */

    const structure =
        await Dairy.findOne({

            _id:
                structureId,

            code:
                {
                    $lt: 0
                }

        });


    if (!structure) {

        const error =
            new Error(
                "Dairy Farm not found."
            );

        error.status =
            404;

        throw error;

    }


    /*
     * IMPORTANT:
     *
     * We deliberately do NOT accept:
     *
     *     data.assetCode
     *
     *     data.code
     *
     * from the browser.
     *
     * The system determines both values.
     *
     * Manual asset:
     *
     *     code = null
     *
     * Parent:
     *
     *     assetCode = structure.code
     */

    const asset =
        new Dairy({

            code:
                null,

            name:
                normalizeString(
                    data.item
                ),

            assetType:
                normalizeString(
                    data.type
                ),

            buyingPrice:
                normalizeNumber(
                    data.buyingPrice
                ),

            currentWorth:
                normalizeNumber(
                    data.currentWorth
                ),

            assetDescription:
                normalizeString(
                    data.description
                ),

            condition:
                normalizeString(
                    data.condition
                ),

            location:
                normalizeString(
                    data.location
                ),

            assetCode:
                structure.code,

            assetStatus:
                "active",

            assetSource:
                "asset"

        });


    /*
     * Save through the normal Mongoose lifecycle so
     * schema validation and middleware remain authoritative.
     */

    await asset.save();


    return asset;

};


/* =========================================================
   GET ASSET

   Any Dairy record that participates in Net Worth can
   be displayed here.

   The record can be:

       code > 0     identified dairy
       code < 0     structure
       code null    manual asset
========================================================= */

exports.getAsset =
async function (
    id
) {

    if (!isValidObjectId(id)) {

        return null;

    }


    const dairy =
        await Dairy.findById(
            id
        );


    if (!dairy) {

        return null;

    }


    /*
     * Structures cannot be assigned to another structure.
     *
     * For positive-code records and manual assets,
     * structures are available for display/assignment
     * where appropriate.
     */

    const structures =
        await Dairy.find({

            code:
                {
                    $lt: 0
                }

        })

        .sort({

            code:
                1

        });


    /*
     * Resolve the parent structure, if the record has
     * an assetCode.
     *
     * assetCode is the structure's negative code.
     */

    let parentStructure =
        null;


    if (
        dairy.assetCode !== null &&
        dairy.assetCode !== undefined
    ) {

        parentStructure =
            await Dairy.findOne({

                code:
                    dairy.assetCode,

                code:
                    {
                        $lt: 0
                    }

            });

    }


    return {

        dairy,

        structures,

        parentStructure

    };

};


/* =========================================================
   UPDATE ASSET

   Important distinction:

   1. Positive-code Dairy records:
        normal asset fields may be updated.
        assetCode may be changed to another structure.

   2. Manual assets:
        code remains null.
        Their assetCode is NOT changed through this form.

   3. Structures:
        assetCode is always null.
        They cannot be assigned to another structure.
========================================================= */

exports.updateAsset =
async function (
    id,
    data
) {

    if (!isValidObjectId(id)) {

        return null;

    }


    const dairy =
        await Dairy.findById(
            id
        );


    if (!dairy) {

        return null;

    }


    /* -----------------------------------------------------
       BASIC ASSET FIELDS
    ----------------------------------------------------- */

    if (
        data.item !== undefined
    ) {

        dairy.name =
            normalizeString(
                data.item
            );

    }


    if (
        data.type !== undefined
    ) {

        dairy.assetType =
            normalizeString(
                data.type
            );

    }


    if (
        data.buyingPrice !== undefined
    ) {

        dairy.buyingPrice =
            normalizeNumber(
                data.buyingPrice
            );

    }


    if (
        data.currentWorth !== undefined
    ) {

        dairy.currentWorth =
            normalizeNumber(
                data.currentWorth
            );

    }


    if (
        data.description !== undefined
    ) {

        dairy.assetDescription =
            normalizeString(
                data.description
            );

    }


    if (
        data.condition !== undefined
    ) {

        dairy.condition =
            normalizeString(
                data.condition
            );

    }


    if (
        data.location !== undefined
    ) {

        dairy.location =
            normalizeString(
                data.location
            );

    }


    /* -----------------------------------------------------
       STATUS
       
       Frontend calls this field "status".
       Schema calls it "assetStatus".
    ----------------------------------------------------- */

    if (
        data.status !== undefined
    ) {

        const status =
            normalizeString(
                data.status
            );


        if (
            [
                "active",
                "sold",
                "disposed",
                "inactive"
            ].includes(status)
        ) {

            dairy.assetStatus =
                status;

        }

        else {

            const error =
                new Error(
                    "Invalid asset status."
                );

            error.name =
                "ValidationError";

            throw error;

        }

    }


    /* -----------------------------------------------------
       VALUATION DATE
    ----------------------------------------------------- */

    if (
        data.valuationDate !== undefined
    ) {

        if (
            data.valuationDate === ""
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

                const error =
                    new Error(
                        "Invalid valuation date."
                    );

                error.name =
                    "ValidationError";

                throw error;

            }


            dairy.valuationDate =
                valuationDate;

        }

    }


    /* -----------------------------------------------------
       STRUCTURE ASSIGNMENT
       
       ONLY POSITIVE-CODE DAIRY RECORDS MAY CHANGE
       THEIR STRUCTURE ASSIGNMENT THROUGH THIS FORM.
    ----------------------------------------------------- */

    if (
        dairy.code !== null &&
        dairy.code > 0
    ) {

        /*
         * Empty selection means standalone.
         */

        if (
            data.assetCode === undefined ||
            data.assetCode === null ||
            data.assetCode === ""
        ) {

            dairy.assetCode =
                null;

        }

        else {

            const requestedStructureCode =
                Number(
                    data.assetCode
                );


            if (
                !Number.isInteger(
                    requestedStructureCode
                ) ||
                requestedStructureCode >= 0
            ) {

                const error =
                    new Error(
                        "Invalid Dairy Farm assignment."
                    );

                error.name =
                    "ValidationError";

                throw error;

            }


            /*
             * Never trust the submitted negative code
             * by itself.
             *
             * Verify that a real structure with that
             * code exists.
             */

            const structure =
                await Dairy.findOne({

                    code:
                        requestedStructureCode,

                    code:
                        {
                            $lt: 0
                        }

                });


            if (!structure) {

                const error =
                    new Error(
                        "Dairy Farm not found."
                    );

                error.name =
                    "ValidationError";

                throw error;

            }


            dairy.assetCode =
                structure.code;

        }

    }


    /* -----------------------------------------------------
       MANUAL ASSETS
       
       code MUST remain null.
       
       Existing assetCode is authoritative and is not
       replaced by arbitrary client input.
    ----------------------------------------------------- */

    else if (
        dairy.code === null
    ) {

        /*
         * Do not allow the browser to manufacture or
         * alter the structure relationship for a manual
         * asset through this update operation.
         *
         * Its assetCode remains whatever was established
         * when the manual asset was created.
         */

    }


    /* -----------------------------------------------------
       STRUCTURES
       
       A structure cannot belong to another structure.
    ----------------------------------------------------- */

    else if (
        dairy.code < 0
    ) {

        dairy.assetCode =
            null;

    }


    await dairy.save();


    return dairy;

};


/* =========================================================
   GET ACTIVE ASSETS
========================================================= */

exports.getActiveAssets =
async function () {

    return Dairy.find({

        assetStatus:
            "active"

    })

    .sort({

        currentWorth:
            -1,

        name:
            1

    });

};


/* =========================================================
   GET STRUCTURE ASSETS
========================================================= */

exports.getStructureAssets =
async function (
    structureCode
) {

    const code =
        Number(
            structureCode
        );


    if (
        !Number.isInteger(code) ||
        code >= 0
    ) {

        return [];

    }


    return Dairy.find({

        assetCode:
            code

    })

    .sort({

        currentWorth:
            -1,

        name:
            1

    });

};