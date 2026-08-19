// ==========================================================
// services/storage/add.js
// STORAGE ADD SERVICE
// ==========================================================

const mongoose =
    require("mongoose");

const Dairy =
    require("../../models/dairy");

const DairyStorage =
    require("../../models/dairyStorage");


// ==========================================================
// GET ADD PAGE DATA
// ==========================================================
//
// id = Dairy._id of the PARENT DAIRY FARM.
//
// The service resolves:
//
//     Dairy._id
//          ↓
//     Dairy.code
//          ↓
//     farmCode
//
// The user NEVER supplies farmCode.
//
// ==========================================================

async function getAddPageData(
    id
) {

    // ======================================================
    // VALIDATE ID
    // ======================================================

    if (
        !mongoose.Types.ObjectId.isValid(id)
    ) {

        const error =
            new Error(
                "Invalid dairy ID."
            );

        error.status = 400;

        throw error;

    }


    // ======================================================
    // FIND PARENT DAIRY FARM
    // ======================================================

    const dairy =
        await Dairy.findById(id).lean();


    if (!dairy) {

        const error =
            new Error(
                "Dairy farm not found."
            );

        error.status = 404;

        throw error;

    }


    // ======================================================
    // ENSURE THIS IS ACTUALLY A DAIRY FARM
    // ======================================================
    //
    // Dairy farm:
    //
    //     code < 0
    //
    // ======================================================

    if (
        dairy.code === null ||
        dairy.code === undefined ||
        Number(dairy.code) >= 0
    ) {

        const error =
            new Error(
                "The selected Dairy is not a valid parent Dairy Farm."
            );

        error.status = 400;

        throw error;

    }


    // ======================================================
    // FARM CODE
    // ======================================================

    const farmCode =
        Number(dairy.code);


    // ======================================================
    // EXISTING ROOM NUMBERS
    // ======================================================

    const existingRooms =
        await DairyStorage
            .find({

                farmCode,

                type: "room",

                status: "active"

            })
            .select("roomNumber")
            .lean();


    // ======================================================
    // EXISTING AGROSTORE NUMBERS
    // ======================================================

    const existingAgroStores =
        await DairyStorage
            .find({

                farmCode,

                type: "agroStore",

                status: "active"

            })
            .select("roomNumber")
            .lean();


    // ======================================================
    // CALCULATE NEXT ROOM NUMBER
    // ======================================================
    //
    // Rooms:
    //
    //     1
    //     2
    //     3
    //
    // First room = 1
    //
    // ======================================================

    const roomNumbers =
        existingRooms
            .map(
                item =>
                    Number(item.roomNumber)
            )
            .filter(
                Number.isInteger
            )
            .filter(
                number =>
                    number > 0
            );


    const nextRoomNumber =
        roomNumbers.length > 0

            ? Math.max(
                ...roomNumbers
            ) + 1

            : 1;


    // ======================================================
    // CALCULATE NEXT AGROSTORE NUMBER
    // ======================================================
    //
    // AgroStores:
    //
    //     -1
    //     -2
    //     -3
    //
    // First AgroStore = -1
    //
    // ======================================================

    const agroStoreNumbers =
        existingAgroStores
            .map(
                item =>
                    Number(item.roomNumber)
            )
            .filter(
                Number.isInteger
            )
            .filter(
                number =>
                    number < 0
            );


    const nextAgroStoreNumber =
        agroStoreNumbers.length > 0

            ? Math.min(
                ...agroStoreNumbers
            ) - 1

            : -1;


    // ======================================================
    // RETURN
    // ======================================================

    return {

        dairy,

        farmCode,

        nextRoomNumber,

        nextAgroStoreNumber

    };

}


// ==========================================================
// ADD STORAGE
// ==========================================================
//
// Creates a new DairyStorage belonging to the parent farm.
//
// farmCode is ALWAYS obtained from:
//
//     dairy.code
//
// It is NEVER trusted from req.body.
//
// ==========================================================

async function addStorage(
    id,
    name,
    type
) {

    // ======================================================
    // GET PARENT FARM
    // ======================================================

    const data =
        await getAddPageData(id);


    const {
        dairy,
        farmCode
    } = data;


    // ======================================================
    // VALIDATE NAME
    // ======================================================

    const storageName =
        String(
            name || ""
        ).trim();


    if (!storageName) {

        const error =
            new Error(
                "Storage name is required."
            );

        error.status = 400;

        throw error;

    }


    // ======================================================
    // VALIDATE TYPE
    // ======================================================

    const storageType =
        String(
            type || ""
        ).trim();


    if (
        ![
            "room",
            "agroStore"
        ].includes(
            storageType
        )
    ) {

        const error =
            new Error(
                "Storage type must be either room or agroStore."
            );

        error.status = 400;

        throw error;

    }


    // ======================================================
    // DETERMINE ROOM NUMBER
    // ======================================================

    const roomNumber =

        storageType === "room"

            ? data.nextRoomNumber

            : data.nextAgroStoreNumber;


    // ======================================================
    // CREATE STORAGE
    // ======================================================

    const storage =
        await DairyStorage.create({

            farmCode,

            roomNumber,

            name:
                storageName,

            type:
                storageType,

            status:
                "active"

        });


    // ======================================================
    // RETURN
    // ======================================================

    return {

        dairy,

        farmCode,

        storage

    };

}


// ==========================================================
// EXPORT
// ==========================================================

module.exports = {

    getAddPageData,

    addStorage

};