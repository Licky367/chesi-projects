// ==========================================================
// services/update/storage/list.js
// AGROSTORE INVENTORY LIST SERVICE
// ==========================================================
//
// AGROSTORE ID CONTRACT
// ----------------------------------------------------------
//
// The application-level AgroStore ID is:
//
//     AgroStore.roomNumber
//
// Examples:
//
//     -1
//     -2
//     -3
//
// DO NOT treat AgroStore ID as MongoDB _id.
//
// MongoDB _id exists internally on the AgroStore document,
// but it is NOT the identifier supplied by this service.
//
// ----------------------------------------------------------
//
// OWNERSHIP CONTRACT
// ----------------------------------------------------------
//
// Dairy Farm:
//
//     recordType = "farm"
//     code       = negative farm code
//     assetCode  = null
//
// AgroStore:
//
//     recordType = "structure"
//     type       = "agroStore"
//     assetCode  = negative code of parent Dairy Farm
//     roomNumber = negative AgroStore number
//
// Inventory:
//
//     assetCode   = parent Dairy Farm code
//     dwellNumber = AgroStore.roomNumber
//
// ----------------------------------------------------------
//
// RESOLUTION:
//
//     agroStoreId
//          ↓
//     AgroStore.roomNumber
//          ↓
//     AgroStore.assetCode
//          ↓
//     parent Dairy Farm.code
//          ↓
//     parent Dairy Farm._id
//
// ----------------------------------------------------------
//
// IMPORTANT:
//
// roomNumber is unique only within a parent farm.
//
// Therefore this service refuses to guess if the supplied
// roomNumber matches multiple active AgroStores belonging
// to different farms.
//
// ==========================================================


const Dairy =
    require("../../../models/dairy");


// ==========================================================
// LIST AGROSTORE INVENTORY
// ==========================================================
//
// INPUT:
//
//     agroStoreId
//
// IMPORTANT:
//
//     agroStoreId = AgroStore.roomNumber
//
// Example:
//
//     agroStoreId = "-1"
//
// becomes:
//
//     storeNumber = -1
//
// ==========================================================

async function list({

    agroStoreId

}) {

    // ======================================================
    // NORMALIZE AGROSTORE ID
    // ======================================================

    const storeNumber =
        Number(
            agroStoreId
        );


    // ======================================================
    // VALIDATE AGROSTORE ROOM NUMBER
    // ======================================================
    //
    // AgroStore roomNumber MUST be:
//
//     negative integer
//
// ======================================================

    if (
        !Number.isInteger(storeNumber) ||
        storeNumber >= 0
    ) {

        const error =
            new Error(
                "Invalid AgroStore roomNumber."
            );

        error.status = 400;

        throw error;

    }


    // ======================================================
    // FIND AGROSTORE
    // ======================================================
    //
    // IMPORTANT:
    //
    // We DO NOT search:
    //
    //     _id: agroStoreId
    //
    // because agroStoreId is the roomNumber.
    //
    // We search by:
    //
    //     recordType
    //     type
    //     roomNumber
    //     status
    //
    // ======================================================

    const agroStores =
        await Dairy.find({

            recordType: "structure",

            type: "agroStore",

            roomNumber: storeNumber,

            status: "active"

        });


    // ======================================================
    // AGROSTORE NOT FOUND
    // ======================================================

    if (
        !agroStores.length
    ) {

        const error =
            new Error(
                "The requested AgroStore was not found."
            );

        error.status = 404;

        throw error;

    }


    // ======================================================
    // CHECK FOR AMBIGUOUS AGROSTORE ID
    // ======================================================
    //
    // roomNumber is unique per farm, NOT globally.
    //
    // Therefore:
    //
    //     Farm -5  → AgroStore -1
    //     Farm -8  → AgroStore -1
    //
    // are both valid according to dairy.js.
    //
    // If that happens and the caller supplied only "-1",
    // there is no mathematically correct way to know which
    // farm was intended.
    //
    // NEVER randomly choose one.
    //
    // ======================================================

    if (
        agroStores.length > 1
    ) {

        const error =
            new Error(
                `AgroStore roomNumber ${storeNumber} is ambiguous because it exists in multiple active Dairy Farms.`
            );

        error.status = 400;

        throw error;

    }


    // ======================================================
    // RESOLVED AGROSTORE
    // ======================================================

    const agroStore =
        agroStores[0];


    // ======================================================
    // GET PARENT FARM CODE
    // ======================================================
    //
    // According to dairy.js:
    //
    //     structure.assetCode
    //             =
    //     negative code of parent Dairy Farm
    //
    // ======================================================

    const farmCode =
        Number(
            agroStore.assetCode
        );


    // ======================================================
    // VALIDATE PARENT FARM CODE
    // ======================================================

    if (
        !Number.isInteger(farmCode) ||
        farmCode >= 0
    ) {

        const error =
            new Error(
                "The AgroStore has an invalid parent Dairy Farm code."
            );

        error.status = 400;

        throw error;

    }


    // ======================================================
    // FIND PARENT DAIRY FARM
    // ======================================================
    //
    // THIS is how the correct parent Dairy Farm _id
    // is determined.
    //
    //
    // AgroStore:
    //
    //     assetCode = -7
    //
    //             ↓
    //
    // Dairy Farm:
    //
    //     code = -7
    //
    //             ↓
    //
    // parentDairy._id
    //
    // ======================================================

    const parentDairy =
        await Dairy.findOne({

            recordType: "farm",

            code: farmCode,

            status: "active"

        });


    // ======================================================
    // PARENT FARM NOT FOUND
    // ======================================================

    if (!parentDairy) {

        const error =
            new Error(
                "The parent Dairy Farm associated with this AgroStore was not found."
            );

        error.status = 404;

        throw error;

    }


    // ======================================================
    // VERIFY PARENT FARM CODE
    // ======================================================

    const parentFarmCode =
        Number(
            parentDairy.code
        );


    if (
        !Number.isInteger(parentFarmCode) ||
        parentFarmCode >= 0
    ) {

        const error =
            new Error(
                "The parent Dairy Farm has an invalid farm code."
            );

        error.status = 400;

        throw error;

    }


    // ======================================================
    // VERIFY AGROSTORE OWNERSHIP
    // ======================================================
    //
    // The AgroStore's assetCode MUST equal the parent's
    // negative farm code.
    //
    // ======================================================

    if (
        parentFarmCode !== farmCode
    ) {

        const error =
            new Error(
                "The AgroStore does not belong to the resolved parent Dairy Farm."
            );

        error.status = 400;

        throw error;

    }


    // ======================================================
    // VERIFY AGROSTORE ROOM NUMBER
    // ======================================================
    //
    // roomNumber is the authoritative AgroStore identifier.
    //
    // ======================================================

    const authoritativeStoreNumber =
        Number(
            agroStore.roomNumber
        );


    if (
        !Number.isInteger(
            authoritativeStoreNumber
        ) ||
        authoritativeStoreNumber >= 0
    ) {

        const error =
            new Error(
                "The AgroStore has an invalid roomNumber."
            );

        error.status = 400;

        throw error;

    }


    // ======================================================
    // FIND INVENTORY
    // ======================================================
    //
    // Inventory belongs to the AgroStore through TWO values:
    //
    //     assetCode
    //         =
    //     parent Dairy Farm code
    //
    // AND
    //
    //     dwellNumber
    //         =
    //     AgroStore.roomNumber
    //
    // Example:
    //
    //     Farm:
    //         code = -7
    //
    //     AgroStore:
    //         assetCode = -7
    //         roomNumber = -2
    //
    //     Inventory:
    //         assetCode = -7
    //         dwellNumber = -2
    //
    // ======================================================

    const inventory =
        await Dairy.find({

            recordType: "structure",

            assetCode: farmCode,

            dwellNumber:
                authoritativeStoreNumber,

            status: "active"

        })
        .sort({

            updatedAt: -1

        });


    // ======================================================
    // RETURN
    // ======================================================

    return {

        parentDairy,

        agroStore,

        inventory

    };

}


// ==========================================================
// EXPORT
// ==========================================================

module.exports =
    list;