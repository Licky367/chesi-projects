// ==========================================================
// services/addService.js
// ==========================================================

const Dairy =
    require("../models/dairy");


// ==========================================================
// BREEDS
// ==========================================================

const dairyBreeds = [

    "Friesian",

    "Ayrshire",

    "Jersey",

    "Guernsey",

    "Sahiwal",

    "Crossbreed",

    "Other"

];


// ==========================================================
// FARM TYPE
// ==========================================================

const farmTypes = [

    "ranch",

    "zeroGrazing",

    "semiZeroGrazing",

    "pastureBased",

    "mixedFarming",

    "cooperative",

    "other"

];


// ==========================================================
// GENERATE NEGATIVE FARM CODE
// ==========================================================

async function generateFarmCode() {

    const lastFarm =
        await Dairy
            .findOne({
                code: {
                    $lt: 0
                }
            })
            .sort({
                code: 1
            })
            .lean();


    if (
        !lastFarm ||
        typeof lastFarm.code !== "number"
    ) {

        return -1;

    }


    return (
        Number(lastFarm.code) -
        1
    );

}


// ==========================================================
// GENERATE POSITIVE ANIMAL CODE
// ==========================================================

async function generateAnimalCode() {

    const lastAnimal =
        await Dairy
            .findOne({
                code: {
                    $gt: 0
                }
            })
            .sort({
                code: -1
            })
            .lean();


    if (
        !lastAnimal ||
        typeof lastAnimal.code !== "number"
    ) {

        return 1;

    }


    return (
        Number(lastAnimal.code) +
        1
    );

}


// ==========================================================
// CREATE RECORD
// ==========================================================

async function createDairy(
    data
) {

    const {

        recordType,

        name,

        farmType,

        assetCode,

        structureFarmCode,

        dateOfBirth,

        type,

        mass,

        buyingPrice,

        currentWorth,

        description,

        condition,

        location,

        status,

        profileImage

    } =
        data;


    // ======================================================
    // VALIDATE RECORD TYPE
    // ======================================================

    const validRecordTypes = [

        "dairyFarm",

        "animal",

        "structure"

    ];


    if (
        !validRecordTypes.includes(
            recordType
        )
    ) {

        throw new Error(
            "Invalid record type."
        );

    }


    // ======================================================
    // BASE DATA
    // ======================================================

    const record = {

        name:
            name.trim(),

        type:
            type || null,

        buyingPrice:
            Number(buyingPrice) || 0,

        currentWorth:
            Number(currentWorth) || 0,

        description:
            description || "",

        condition:
            condition || "",

        location:
            location || "",

        status:
            status || "active"

    };


    // ======================================================
    // PROFILE IMAGE
    // ======================================================

    if (
        profileImage
    ) {

        record.profileImage =
            `/uploads/${profileImage.filename}`;

    }


    // ======================================================
    // DAIRY FARM
    // ======================================================

    if (
        recordType ===
        "dairyFarm"
    ) {

        record.code =
            await generateFarmCode();


        record.farmType =
            farmType;


        /*
         * Dairy farms cannot belong
         * to another dairy farm.
         */

        record.assetCode =
            null;


        record.dateOfBirth =
            null;


        record.mass =
            null;

    }


    // ======================================================
    // ANIMAL
    // ======================================================

    else if (
        recordType ===
        "animal"
    ) {

        record.code =
            await generateAnimalCode();


        record.dateOfBirth =
            dateOfBirth;


        record.mass =
            mass !== null &&
            mass !== undefined &&
            mass !== ""
                ? Number(mass)
                : null;


        /*
         * Animal may optionally belong
         * to a dairy farm.
         */

        record.assetCode =
            assetCode || null;


        record.farmType =
            null;

    }


    // ======================================================
    // STRUCTURE / FACILITY
    // ======================================================

    else if (
        recordType ===
        "structure"
    ) {

        /*
         * Structures do not receive
         * a dairy code.
         */

        record.code =
            null;


        record.dateOfBirth =
            null;


        record.mass =
            null;


        record.farmType =
            null;


        /*
         * Structure/facility may optionally
         * belong to a dairy farm.
         */

        record.assetCode =
            structureFarmCode ||
            null;

    }


    // ======================================================
    // CREATE
    // ======================================================

    const createdRecord =
        await Dairy.create(
            record
        );


    return createdRecord;

}


// ==========================================================
// GET ADD PAGE DATA
// ==========================================================

async function getAddPageData() {

    const dairyFarms =
        await Dairy
            .find({
                code: {
                    $lt: 0
                }
            })
            .sort({
                code: 1
            })
            .lean();


    return {

        dairyBreeds,

        dairyFarms,

        farmTypes

    };

}


// ==========================================================
// EXPORT
// ==========================================================

module.exports = {

    createDairy,

    getAddPageData,

    generateFarmCode,

    generateAnimalCode

};