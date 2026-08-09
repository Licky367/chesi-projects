// ==========================================================
// services/networthService.js
// ==========================================================

const mongoose =
    require("mongoose");

const Dairy =
    require("../models/dairy");


// ==========================================================
// CONSTANTS
// ==========================================================

const DAIRY_BREEDS =
    Dairy.DAIRY_BREEDS || [

        "Ayrshire",

        "Brown Swiss",

        "Friesian",

        "Holstein",

        "Guernsey",

        "Jersey",

        "Sahiwal",

        "Boran",

        "Ankole",

        "Fleckvieh",

        "Simmental",

        "Crossbreed",

        "Other"

    ];


const DAIRY_STATUSES =
    Dairy.DAIRY_STATUSES || [

        "active",

        "sold",

        "disposed",

        "inactive"

    ];


// ==========================================================
// HELPERS
// ==========================================================


// ==========================================================
// VALID OBJECT ID
// ==========================================================

function isValidObjectId(id) {

    return mongoose.Types.ObjectId.isValid(id);

}


// ==========================================================
// CREATE ERROR
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
// NUMBER
// ==========================================================

function toNumber(value) {

    const number =
        Number(value);

    return Number.isFinite(number)

        ? number

        : 0;

}


// ==========================================================
// OPTIONAL MONEY
//
// IMPORTANT:
//
// This function does NOT force a field to be
// entered.
//
// Empty input means:
//
//     leave the existing value unchanged
//
// during UPDATE.
//
// For CREATE, the model defaults the value
// to 0 when it is not supplied.
// ==========================================================

function parseMoneyIfProvided(
    value,
    fieldName
) {

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {

        return undefined;

    }


    const number =
        Number(value);


    if (
        !Number.isFinite(number) ||
        number < 0
    ) {

        throw createError(

            `${fieldName} must be a valid non-negative number.`,

            400

        );

    }


    return number;

}


// ==========================================================
// OPTIONAL DATE
//
// undefined
//     field was not submitted
//
// null / ""
//     explicitly clear the field
//
// valid value
//     save date
// ==========================================================

function parseDateIfProvided(
    value,
    fieldName
) {

    if (
        value === undefined
    ) {

        return undefined;

    }


    if (
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

        throw createError(

            `${fieldName} is invalid.`,

            400

        );

    }


    return date;

}


// ==========================================================
// AGE CALCULATION
//
// AGE IS NEVER STORED.
//
// It is calculated from dateOfBirth every time
// the record is displayed.
// ==========================================================

function calculateAge(
    dateOfBirth
) {

    if (!dateOfBirth) {

        return null;

    }


    const dob =
        new Date(dateOfBirth);


    if (
        Number.isNaN(
            dob.getTime()
        )
    ) {

        return null;

    }


    const today =
        new Date();


    if (
        dob > today
    ) {

        return null;

    }


    let years =
        today.getFullYear() -
        dob.getFullYear();


    let months =
        today.getMonth() -
        dob.getMonth();


    let days =
        today.getDate() -
        dob.getDate();


    if (days < 0) {

        months--;


        const previousMonth =
            new Date(

                today.getFullYear(),

                today.getMonth(),

                0

            );


        days +=
            previousMonth.getDate();

    }


    if (months < 0) {

        years--;

        months += 12;

    }


    return {

        years,

        months,

        days,

        text:
            `${years} years, ` +
            `${months} months, ` +
            `${days} days`

    };

}


// ==========================================================
// SERIALIZE DOCUMENT
//
// This is important.
//
// It ensures the EJS templates receive:
// 
//     ageText
//     ageYears
//     gender
//     isFemale
//     hasIdentity
//     isStructure
//     isManualAsset
//     isStandaloneAsset
//     isAssignedAsset
//     displayImage
//     etc.
//
// even when we need database queries.
// ==========================================================

function serializeDairy(
    dairy
) {

    if (!dairy) {

        return null;

    }


    /*
     * If this is a Mongoose document,
     * use toObject with virtuals.
     */

    if (
        typeof dairy.toObject === "function"
    ) {

        return dairy.toObject({

            virtuals: true

        });

    }


    /*
     * If it is already a plain object,
     * calculate the important display values
     * ourselves.
     */

    const data = {

        ...dairy

    };


    const age =
        calculateAge(
            data.dateOfBirth
        );


    data.ageText =
        age
            ? age.text
            : "";


    data.ageYears =
        age
            ? age.years
            : null;


    data.hasIdentity =
        data.code !== null &&
        data.code !== undefined &&
        Number(data.code) > 0;


    data.isStructure =
        data.code !== null &&
        data.code !== undefined &&
        Number(data.code) < 0;


    data.isManualAsset =
        data.code === null ||
        data.code === undefined;


    data.isStandaloneAsset =
        data.code !== null &&
        data.code !== undefined &&
        Number(data.code) > 0 &&
        (
            data.assetCode === null ||
            data.assetCode === undefined
        );


    data.isAssignedAsset =
        data.assetCode !== null &&
        data.assetCode !== undefined;


    data.isFemale =
        data.code !== null &&
        data.code !== undefined &&
        Number(data.code) > 0 &&
        Number(data.code) % 2 === 0;


    if (
        data.code !== null &&
        data.code !== undefined &&
        Number(data.code) > 0
    ) {

        data.gender =
            Number(data.code) % 2 === 0

                ? "Female"

                : "Male";

    } else {

        data.gender = null;

    }


    data.isMilkingText =
        data.isMilking
            ? "Yes"
            : "No";


    data.requiresMaintenance =
        !!data.needsMaintenance;


    data.needsMedicalAttention =
        !!(
            data.medicalAttention &&
            data.medicalAttention.isMarked
        );


    data.assetValue =
        Number(
            data.currentWorth
        ) || 0;


    data.isActiveAsset =
        data.status === "active";


    /*
     * Display image.
     */

    if (!data.profileImage) {

        data.displayImage =

            `https://ui-avatars.com/api/?name=` +

            `${encodeURIComponent(

                data.name || "Dairy"

            )}`;

    } else if (

        /^https?:\/\//i.test(
            data.profileImage
        )

    ) {

        data.displayImage =
            data.profileImage;

    } else if (

        data.profileImage.startsWith("/")

    ) {

        data.displayImage =
            data.profileImage;

    } else {

        data.displayImage =
            `/uploads/${data.profileImage}`;

    }


    return data;

}


// ==========================================================
// SERIALIZE ARRAY
// ==========================================================

function serializeDairyArray(
    dairies
) {

    return dairies.map(
        serializeDairy
    );

}


// ==========================================================
// RECORD TYPE HELPERS
// ==========================================================


// ==========================================================
// DAIRY FARM / STRUCTURE
//
// code < 0
// ==========================================================

function isDairyFarm(
    record
) {

    if (!record) {

        return false;

    }


    if (
        record.code === null ||
        record.code === undefined
    ) {

        return false;

    }


    return (
        Number(record.code) < 0
    );

}


// ==========================================================
// IDENTIFIED ANIMAL
//
// code > 0
// ==========================================================

function isIdentifiedDairy(
    record
) {

    if (!record) {

        return false;

    }


    if (
        record.code === null ||
        record.code === undefined
    ) {

        return false;

    }


    return (
        Number(record.code) > 0
    );

}


// ==========================================================
// MANUAL ASSET
//
// code === null
// AND
// assetCode exists
// ==========================================================

function isManualAsset(
    record
) {

    if (!record) {

        return false;

    }


    const noCode =

        record.code === null ||
        record.code === undefined;


    const hasParent =

        record.assetCode !== null &&
        record.assetCode !== undefined;


    return (

        noCode &&
        hasParent

    );

}


// ==========================================================
// STANDALONE IDENTIFIED ANIMAL
// ==========================================================

function isStandaloneAsset(
    record
) {

    if (
        !isIdentifiedDairy(record)
    ) {

        return false;

    }


    return (

        record.assetCode === null ||
        record.assetCode === undefined

    );

}


// ==========================================================
// FIND DAIRY FARM BY ID
// ==========================================================

async function findDairyFarmById(
    id
) {

    if (
        !isValidObjectId(id)
    ) {

        throw createError(

            "Invalid Dairy Farm id.",

            400

        );

    }


    const dairy =
        await Dairy.findById(id);


    if (!dairy) {

        throw createError(

            "Dairy Farm not found.",

            404

        );

    }


    if (
        !isDairyFarm(dairy)
    ) {

        throw createError(

            "The selected record is not a Dairy Farm.",

            404

        );

    }


    return dairy;

}


// ==========================================================
// FIND DAIRY FARM BY CODE
// ==========================================================

async function findDairyFarmByCode(
    code
) {

    const numericCode =
        Number(code);


    if (
        !Number.isFinite(numericCode) ||
        numericCode >= 0
    ) {

        throw createError(

            "Invalid Dairy Farm code.",

            400

        );

    }


    const farm =
        await Dairy.findOne({

            code: numericCode,

            assetCode: null

        });


    if (!farm) {

        throw createError(

            "Selected Dairy Farm was not found.",

            404

        );

    }


    if (
        !isDairyFarm(farm)
    ) {

        throw createError(

            "The selected record is not a Dairy Farm.",

            400

        );

    }


    return farm;

}


// ==========================================================
// GET ALL DAIRY FARMS
// ==========================================================

async function getDairyFarms() {

    const structures =
        await Dairy
            .find({

                code: {
                    $lt: 0
                },

                assetCode: null

            })
            .sort({

                name: 1

            });


    return serializeDairyArray(
        structures
    );

}


// ==========================================================
// GET NET WORTH
// ==========================================================

async function getNetWorth() {

    const allDairy =
        await Dairy
            .find({})
            .sort({

                name: 1

            });


    /*
     * Convert documents with virtuals.
     */

    const records =
        serializeDairyArray(
            allDairy
        );


    // ======================================================
    // STANDALONE IDENTIFIED ASSETS
    // ======================================================

    const standaloneAssets =
        records.filter(
            function(dairy) {

                return isStandaloneAsset(
                    dairy
                );

            }
        );


    // ======================================================
    // DAIRY FARMS
    // ======================================================

    const structures =
        records.filter(
            function(dairy) {

                return isDairyFarm(
                    dairy
                );

            }
        );


    // ======================================================
    // TOTAL NET WORTH
    //
    // Only ACTIVE records contribute.
    // ======================================================

    const totalNetWorth =
        records.reduce(

            function(
                total,
                dairy
            ) {

                if (
                    dairy.status !== "active"
                ) {

                    return total;

                }


                return (

                    total +

                    toNumber(
                        dairy.currentWorth
                    )

                );

            },

            0

        );


    return {

        totalNetWorth,

        standaloneAssets,

        structures

    };

}


// ==========================================================
// GET DAIRY FARM
// ==========================================================

async function getDairyFarm(
    id
) {

    const dairy =
        await findDairyFarmById(
            id
        );


    const farmCode =
        Number(dairy.code);


    const assets =
        await Dairy
            .find({

                assetCode: farmCode

            })
            .sort({

                name: 1

            });


    const serializedFarm =
        serializeDairy(
            dairy
        );


    const serializedAssets =
        serializeDairyArray(
            assets
        );


    // ======================================================
    // FARM ASSET TOTAL
    // ======================================================

    const dairyTotal =
        serializedAssets.reduce(

            function(
                total,
                asset
            ) {

                if (
                    asset.status !== "active"
                ) {

                    return total;

                }


                return (

                    total +

                    toNumber(
                        asset.currentWorth
                    )

                );

            },

            0

        );


    return {

        dairy:
            serializedFarm,

        assets:
            serializedAssets,

        dairyTotal

    };

}


// ==========================================================
// GET ADD ASSET PAGE
// ==========================================================

async function getAddAsset(
    id
) {

    const dairy =
        await findDairyFarmById(
            id
        );


    const structures =
        await getDairyFarms();


    return {

        dairy:
            serializeDairy(
                dairy
            ),

        structures,

        dairyBreeds:
            DAIRY_BREEDS

    };

}


// ==========================================================
// ADD MANUAL ASSET
// ==========================================================

async function addAsset(
    id,
    body = {}
) {

    const dairy =
        await findDairyFarmById(
            id
        );


    const farmCode =
        Number(dairy.code);


    // ======================================================
    // NAME
    //
    // Name is the only universally required asset field.
    // ======================================================

    const name =
        String(
            body.name ||
            body.item ||
            ""
        ).trim();


    if (!name) {

        throw createError(

            "Name is required.",

            400

        );

    }


    // ======================================================
    // OPTIONAL TYPE
    // ======================================================

    const type =
        body.type !== undefined

            ? String(
                body.type
            ).trim()

            : "";


    // ======================================================
    // OPTIONAL TEXT FIELDS
    // ======================================================

    const description =
        body.description !== undefined

            ? String(
                body.description
            ).trim()

            : "";


    const condition =
        body.condition !== undefined

            ? String(
                body.condition
            ).trim()

            : "";


    const location =
        body.location !== undefined

            ? String(
                body.location
            ).trim()

            : "";


    // ======================================================
    // OPTIONAL MONEY
    // ======================================================

    const buyingPrice =
        parseMoneyIfProvided(

            body.buyingPrice,

            "Buying Price"

        );


    const currentWorth =
        parseMoneyIfProvided(

            body.currentWorth,

            "Current Worth"

        );


    // ======================================================
    // OPTIONAL STATUS
    // ======================================================

    const status =
        body.status !== undefined &&
        String(body.status).trim() !== ""

            ? String(
                body.status
            ).trim()

            : "active";


    if (
        !DAIRY_STATUSES.includes(
            status
        )
    ) {

        throw createError(

            "Invalid asset status.",

            400

        );

    }


    // ======================================================
    // PROFILE IMAGE
    // ======================================================

    const profileImage =
        body.profileImage !== undefined

            ? String(
                body.profileImage
            ).trim()

            : "";


    // ======================================================
    // CREATE MANUAL ASSET
    // ======================================================

    const assetData = {

        profileImage,

        name,

        type,

        description,

        condition,

        location,

        /*
         * MANUAL ASSET
         */
        code: null,

        /*
         * Parent Dairy Farm.
         */
        assetCode:
            farmCode,

        status

    };


    /*
     * Only include monetary values when supplied.
     *
     * Otherwise the model's default of 0 is used.
     */

    if (
        buyingPrice !== undefined
    ) {

        assetData.buyingPrice =
            buyingPrice;

    }


    if (
        currentWorth !== undefined
    ) {

        assetData.currentWorth =
            currentWorth;

    }


    const asset =
        new Dairy(
            assetData
        );


    await asset.save();


    return serializeDairy(
        asset
    );

}


// ==========================================================
// GET ASSET / EDIT PAGE
// ==========================================================
//
// This is the important part for the edit page.
//
// The page receives:
//
//     dairy
//     structures
//     age
//     dairyBreeds
//
// No field is artificially made required here.
//
// ==========================================================

async function getAsset(
    id
) {

    if (
        !isValidObjectId(id)
    ) {

        throw createError(

            "Invalid asset id.",

            400

        );

    }


    const dairy =
        await Dairy.findById(id);


    if (!dairy) {

        throw createError(

            "Asset not found.",

            404

        );

    }


    // ======================================================
    // DAIRY FARM CANNOT BE EDITED AS AN ASSET
    // ======================================================

    if (
        isDairyFarm(dairy)
    ) {

        throw createError(

            "The selected record is a Dairy Farm, not an asset.",

            400

        );

    }


    // ======================================================
    // RECORD TYPE
    // ======================================================

    const identified =
        isIdentifiedDairy(
            dairy
        );


    const manual =
        isManualAsset(
            dairy
        );


    if (
        !identified &&
        !manual
    ) {

        throw createError(

            "The selected record is not a valid asset.",

            400

        );

    }


    // ======================================================
    // CALCULATED AGE
    //
    // Never read age from req.body.
    //
    // Never store age.
    //
    // Always calculate it from DOB.
    // ======================================================

    const age =
        calculateAge(
            dairy.dateOfBirth
        );


    // ======================================================
    // DAIRY FARMS
    // ======================================================

    const structures =
        await getDairyFarms();


    // ======================================================
    // RETURN COMPLETE EDIT DATA
    // ======================================================

    return {

        /*
         * Complete record.
         *
         * This contains the existing values,
         * including empty values from MongoDB.
         */
        dairy:
            serializeDairy(
                dairy
            ),

        /*
         * Available Dairy Farms.
         */
        structures,

        /*
         * Calculated age.
         */
        age,

        /*
         * Breed options for identified animals.
         */
        dairyBreeds:
            DAIRY_BREEDS,

        /*
         * Useful flags for EJS.
         */
        isIdentified:
            identified,

        isManual:
            manual

    };

}


// ==========================================================
// UPDATE ASSET
// ==========================================================
//
// IMPORTANT RULE:
//
// Only fields actually submitted by the edit form
// are changed.
//
// Missing fields are NOT replaced.
//
// Empty optional fields are allowed.
//
// The service does NOT require:
//
//     type
//     description
//     condition
//     location
//     buyingPrice
//     currentWorth
//     valuationDate
//
// unless the submitted value itself is invalid.
//
// ==========================================================

async function updateAsset(
    id,
    body = {}
) {

    if (
        !isValidObjectId(id)
    ) {

        throw createError(

            "Invalid asset id.",

            400

        );

    }


    const dairy =
        await Dairy.findById(id);


    if (!dairy) {

        throw createError(

            "Asset not found.",

            404

        );

    }


    // ======================================================
    // NEVER EDIT A DAIRY FARM THROUGH THIS ENDPOINT
    // ======================================================

    if (
        isDairyFarm(dairy)
    ) {

        throw createError(

            "A Dairy Farm cannot be edited as an asset.",

            400

        );

    }


    // ======================================================
    // RECORD TYPE
    // ======================================================

    const identified =
        isIdentifiedDairy(
            dairy
        );


    const manual =
        isManualAsset(
            dairy
        );


    if (
        !identified &&
        !manual
    ) {

        throw createError(

            "The selected record is not a valid asset.",

            400

        );

    }


    // ======================================================
    // NEVER ACCEPT CODE FROM THE FORM
    // ======================================================
    //
    // We intentionally do nothing with:
    //
    //     body.code
    //
    // The database identity remains untouched.
    // ======================================================


    // ======================================================
    // PROFILE IMAGE
    // ======================================================

    if (
        body.profileImage !== undefined
    ) {

        dairy.profileImage =
            String(
                body.profileImage
            ).trim();

    }


    // ======================================================
    // NAME
    //
    // Name is required by the model.
    //
    // Therefore:
    //
    // - missing name -> preserve existing name
    // - non-empty supplied name -> update
    // - empty supplied name -> reject
    // ======================================================

    if (
        body.name !== undefined
    ) {

        const name =
            String(
                body.name
            ).trim();


        if (!name) {

            throw createError(

                "Name cannot be empty.",

                400

            );

        }


        dairy.name =
            name;

    }


    // ======================================================
    // TYPE / BREED
    //
    // NOT REQUIRED.
    //
    // Empty type is valid.
    //
    // For identified animals, a NON-EMPTY supplied
    // value must be one of the allowed breeds.
    // ======================================================

    if (
        body.type !== undefined
    ) {

        const type =
            String(
                body.type
            ).trim();


        if (
            identified &&
            type &&
            !DAIRY_BREEDS.includes(
                type
            )
        ) {

            throw createError(

                "Invalid dairy breed.",

                400

            );

        }


        dairy.type =
            type;

    }


    // ======================================================
    // DATE OF BIRTH
    //
    // ONLY IDENTIFIED ANIMALS.
    //
    // Because the model requires DOB for code > 0,
    // an identified animal cannot be saved with an
    // empty DOB.
    //
    // However, the service does NOT require the user
    // to submit DOB on every edit.
    //
    // If DOB is omitted:
    //
    //     existing DOB remains untouched.
    //
    // ======================================================

    if (
        identified &&
        body.dateOfBirth !== undefined
    ) {

        const dateOfBirth =
            parseDateIfProvided(

                body.dateOfBirth,

                "Date of Birth"

            );


        if (
            dateOfBirth === null
        ) {

            throw createError(

                "Date of Birth is required for an identified dairy animal.",

                400

            );

        }


        dairy.dateOfBirth =
            dateOfBirth;

    }


    // ======================================================
    // MASS
    //
    // Optional.
    // ======================================================

    if (
        body.mass !== undefined
    ) {

        if (
            body.mass === ""
        ) {

            dairy.mass = 0;

        } else {

            const mass =
                Number(
                    body.mass
                );


            if (
                !Number.isFinite(mass) ||
                mass < 0
            ) {

                throw createError(

                    "Mass must be a valid non-negative number.",

                    400

                );

            }


            dairy.mass =
                mass;

        }

    }


    // ======================================================
    // MILKING
    //
    // Only identified female animals can milk.
    // ======================================================

    if (
        identified &&
        body.isMilking !== undefined
    ) {

        const isMilking =
            body.isMilking === true ||
            body.isMilking === "true" ||
            body.isMilking === "1" ||
            body.isMilking === "on";


        if (
            isMilking &&
            !dairy.isFemale
        ) {

            throw createError(

                "Only female animals can be marked as milking.",

                400

            );

        }


        dairy.isMilking =
            isMilking;

    }


    // ======================================================
    // BUYING PRICE
    //
    // OPTIONAL.
    // ======================================================

    if (
        body.buyingPrice !== undefined
    ) {

        const buyingPrice =
            parseMoneyIfProvided(

                body.buyingPrice,

                "Buying Price"

            );


        /*
         * Empty input means explicitly set
         * the numeric value to 0.
         */

        if (
            buyingPrice === undefined
        ) {

            dairy.buyingPrice =
                0;

        } else {

            dairy.buyingPrice =
                buyingPrice;

        }

    }


    // ======================================================
    // CURRENT WORTH
    //
    // OPTIONAL.
    // ======================================================

    if (
        body.currentWorth !== undefined
    ) {

        const currentWorth =
            parseMoneyIfProvided(

                body.currentWorth,

                "Current Worth"

            );


        if (
            currentWorth === undefined
        ) {

            dairy.currentWorth =
                0;

        } else {

            dairy.currentWorth =
                currentWorth;

        }

    }


    // ======================================================
    // DESCRIPTION
    // ======================================================

    if (
        body.description !== undefined
    ) {

        dairy.description =
            String(
                body.description
            ).trim();

    }


    // ======================================================
    // CONDITION
    // ======================================================

    if (
        body.condition !== undefined
    ) {

        dairy.condition =
            String(
                body.condition
            ).trim();

    }


    // ======================================================
    // LOCATION
    // ======================================================

    if (
        body.location !== undefined
    ) {

        dairy.location =
            String(
                body.location
            ).trim();

    }


    // ======================================================
    // STATUS
    // ======================================================

    if (
        body.status !== undefined
    ) {

        const status =
            String(
                body.status
            ).trim();


        if (
            !DAIRY_STATUSES.includes(
                status
            )
        ) {

            throw createError(

                "Invalid asset status.",

                400

            );

        }


        dairy.status =
            status;

    }


    // ======================================================
    // ACQUISITION DATE
    // ======================================================

    if (
        body.acquisitionDate !== undefined
    ) {

        dairy.acquisitionDate =
            parseDateIfProvided(

                body.acquisitionDate,

                "Acquisition Date"

            );

    }


    // ======================================================
    // VALUATION DATE
    // ======================================================

    if (
        body.valuationDate !== undefined
    ) {

        dairy.valuationDate =
            parseDateIfProvided(

                body.valuationDate,

                "Valuation Date"

            );

    }


    // ======================================================
    // ASSET LOCATION / PARENT
    // ======================================================
    //
    // MANUAL ASSET
    //
    // code === null
    //
    // Must ALWAYS have a negative parent code.
    // ======================================================

    if (
        manual
    ) {

        if (
            body.assetCode !== undefined
        ) {

            if (
                body.assetCode === null ||
                body.assetCode === ""
            ) {

                throw createError(

                    "A manual asset must belong to a Dairy Farm.",

                    400

                );

            }


            const farm =
                await findDairyFarmByCode(
                    body.assetCode
                );


            dairy.assetCode =
                Number(
                    farm.code
                );

        }


        /*
         * Never allow a manual asset to become
         * detached.
         */

        if (
            dairy.assetCode === null ||
            dairy.assetCode === undefined
        ) {

            throw createError(

                "A manual asset must belong to a Dairy Farm.",

                400

            );

        }

    }


    // ======================================================
    // IDENTIFIED ANIMAL LOCATION
    //
    // Can be:
    //
    //     null
    //         standalone
    //
    //     negative code
    //         assigned to farm
    // ======================================================

    if (
        identified &&
        body.assetCode !== undefined
    ) {

        if (
            body.assetCode === null ||
            body.assetCode === ""
        ) {

            dairy.assetCode =
                null;

        } else {

            const farm =
                await findDairyFarmByCode(
                    body.assetCode
                );


            dairy.assetCode =
                Number(
                    farm.code
                );

        }

    }


    // ======================================================
    // SAVE
    // ======================================================

    await dairy.save();


    // ======================================================
    // RETURN COMPLETE UPDATED RECORD
    //
    // Includes virtuals and calculated age.
    // ======================================================

    return serializeDairy(
        dairy
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

    getDairyFarms,

    DAIRY_BREEDS,

    DAIRY_STATUSES,

    calculateAge

};