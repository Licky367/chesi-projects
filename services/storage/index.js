// ==========================================================
// services/storage/index.js
// STORAGE SERVICE
// ==========================================================

const DairyStorage =
    require("../../models/dairyStorage");


// ==========================================================
// NORMALIZE STORAGE TYPE
// ==========================================================

function normalizeType(
    type
) {

    const value =

        String(
            type || "all"
        )
        .trim();


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


    return "all";

}


// ==========================================================
// SORT STORAGE
// ==========================================================
//
// Primary:
//
//     farmCode
//
// Secondary:
//
//     roomNumber
//
// This means:
//
//     Farm -1
//         AgroStore 1
//         Room 0
//         Room 1
//         Room 2
//
//     Farm -2
//         AgroStore 1
//         Room 0
//         Room 1
//
// ==========================================================

function sortStorage(
    storage
) {

    return storage.sort(

        (a, b) => {

            // ----------------------------------------------
            // FARM
            // ----------------------------------------------

            const farmDifference =

                Number(a.farmCode) -
                Number(b.farmCode);


            if (
                farmDifference !== 0
            ) {

                return farmDifference;

            }


            // ----------------------------------------------
            // ROOM / AGROSTORE NUMBER
            // ----------------------------------------------

            return (

                Number(a.roomNumber) -
                Number(b.roomNumber)

            );

        }

    );

}


// ==========================================================
// GET STORAGE
// ==========================================================
//
// Returns active storage.
//
// type:
//
//     all
//     room
//     agroStore
//
// ==========================================================

async function getStorage(
    options = {}
) {

    const type =
        normalizeType(
            options.type
        );


    // ======================================================
    // BASE QUERY
    // ======================================================

    const query = {

        status: "active"

    };


    // ======================================================
    // TYPE FILTER
    // ======================================================

    if (
        type === "room"
    ) {

        query.type = "room";

    }


    if (
        type === "agroStore"
    ) {

        query.type = "agroStore";

    }


    // ======================================================
    // FETCH
    // ======================================================

    const storage =

        await DairyStorage
            .find(query)
            .lean();


    // ======================================================
    // SORT
    // ======================================================

    return sortStorage(
        storage
    );

}


// ==========================================================
// GET ALL ACTIVE STORAGE
// ==========================================================

async function getAllStorage() {

    return getStorage({

        type: "all"

    });

}


// ==========================================================
// GET ROOMS
// ==========================================================

async function getRooms() {

    return getStorage({

        type: "room"

    });

}


// ==========================================================
// GET AGROSTORES
// ==========================================================

async function getAgroStores() {

    return getStorage({

        type: "agroStore"

    });

}


// ==========================================================
// EXPORT
// ==========================================================

module.exports = {

    getStorage,

    getAllStorage,

    getRooms,

    getAgroStores

};