// ==========================================================
// services/update/itemLink.js
// STORAGE ITEM LINK SERVICE
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
//
// Detect Dairy records that are STORAGE ITEMS and generate
// their storage details URL.
//
// DEFINITIONS
// ----------------------------------------------------------
//
// PARENT FARM:
//
//     recordType = "farm"
//     code < 0
//
// AGROSTORE:
//
//     recordType = "structure"
//     type = "agroStore"
//     roomNumber < 0
//
// NORMAL ROOM:
//
//     recordType = "structure"
//     type = "room"
//     roomNumber > 0
//
// ITEM:
//
//     Any Dairy record with a non-null dwellNumber.
//
// OWNERSHIP:
//
//     Parent Farm owns:
//
//         item.assetCode === parentFarm.code
//
//         storage.assetCode === parentFarm.code
//
//     Storage owns:
//
//         item.dwellNumber === storage.roomNumber
//
// GENERATED URL:
//
//     storage/<parentId>/contents/<storageId>/details/<itemId>
//
// ==========================================================


const Dairy =
    require("../../models/dairy");


// ==========================================================
// BUILD ITEM DETAILS URL
// ==========================================================

function buildItemDetailsUrl(
    parentId,
    storageId,
    itemId
) {

    if (
        !parentId ||
        !storageId ||
        !itemId
    ) {

        return null;

    }


    return (
        `storage/${parentId}` +
        `/contents/${storageId}` +
        `/details/${itemId}`
    );

}


// ==========================================================
// GET ALL STORAGE ITEMS
// ==========================================================
//
// Detects all Dairy records having a dwellNumber.
//
// For every valid item:
//
//     item.assetCode
//         -> parent farm code
//
//     item.dwellNumber
//         -> storage.roomNumber
//
// The returned object contains:
//
//     item
//     parentFarm
//     storage
//     detailsUrl
//
// ==========================================================

async function getAllStorageItems() {

    // ======================================================
    // FIND ITEMS
    // ======================================================

    const items =
        await Dairy.find({

            dwellNumber: {
                $ne: null
            },

            assetCode: {
                $ne: null
            }

        })
        .lean();


    if (
        !items.length
    ) {

        return [];

    }


    // ======================================================
    // GET UNIQUE PARENT FARM CODES
    // ======================================================

    const farmCodes = [

        ...new Set(

            items

                .map(
                    item =>
                        Number(
                            item.assetCode
                        )
                )

                .filter(
                    code =>
                        Number.isInteger(code) &&
                        code < 0
                )

        )

    ];


    if (
        !farmCodes.length
    ) {

        return [];

    }


    // ======================================================
    // FIND PARENT FARMS
    // ======================================================

    const farms =
        await Dairy.find({

            recordType: "farm",

            code: {
                $in: farmCodes
            }

        })
        .lean();


    // ======================================================
    // INDEX FARMS BY CODE
    // ======================================================

    const farmsByCode =
        new Map();


    for (
        const farm of farms
    ) {

        farmsByCode.set(

            Number(
                farm.code
            ),

            farm

        );

    }


    // ======================================================
    // FIND STORAGE FACILITIES
    // ======================================================

    const storages =
        await Dairy.find({

            recordType: "structure",

            type: {
                $in: [
                    "room",
                    "agroStore"
                ]
            },

            assetCode: {
                $in: farmCodes
            },

            roomNumber: {
                $ne: null
            }

        })
        .lean();


    // ======================================================
    // INDEX STORAGE
    //
    // KEY:
    //
    //     farmCode:roomNumber
    //
    // ======================================================

    const storageMap =
        new Map();


    for (
        const storage of storages
    ) {

        const key =
            `${Number(storage.assetCode)}:` +
            `${Number(storage.roomNumber)}`;


        storageMap.set(
            key,
            storage
        );

    }


    // ======================================================
    // RESOLVE ITEMS
    // ======================================================

    const resolvedItems = [];


    for (
        const item of items
    ) {

        const farmCode =
            Number(
                item.assetCode
            );


        const dwellNumber =
            Number(
                item.dwellNumber
            );


        // ==================================================
        // PARENT FARM
        // ==================================================

        const parentFarm =
            farmsByCode.get(
                farmCode
            );


        if (
            !parentFarm
        ) {

            continue;

        }


        // ==================================================
        // STORAGE
        // ==================================================

        const storageKey =
            `${farmCode}:${dwellNumber}`;


        const storage =
            storageMap.get(
                storageKey
            );


        if (
            !storage
        ) {

            continue;

        }


        // ==================================================
        // VERIFY PARENT OWNERSHIP
        // ==================================================

        if (
            Number(
                storage.assetCode
            ) !==
            Number(
                parentFarm.code
            )
        ) {

            continue;

        }


        // ==================================================
        // VERIFY STORAGE OWNERSHIP
        // ==================================================

        if (
            Number(
                storage.roomNumber
            ) !==
            Number(
                item.dwellNumber
            )
        ) {

            continue;

        }


        // ==================================================
        // GENERATE DETAILS URL
        // ==================================================

        const detailsUrl =
            buildItemDetailsUrl(

                parentFarm._id,

                storage._id,

                item._id

            );


        if (
            !detailsUrl
        ) {

            continue;

        }


        // ==================================================
        // ADD RESOLVED ITEM
        // ==================================================

        resolvedItems.push({

            ...item,

            parentFarm,

            storage,

            detailsUrl

        });

    }


    return resolvedItems;

}


// ==========================================================
// GET ONE STORAGE ITEM LINK
// ==========================================================
//
// Finds one item and resolves:
//
//     item
//     parentFarm
//     storage
//     detailsUrl
//
// ==========================================================

async function getStorageItemLink(
    itemId
) {

    if (
        !itemId
    ) {

        return null;

    }


    const item =
        await Dairy.findOne({

            _id: itemId,

            dwellNumber: {
                $ne: null
            },

            assetCode: {
                $ne: null
            }

        })
        .lean();


    if (
        !item
    ) {

        return null;

    }


    const farmCode =
        Number(
            item.assetCode
        );


    if (
        !Number.isInteger(farmCode) ||
        farmCode >= 0
    ) {

        return null;

    }


    // ======================================================
    // FIND PARENT FARM
    // ======================================================

    const parentFarm =
        await Dairy.findOne({

            recordType: "farm",

            code: farmCode

        })
        .lean();


    if (
        !parentFarm
    ) {

        return null;

    }


    // ======================================================
    // FIND STORAGE
    // ======================================================

    const storage =
        await Dairy.findOne({

            recordType: "structure",

            type: {
                $in: [
                    "room",
                    "agroStore"
                ]
            },

            assetCode: farmCode,

            roomNumber:
                Number(
                    item.dwellNumber
                )

        })
        .lean();


    if (
        !storage
    ) {

        return null;

    }


    // ======================================================
    // GENERATE URL
    // ======================================================

    const detailsUrl =
        buildItemDetailsUrl(

            parentFarm._id,

            storage._id,

            item._id

        );


    return {

        item,

        parentFarm,

        storage,

        detailsUrl

    };

}


// ==========================================================
// GET ITEMS FOR ONE STORAGE
// ==========================================================
//
// parentFarmId
//     = Dairy Farm _id
//
// storageId
//     = Room / AgroStore _id
//
// Returns every item satisfying:
//
//     item.assetCode === parentFarm.code
//
// AND
//
//     item.dwellNumber === storage.roomNumber
//
// ==========================================================

async function getStorageItems(
    parentFarmId,
    storageId
) {

    if (
        !parentFarmId ||
        !storageId
    ) {

        return [];

    }


    // ======================================================
    // FIND PARENT FARM
    // ======================================================

    const parentFarm =
        await Dairy.findOne({

            _id: parentFarmId,

            recordType: "farm",

            code: {
                $lt: 0
            }

        })
        .lean();


    if (
        !parentFarm
    ) {

        return [];

    }


    // ======================================================
    // FIND STORAGE
    // ======================================================

    const storage =
        await Dairy.findOne({

            _id: storageId,

            recordType: "structure",

            type: {
                $in: [
                    "room",
                    "agroStore"
                ]
            },

            assetCode:
                parentFarm.code

        })
        .lean();


    if (
        !storage
    ) {

        return [];

    }


    // ======================================================
    // FIND ITEMS
    // ======================================================

    const items =
        await Dairy.find({

            assetCode:
                parentFarm.code,

            dwellNumber:
                storage.roomNumber

        })
        .lean();


    // ======================================================
    // ATTACH URL
    // ======================================================

    return items.map(
        item => ({

            ...item,

            parentFarm,

            storage,

            detailsUrl:
                buildItemDetailsUrl(

                    parentFarm._id,

                    storage._id,

                    item._id

                )

        })
    );

}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    buildItemDetailsUrl,

    getAllStorageItems,

    getStorageItemLink,

    getStorageItems

};