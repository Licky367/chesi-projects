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


function hasValue(value) {

    return (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
    );

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
   DETERMINE DAIRY ASSET TYPE
=========================================================

   Positive code:
       cow

   Negative code:
       dairy Facility

   No code:
       asset

========================================================= */

function getDairyAssetType(code) {

    if (
        code === undefined ||
        code === null ||
        String(code).trim() === ""
    ) {

        return "asset";

    }


    const numericCode =
        Number(code);


    if (
        !Number.isFinite(
            numericCode
        )
    ) {

        return "asset";

    }


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

   A structure is a Dairy record with a negative code.

========================================================= */

async function getStructureByCode(code) {

    if (!hasValue(code)) {

        return null;

    }


    const numericCode =
        Number(code);


    if (
        !Number.isInteger(
            numericCode
        ) ||
        numericCode >= 0
    ) {

        return null;

    }


    return Dairy.findOne({

        code:
            numericCode,

        status:
            "active"

    });

}


/* =========================================================
   GET NET WORTH OVERVIEW

   SOURCE OF TRUTH:
       Dairy

   ACTIVE RECORDS:
       contribute to net worth

   STRUCTURES:
       negative code

   STANDALONE ASSETS:
       records without an assetCode

   IMPORTANT:

   An asset does NOT need a Dairy code.

   Therefore:

       code = undefined
       code = null

   are both valid.

========================================================= */

exports.getNetWorthOverview =
async function () {

    /* -----------------------------------------------------
       ACTIVE DAIRY RECORDS
    ----------------------------------------------------- */

    const activeAssets =
        await Dairy.find({

            status:
                "active"

        })
        .sort({

            name:
                1

        });


    /* -----------------------------------------------------
       TOTAL NET WORTH
    ----------------------------------------------------- */

    const totalResult =
        await Dairy.aggregate([

            {

                $match: {

                    status:
                        "active"

                }

            },

            {

                $group: {

                    _id:
                        null,

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


    /* -----------------------------------------------------
       STRUCTURES

       Negative Dairy codes represent structures.
    ----------------------------------------------------- */

    const structures =
        activeAssets.filter(

            asset => {

                if (
                    !hasValue(
                        asset.code
                    )
                ) {

                    return false;

                }


                return (
                    Number(asset.code) < 0
                );

            }

        );


    /* -----------------------------------------------------
       STANDALONE ASSETS

       An asset is standalone when it does not have an
       assetCode.

       The asset may have:
           - positive code
           - no code
           - code 0

       None of those determine structure membership.

       assetCode determines membership.

    ----------------------------------------------------- */

    const standaloneAssets =
        activeAssets.filter(

            asset => {

                const hasStructure =
                    hasValue(
                        asset.assetCode
                    );


                return !hasStructure;

            }

        );


    return {

        totalNetWorth,

        standaloneAssets,

        structures

    };

};


/* =========================================================
   GET STRUCTURE BY ID

   STRUCTURE ID:
       Dairy._id

   STRUCTURE REQUIREMENT:
       code < 0

========================================================= */

exports.getStructureById =
async function (id) {

    if (!isValidObjectId(id)) {

        return null;

    }


    const structure =
        await Dairy.findOne({

            _id:
                id,

            code: {
                $lt:
                    0
            },

            status:
                "active"

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

   IMPORTANT:

   Child assets do NOT need to have their own `code`.

========================================================= */

exports.getStructureDetails =
async function (id) {

    if (!isValidObjectId(id)) {

        return null;

    }


    /* -----------------------------------------------------
       FIND STRUCTURE
    ----------------------------------------------------- */

    const structure =
        await Dairy.findOne({

            _id:
                id,

            code: {
                $lt:
                    0
            },

            status:
                "active"

        });


    if (!structure) {

        return null;

    }


    const structureCode =
        Number(
            structure.code
        );


    /* -----------------------------------------------------
       FIND CHILD ASSETS
    ----------------------------------------------------- */

    const assets =
        await Dairy.find({

            assetCode:
                structureCode,

            status:
                "active"

        })
        .sort({

            name:
                1

        });


    /* -----------------------------------------------------
       STRUCTURE ASSET TOTAL
    ----------------------------------------------------- */

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

                    _id:
                        null,

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

   `id` is ALWAYS:

       Dairy._id

   There is no NetWorth ID.

========================================================= */

exports.getAssetDetails =
async function (id) {

    if (!isValidObjectId(id)) {

        return null;

    }


    /* -----------------------------------------------------
       FIND DAIRY ASSET
    ----------------------------------------------------- */

    const asset =
        await Dairy.findById(
            id
        );


    if (!asset) {

        return null;

    }


    /* -----------------------------------------------------
       RESOLVE STRUCTURE

       Structure relationship is determined ONLY by:

           asset.assetCode

       The asset itself does NOT need a code.

    ----------------------------------------------------- */

    let structure =
        null;


    if (
        hasValue(
            asset.assetCode
        )
    ) {

        structure =
            await getStructureByCode(
                asset.assetCode
            );

    }


    /* -----------------------------------------------------
       GET AVAILABLE STRUCTURES
    ----------------------------------------------------- */

    const structures =
        await Dairy.find({

            code: {
                $lt:
                    0
            },

            status:
                "active"

        })
        .select(

            "code name item"

        )
        .sort({

            code:
                1

        })
        .lean();


    return {

        asset,

        dairy:
            asset,

        structure,

        structures

    };

};


/* =========================================================
   UPDATE ASSET

   EVERYTHING IS SAVED DIRECTLY TO DAIRY.

   ID:
       Dairy._id

   IMPORTANT:

   `code` is editable.

   However:

       structure code < 0
           = structure

       asset code > 0
           = coded Dairy asset

       no code
           = uncoded asset

       code 0
           = explicitly coded zero, if the model allows it

   We do NOT automatically convert missing code to 0.

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


    /* -----------------------------------------------------
       FIND EXISTING DAIRY RECORD
    ----------------------------------------------------- */

    const asset =
        await Dairy.findById(
            id
        );


    if (!asset) {

        throw new Error(
            "Asset not found."
        );

    }


    /* =====================================================
       NAME
    ===================================================== */

    if (
        data.item !== undefined
    ) {

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
       CODE

       Code is editable.

       Empty value:
           removes the code.

       Positive:
           coded Dairy asset.

       Negative:
           structure.

       IMPORTANT:

       A negative code must not be assigned to an ordinary
       asset because negative codes identify structures.

    ===================================================== */

    if (
        data.code !== undefined
    ) {

        const rawCode =
            String(
                data.code
            ).trim();


        /* -------------------------------------------------
           REMOVE CODE
        ------------------------------------------------- */

        if (!rawCode) {

            /*
             * Do not force code = 0.
             *
             * Remove the field/value instead.
             */

            asset.code =
                undefined;

        }


        /* -------------------------------------------------
           SET CODE
        ------------------------------------------------- */

        else {

            const newCode =
                Number(
                    rawCode
                );


            if (
                !Number.isInteger(
                    newCode
                )
            ) {

                throw new Error(
                    "Dairy code must be a valid integer."
                );

            }


            /* ---------------------------------------------
               NEGATIVE CODE

               Negative codes identify structures.

               An asset currently being edited cannot simply
               become a structure while still having children
               or being assigned to another structure.
            --------------------------------------------- */

            if (
                newCode < 0
            ) {

                const existingChildren =
                    await Dairy.exists({

                        assetCode:
                            newCode

                    });


                if (existingChildren) {

                    throw new Error(
                        "This code already identifies a structure with assigned assets."
                    );

                }


                asset.assetCode =
                    null;

            }


            /* ---------------------------------------------
               POSITIVE CODE

               Positive codes identify Dairy assets.

               Prevent duplicate Dairy codes.
            --------------------------------------------- */

            else if (
                newCode > 0
            ) {

                const duplicate =
                    await Dairy.findOne({

                        code:
                            newCode,

                        _id: {
                            $ne:
                                asset._id
                        }

                    });


                if (duplicate) {

                    throw new Error(
                        "This Dairy code is already in use."
                    );

                }

            }


            /* ---------------------------------------------
               ZERO

               Explicit zero is permitted.

               It is NOT used automatically when code is
               missing.
            --------------------------------------------- */

            asset.code =
                newCode;

        }

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
                new Date(
                    rawDate
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


    /* =====================================================
       STRUCTURE ASSIGNMENT

       IMPORTANT:

       Structure assignment does NOT depend on whether
       the asset has a Dairy code.

       Any asset can belong to a structure.

       The relationship is:

           asset.assetCode = structure.code

    ===================================================== */

    if (
        data.assetCode !== undefined
    ) {

        const rawAssetCode =
            String(
                data.assetCode
            ).trim();


        /* -------------------------------------------------
           REMOVE STRUCTURE ASSIGNMENT
        ------------------------------------------------- */

        if (!rawAssetCode) {

            asset.assetCode =
                null;

        }


        /* -------------------------------------------------
           ASSIGN STRUCTURE
        ------------------------------------------------- */

        else {

            const selectedCode =
                Number(
                    rawAssetCode
                );


            if (
                !Number.isInteger(
                    selectedCode
                )
            ) {

                throw new Error(
                    "Selected structure is invalid."
                );

            }


            if (
                selectedCode >= 0
            ) {

                throw new Error(
                    "Selected structure must have a negative code."
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


    /* =====================================================
       STRUCTURE SAFETY

       If this record itself has a negative code, it is a
       structure and therefore cannot belong to another
       structure.

    ===================================================== */

    const finalCode =
        asset.code;


    if (
        hasValue(
            finalCode
        ) &&
        Number(finalCode) < 0
    ) {

        asset.assetCode =
            null;

    }


    /* =====================================================
       SAVE
    ===================================================== */

    await asset.save();


    return asset;

};


/* =========================================================
   ADD MANUAL ASSET TO STRUCTURE

   IMPORTANT:

   The new asset:

       - uses Dairy._id automatically
       - does NOT receive a forced `code`
       - receives assetCode = structure.code
       - is therefore immediately associated with the farm

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


    /* -----------------------------------------------------
       FIND STRUCTURE
    ----------------------------------------------------- */

    const structure =
        await Dairy.findOne({

            _id:
                structureId,

            code: {
                $lt:
                    0
            },

            status:
                "active"

        });


    if (!structure) {

        throw new Error(
            "Structure not found."
        );

    }


    /* =====================================================
       BASIC FIELDS
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


    /* =====================================================
       BUYING PRICE
    ===================================================== */

    const buyingPrice =
        toNumber(
            data.buyingPrice,
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
        buyingPrice < 0
    ) {

        throw new Error(
            "Buying price cannot be negative."
        );

    }


    /* =====================================================
       CURRENT WORTH
    ===================================================== */

    const currentWorth =
        toNumber(
            data.currentWorth,
            NaN
        );


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
        currentWorth < 0
    ) {

        throw new Error(
            "Current worth cannot be negative."
        );

    }


    /* =====================================================
       CREATE DAIRY RECORD

       DO NOT SET `code`.

       MongoDB/Mongoose will therefore leave it absent
       unless the schema itself supplies a default.

       The structure relationship is established through:

           assetCode = structure.code

    ===================================================== */

    const assetData = {

        name:
            item,

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

    };


    const asset =
        await Dairy.create(
            assetData
        );


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