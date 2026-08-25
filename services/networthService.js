// ==========================================================
// services/update/storageService.js
// STORAGE / ROOM / AGROSTORE SERVICE
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
// Handles storage facilities belonging to ONE Dairy Farm.
//
// STORAGE FACILITIES:
//
//     recordType = "structure"
//     type       = "room"
//     roomNumber > 0
//
// OR:
//
//     recordType = "structure"
//     type       = "agroStore"
//     roomNumber < 0
//
// STORAGE CONTENT:
//
//     Dairy.assetCode   = parent Dairy Farm code
//     Dairy.dwellNumber = storage.roomNumber
//
// IMPORTANT:
// ----------------------------------------------------------
// The route uses:
//
//     /storage/:dairyId/contents/:storageId
//
// where:
//
//     dairyId
//         = Dairy._id of the parent Dairy Farm
//
//     storageId
//         = Dairy._id of the Room / AgroStore
//
// The storage facility itself is therefore found by _id,
// then verified against the parent Dairy Farm.
//
// ==========================================================


const mongoose =
    require("mongoose");

const Dairy =
    require("../../models/dairy");


// ==========================================================
// HELPERS
// ==========================================================


function createError(
    message,
    statusCode = 400
) {

    const error =
        new Error(message);

    error.status =
        statusCode;

    return error;

}


// ==========================================================
// OBJECT ID VALIDATION
// ==========================================================


function isValidObjectId(id) {

    return mongoose.Types.ObjectId.isValid(
        id
    );

}


// ==========================================================
// NORMALIZE STORAGE TYPE
// ==========================================================
//
// Supported:
//
//     all
//     room
//     agroStore
//
// ==========================================================


function normalizeType(type) {

    if (
        type === null ||
        type === undefined ||
        type === ""
    ) {

        return "all";

    }


    const value =
        String(type)
            .trim();


    if (
        !value ||
        value === "all"
    ) {

        return "all";

    }


    if (
        value === "room"
    ) {

        return "room";

    }


    if (
        value === "agroStore"
    ) {

        return "agroStore";

    }


    throw createError(
        `Invalid storage type: ${value}.`,
        400
    );

}


// ==========================================================
// NORMALIZE FARM CODE
// ==========================================================
//
// Dairy Farm codes are negative integers.
//
// ==========================================================


function normalizeFarmCode(code) {

    const value =
        Number(code);


    if (
        !Number.isInteger(value) ||
        value >= 0
    ) {

        throw createError(
            "Invalid Dairy Farm code.",
            400
        );

    }


    return value;

}


// ==========================================================
// FIND PARENT DAIRY FARM
// ==========================================================
//
// Route :id is Dairy._id.
//
// ==========================================================


async function findFarmById(
    dairyId
) {

    if (
        !isValidObjectId(dairyId)
    ) {

        throw createError(
            "Invalid Dairy Farm ID.",
            400
        );

    }


    const farm =
        await Dairy.findOne({

            _id: dairyId,

            recordType: "farm",

            status: "active"

        });


    if (!farm) {

        throw createError(
            "Dairy Farm not found.",
            404
        );

    }


    if (
        !Number.isInteger(
            Number(farm.code)
        ) ||
        Number(farm.code) >= 0
    ) {

        throw createError(
            "Invalid Dairy Farm code.",
            400
        );

    }


    return farm;

}


// ==========================================================
// FIND STORAGE FACILITY
// ==========================================================
//
// storageId is Dairy._id.
//
// The facility must:
//
//     recordType = structure
//
// AND:
//
//     type = room
//     OR
//     type = agroStore
//
// AND:
//
//     belong to the parent farm through assetCode.
//
// ==========================================================


async function findStorageById(
    storageId,
    farmCode
) {

    if (
        !isValidObjectId(storageId)
    ) {

        throw createError(
            "Invalid storage ID.",
            400
        );

    }


    const code =
        normalizeFarmCode(
            farmCode
        );


    const storage =
        await Dairy.findOne({

            _id: storageId,

            recordType: "structure",

            assetCode: code,

            type: {

                $in: [
                    "room",
                    "agroStore"
                ]

            },

            roomNumber: {
                $ne: null
            },

            dwellNumber: null,

            status: "active"

        });


    if (!storage) {

        throw createError(
            "Storage facility not found or does not belong to this Dairy Farm.",
            404
        );

    }


    return storage;

}


// ==========================================================
// BUILD STORAGE QUERY
// ==========================================================


function buildStorageQuery(
    farmCode,
    type
) {

    const code =
        normalizeFarmCode(
            farmCode
        );


    const normalizedType =
        normalizeType(type);


    const query = {

        recordType: "structure",

        assetCode: code,

        roomNumber: {
            $ne: null
        },

        dwellNumber: null,

        status: "active"

    };


    if (
        normalizedType !== "all"
    ) {

        query.type =
            normalizedType;

    } else {

        query.type = {

            $in: [
                "room",
                "agroStore"
            ]

        };

    }


    return query;

}


// ==========================================================
// GET STORAGE FACILITIES
// ==========================================================
//
// Returns all active Rooms and AgroStores belonging to
// one Dairy Farm.
//
// ==========================================================


exports.getStorage =
    async function ({
        dairyId,
        type = "all"
    }) {

        const farm =
            await findFarmById(
                dairyId
            );


        const normalizedType =
            normalizeType(type);


        const query =
            buildStorageQuery(
                farm.code,
                normalizedType
            );


        const storage =
            await Dairy.find(
                query
            )
            .sort({

                type: 1,
                roomNumber: 1

            })
            .lean();


        return {

            farm,

            farmCode:
                farm.code,

            storage,

            type:
                normalizedType

        };

    };


// ==========================================================
// GET ADD STORAGE DATA
// ==========================================================
//
// Used when opening the storage creation form.
//
// The service returns:
//
//     farm
//     farmCode
//     existing rooms
//     existing AgroStores
//     storage types
//
// ==========================================================


exports.getAddStorage =
    async function ({
        dairyId
    }) {

        const farm =
            await findFarmById(
                dairyId
            );


        const [
            rooms,
            agroStores
        ] = await Promise.all([

            Dairy.getRooms(
                farm.code
            ),

            Dairy.getAgroStores(
                farm.code
            )

        ]);


        return {

            farm,

            farmCode:
                farm.code,

            rooms:
                await rooms
                    .sort({
                        roomNumber: 1
                    }),

            agroStores:
                await agroStores
                    .sort({
                        roomNumber: -1
                    }),

            storageTypes: [

                "room",
                "agroStore"

            ]

        };

    };


// ==========================================================
// ADD STORAGE
// ==========================================================
//
// Creates a new Room or AgroStore.
//
// IMPORTANT:
//
//     roomNumber is expected to be generated by the service.
//
// The caller supplies:
//
//     dairyId
//     type
//     name
//     description
//     condition
//     location
//     refNo
//     etc.
//
// The service generates:
//
//     room
//         -> next positive roomNumber
//
//     agroStore
//         -> next negative roomNumber
//
// ==========================================================


exports.addStorage =
    async function ({
        dairyId,
        type,
        name,
        description = "",
        condition = "",
        location = "",
        refNo = null,
        about = "",
        mission = "",
        vision = "",
        buyingPrice = 0,
        sellingPrice = 0,
        currentWorth = 0,
        revenue = 0,
        acquisitionDate = null,
        valuationDate = null,
        profileImages = [],
        profileImage = ""
    }) {

        const farm =
            await findFarmById(
                dairyId
            );


        const normalizedType =
            normalizeType(type);


        if (
            normalizedType === "all"
        ) {

            throw createError(
                "Storage type must be either room or agroStore.",
                400
            );

        }


        const storageName =
            String(
                name || ""
            ).trim();


        if (!storageName) {

            throw createError(
                "Storage name is required.",
                400
            );

        }


        // ======================================================
        // GENERATE ROOM NUMBER
        // ======================================================

        let roomNumber;


        if (
            normalizedType === "room"
        ) {

            const result =
                await Dairy.findOne({

                    recordType: "structure",

                    assetCode: farm.code,

                    type: "room",

                    roomNumber: {
                        $gt: 0
                    }

                })
                .sort({

                    roomNumber: -1

                })
                .select(
                    "roomNumber"
                )
                .lean();


            roomNumber =
                result &&
                Number.isInteger(
                    Number(
                        result.roomNumber
                    )
                )

                    ? Number(
                        result.roomNumber
                    ) + 1

                    : 1;

        }


        // ======================================================
        // GENERATE AGROSTORE NUMBER
        // ======================================================

        if (
            normalizedType === "agroStore"
        ) {

            const result =
                await Dairy.findOne({

                    recordType: "structure",

                    assetCode: farm.code,

                    type: "agroStore",

                    roomNumber: {
                        $lt: 0
                    }

                })
                .sort({

                    roomNumber: 1

                })
                .select(
                    "roomNumber"
                )
                .lean();


            roomNumber =
                result &&
                Number.isInteger(
                    Number(
                        result.roomNumber
                    )
                )

                    ? Number(
                        result.roomNumber
                    ) - 1

                    : -1;

        }


        // ======================================================
        // CREATE STORAGE FACILITY
        // ======================================================

        const storage =
            new Dairy({

                recordType:
                    "structure",

                type:
                    normalizedType,

                name:
                    storageName,

                code:
                    null,

                refNo:
                    refNo || null,

                about:
                    about || "",

                mission:
                    mission || "",

                vision:
                    vision || "",

                assetCode:
                    farm.code,

                roomNumber,

                dwellNumber:
                    null,

                description:
                    description || "",

                condition:
                    condition || "",

                location:
                    location || "",

                buyingPrice:
                    Number(
                        buyingPrice
                    ) || 0,

                sellingPrice:
                    Number(
                        sellingPrice
                    ) || 0,

                currentWorth:
                    Number(
                        currentWorth
                    ) || 0,

                revenue:
                    Number(
                        revenue
                    ) || 0,

                acquisitionDate:
                    acquisitionDate || null,

                valuationDate:
                    valuationDate || null,

                profileImages:
                    Array.isArray(
                        profileImages
                    )
                        ? profileImages
                        : [],

                profileImage:
                    profileImage || "",

                status:
                    "active"

            });


        await storage.save();


        return storage;

    };


// ==========================================================
// GET STORAGE CONTENTS
// ==========================================================
//
// This is the important contents method.
//
// Route:
//
//     GET /storage/:dairyId/contents/:storageId
//
// Steps:
//
//     1. Find parent Dairy Farm by _id.
//
//     2. Find selected storage by _id.
//
//     3. Verify storage belongs to that farm.
//
//     4. Read storage.roomNumber.
//
//     5. Find all active Dairy records:
//
//            assetCode   = farm.code
//            dwellNumber = storage.roomNumber
//
// This works for BOTH:
//
//     Room
//         roomNumber > 0
//
//     AgroStore
//         roomNumber < 0
//
// ==========================================================


exports.getStorageContents =
    async function ({
        dairyId,
        storageId
    }) {

        const farm =
            await findFarmById(
                dairyId
            );


        const storage =
            await findStorageById(
                storageId,
                farm.code
            );


        const contents =
            await Dairy.find({

                assetCode:
                    farm.code,

                dwellNumber:
                    storage.roomNumber,

                status:
                    "active",

                _id: {
                    $ne: storage._id
                }

            })
            .sort({

                recordType: 1,
                name: 1

            })
            .lean();


        return {

            farm,

            farmCode:
                farm.code,

            storage,

            contents,

            storageType:
                storage.type,

            storageNumber:
                storage.roomNumber,

            count:
                contents.length

        };

    };


// ==========================================================
// ADD ITEM TO STORAGE
// ==========================================================
//
// Allocates an existing Dairy record to a Room or AgroStore.
//
// The item's:
//
//     assetCode
//
// must belong to the same farm.
//
// Its:
//
//     dwellNumber
//
// becomes:
//
//     storage.roomNumber
//
// ==========================================================


exports.addToStorage =
    async function ({
        dairyId,
        storageId,
        itemId
    }) {

        const farm =
            await findFarmById(
                dairyId
            );


        const storage =
            await findStorageById(
                storageId,
                farm.code
            );


        if (
            !isValidObjectId(itemId)
        ) {

            throw createError(
                "Invalid item ID.",
                400
            );

        }


        const item =
            await Dairy.findOne({

                _id: itemId,

                assetCode:
                    farm.code,

                status:
                    "active"

            });


        if (!item) {

            throw createError(
                "Item not found or does not belong to this Dairy Farm.",
                404
            );

        }


        if (
            item._id.equals(
                storage._id
            )
        ) {

            throw createError(
                "A storage facility cannot be placed inside itself.",
                400
            );

        }


        if (
            item.isStorageFacility
        ) {

            throw createError(
                "A storage facility cannot be allocated as storage content.",
                400
            );

        }


        item.dwellNumber =
            storage.roomNumber;


        await item.save();


        return {

            farm,

            storage,

            item

        };

    };


// ==========================================================
// REMOVE ITEM FROM STORAGE
// ==========================================================
//
// Sets:
//
//     dwellNumber = null
//
// ==========================================================


exports.removeFromStorage =
    async function ({
        dairyId,
        storageId,
        itemId
    }) {

        const farm =
            await findFarmById(
                dairyId
            );


        const storage =
            await findStorageById(
                storageId,
                farm.code
            );


        if (
            !isValidObjectId(itemId)
        ) {

            throw createError(
                "Invalid item ID.",
                400
            );

        }


        const item =
            await Dairy.findOne({

                _id: itemId,

                assetCode:
                    farm.code,

                dwellNumber:
                    storage.roomNumber,

                status:
                    "active"

            });


        if (!item) {

            throw createError(
                "Item is not currently inside this storage facility.",
                404
            );

        }


        item.dwellNumber =
            null;


        await item.save();


        return {

            farm,

            storage,

            item

        };

    };


// ==========================================================
// MOVE ITEM TO ANOTHER STORAGE
// ==========================================================
//
// The item can be moved from one Room/AgroStore to another.
//
// The destination must belong to the same Dairy Farm.
//
// ==========================================================


exports.moveItem =
    async function ({
        dairyId,
        itemId,
        destinationStorageId
    }) {

        const farm =
            await findFarmById(
                dairyId
            );


        if (
            !isValidObjectId(itemId)
        ) {

            throw createError(
                "Invalid item ID.",
                400
            );

        }


        const destination =
            await findStorageById(
                destinationStorageId,
                farm.code
            );


        const item =
            await Dairy.findOne({

                _id: itemId,

                assetCode:
                    farm.code,

                status:
                    "active"

            });


        if (!item) {

            throw createError(
                "Item not found or does not belong to this Dairy Farm.",
                404
            );

        }


        if (
            item._id.equals(
                destination._id
            )
        ) {

            throw createError(
                "An item cannot be moved into itself.",
                400
            );

        }


        if (
            item.isStorageFacility
        ) {

            throw createError(
                "A storage facility cannot be moved into another storage facility.",
                400
            );

        }


        item.dwellNumber =
            destination.roomNumber;


        await item.save();


        return {

            farm,

            destination,

            item

        };

    };


// ==========================================================
// GET AVAILABLE ITEMS
// ==========================================================
//
// Returns active farm assets that are NOT currently allocated
// to a storage facility.
//
// ==========================================================


exports.getAvailableItems =
    async function ({
        dairyId
    }) {

        const farm =
            await findFarmById(
                dairyId
            );


        const items =
            await Dairy.find({

                assetCode:
                    farm.code,

                status:
                    "active",

                $or: [

                    {
                        dwellNumber:
                            null
                    },

                    {
                        dwellNumber: {
                            $exists: false
                        }
                    }

                ],

                $nor: [

                    {
                        recordType:
                            "structure",

                        type: {
                            $in: [
                                "room",
                                "agroStore"
                            ]
                        }
                    }

                ]

            })
            .sort({

                recordType: 1,
                name: 1

            })
            .lean();


        return {

            farm,

            farmCode:
                farm.code,

            items

        };

    };


// ==========================================================
// GET STORAGE BY TYPE
// ==========================================================
//
// Convenience method for controllers that need only:
//
//     room
//
// OR:
//
//     agroStore
//
// ==========================================================


exports.getStorageByType =
    async function ({
        dairyId,
        type
    }) {

        return this.getStorage({

            dairyId,

            type

        });

    };


// ==========================================================
// GET ROOMS
// ==========================================================


exports.getRooms =
    async function ({
        dairyId
    }) {

        const farm =
            await findFarmById(
                dairyId
            );


        const rooms =
            await Dairy.find({

                recordType:
                    "structure",

                assetCode:
                    farm.code,

                type:
                    "room",

                roomNumber: {
                    $gt: 0
                },

                dwellNumber:
                    null,

                status:
                    "active"

            })
            .sort({

                roomNumber: 1

            })
            .lean();


        return {

            farm,

            farmCode:
                farm.code,

            rooms

        };

    };


// ==========================================================
// GET AGROSTORES
// ==========================================================


exports.getAgroStores =
    async function ({
        dairyId
    }) {

        const farm =
            await findFarmById(
                dairyId
            );


        const agroStores =
            await Dairy.find({

                recordType:
                    "structure",

                assetCode:
                    farm.code,

                type:
                    "agroStore",

                roomNumber: {
                    $lt: 0
                },

                dwellNumber:
                    null,

                status:
                    "active"

            })
            .sort({

                roomNumber: -1

            })
            .lean();


        return {

            farm,

            farmCode:
                farm.code,

            agroStores

        };

    };


// ==========================================================
// GET STORAGE SUMMARY
// ==========================================================
//
// Returns storage facilities together with the number of
// items currently inside each one.
//
// ==========================================================


exports.getStorageSummary =
    async function ({
        dairyId,
        type = "all"
    }) {

        const farm =
            await findFarmById(
                dairyId
            );


        const normalizedType =
            normalizeType(type);


        const query =
            buildStorageQuery(
                farm.code,
                normalizedType
            );


        const storage =
            await Dairy.find(
                query
            )
            .sort({

                type: 1,
                roomNumber: 1

            })
            .lean();


        if (
            storage.length === 0
        ) {

            return {

                farm,

                farmCode:
                    farm.code,

                storage: [],

                type:
                    normalizedType

            };

        }


        const roomNumbers =
            storage.map(
                item =>
                    item.roomNumber
            );


        const contents =
            await Dairy.find({

                assetCode:
                    farm.code,

                dwellNumber: {
                    $in: roomNumbers
                },

                status:
                    "active"

            })
            .select(
                "_id dwellNumber"
            )
            .lean();


        const countMap =
            new Map();


        contents.forEach(
            item => {

                const key =
                    Number(
                        item.dwellNumber
                    );


                countMap.set(

                    key,

                    (
                        countMap.get(key) ||
                        0
                    ) + 1

                );

            }
        );


        const result =
            storage.map(
                item => ({

                    ...item,

                    contentCount:
                        countMap.get(
                            Number(
                                item.roomNumber
                            )
                        ) || 0

                })
            );


        return {

            farm,

            farmCode:
                farm.code,

            storage:
                result,

            type:
                normalizedType

        };

    };


// ==========================================================
// GET ONE STORAGE FACILITY
// ==========================================================


exports.getStorageById =
    async function ({
        dairyId,
        storageId
    }) {

        const farm =
            await findFarmById(
                dairyId
            );


        const storage =
            await findStorageById(
                storageId,
                farm.code
            );


        return {

            farm,

            farmCode:
                farm.code,

            storage

        };

    };


// ==========================================================
// EXPORT HELPERS
// ==========================================================
//
// These are exported mainly for controller/service testing.
// They do not change the public storage behaviour.
//
// ==========================================================


exports.normalizeType =
    normalizeType;


exports.findFarmById =
    findFarmById;


exports.findStorageById =
    findStorageById;