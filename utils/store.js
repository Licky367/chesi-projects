// ==========================================================
// utils/store.js
// ==========================================================
//
// FEED STORE INITIALIZER
//
// Responsibilities:
//
//     • Find all Dairy Farms
//     • Check whether each farm has a feedStore facility
//     • Automatically create the feedStore when missing
//     • Never create more than one feedStore for a farm
//
// FEED STORE SEMANTICS
// ----------------------------------------------------------
//
// A feedStore is NOT an animal.
//
// A feedStore is NOT a dwelling place.
//
// A feedStore is a FACILITY used for food/feed storage.
//
// Therefore:
//
//     code      = null
//     type      = "feedStore"
//     assetCode = dairy.code
//
// Example:
//
//     Dairy Farm:
//         code: -10
//         name: "Green Valley Farm"
//
//     Feed Store:
//         code: null
//         type: "feedStore"
//         assetCode: -10
//         name: "Green Valley Farm's storage Facility"
//
// PROFILE IMAGE
// ----------------------------------------------------------
//
//     /images/h2.png
//
// If the image does not exist or is not desired, the model can
// still work with a null/empty profile image.
//
// IMPORTANT
// ----------------------------------------------------------
//
// The Dairy model should have a UNIQUE partial index for:
//
//     assetCode + type
//
// when:
//
//     type === "feedStore"
//     assetCode is a negative number
//
// This utility also checks before creating, but the database
// unique index is the final protection against duplicates.
//
// ==========================================================


const Dairy =
    require("../models/dairy");


// ==========================================================
// CONSTANTS
// ==========================================================

const FEED_STORE_TYPE =
    "feedStore";


const FEED_STORE_PROFILE_IMAGE =
    "/images/h2.png";


// ==========================================================
// CREATE FEED STORE FOR ONE DAIRY FARM
// ==========================================================
//
// Returns:
//
//     {
//         created: true,
//         store: ...
//     }
//
// OR:
//
//     {
//         created: false,
//         store: existingStore
//     }
//
// ==========================================================

async function ensureFeedStoreForFarm(
    dairy
) {

    // ======================================================
    // VALIDATE FARM
    // ======================================================

    if (!dairy) {

        return {

            created: false,

            store: null

        };

    }


    // ======================================================
    // ONLY DAIRY FARMS
    // ======================================================

    const dairyCode =
        Number(dairy.code);


    if (

        !Number.isInteger(dairyCode) ||

        dairyCode >= 0

    ) {

        return {

            created: false,

            store: null

        };

    }


    // ======================================================
    // CHECK EXISTING FEED STORE
    // ======================================================
    //
    // The relationship is:
    //
    //     feedStore.assetCode === dairy.code
    //
    // ======================================================

    const existingStore =

        await Dairy.findOne({

            type: FEED_STORE_TYPE,

            assetCode: dairyCode

        });


    // ======================================================
    // ALREADY EXISTS
    // ======================================================
    //
    // Do NOT create another one.
    //
    // ======================================================

    if (existingStore) {

        return {

            created: false,

            store: existingStore

        };

    }


    // ======================================================
    // CREATE FEED STORE
    // ======================================================

    const storeName =

        `${dairy.name}'s storage Facility`;


    const store =

        new Dairy({

            // ------------------------------------------------
            // STRUCTURE / FACILITY
            // ------------------------------------------------
            //
            // code === null means this is a structure.
            //
            code: null,


            // ------------------------------------------------
            // NAME
            // ------------------------------------------------

            name: storeName,


            // ------------------------------------------------
            // FACILITY TYPE
            // ------------------------------------------------

            type: FEED_STORE_TYPE,


            // ------------------------------------------------
            // PARENT DAIRY FARM
            // ------------------------------------------------
            //
            // Negative Dairy Farm code.
            //
            assetCode: dairyCode,


            // ------------------------------------------------
            // PROFILE IMAGE
            // ------------------------------------------------

            profileImage:
                FEED_STORE_PROFILE_IMAGE,

            profileImages: [

                FEED_STORE_PROFILE_IMAGE

            ],


            // ------------------------------------------------
            // ANIMAL FIELDS
            // ------------------------------------------------
            //
            // Explicitly make it clear that this facility
            // is not an animal.
            //
            dateOfBirth: null,

            mass: 0,

            isMilking: false,


            // ------------------------------------------------
            // FEED STOCK
            // ------------------------------------------------
            //
            // Start empty.
            //
            feedStocks: [],

            feedsAmount: 0,


            // ------------------------------------------------
            // ASSET FINANCIAL VALUES
            // ------------------------------------------------

            buyingPrice: 0,

            sellingPrice: 0,

            revenue: 0,

            currentWorth: 0,


            // ------------------------------------------------
            // DESCRIPTION
            // ------------------------------------------------

            description:
                "Facility for storage of animal feed and related farm supplies.",


            // ------------------------------------------------
            // STATUS
            // ------------------------------------------------

            status: "active"

        });


    try {

        await store.save();


        return {

            created: true,

            store

        };

    }

    catch (error) {

        // ==================================================
        // DUPLICATE KEY
        // ==================================================
        //
        // If another request created the feedStore at the
        // same time, the unique MongoDB index can reject
        // this insert.
        //
        // Instead of crashing initialization, retrieve the
        // feedStore that won the race.
        //
        // ==================================================

        if (
            error &&
            error.code === 11000
        ) {

            const existingStore =

                await Dairy.findOne({

                    type: FEED_STORE_TYPE,

                    assetCode: dairyCode

                });


            if (existingStore) {

                return {

                    created: false,

                    store: existingStore

                };

            }

        }


        throw error;

    }

}


// ==========================================================
// ENSURE ALL DAIRY FARMS HAVE A FEED STORE
// ==========================================================
//
// Finds every Dairy Farm:
//
//     code < 0
//
// Then:
//
//     • checks for feedStore
//     • creates one if missing
//     • leaves existing stores untouched
//
// Returns:
//
//     {
//         totalFarms,
//         existing,
//         created,
//         stores
//     }
//
// ==========================================================

async function ensureFeedStores() {

    // ======================================================
    // FIND ALL DAIRY FARMS
    // ======================================================

    const dairyFarms =

        await Dairy.find({

            code: {

                $lt: 0

            }

        })

        .sort({

            code: 1

        });


    // ======================================================
    // RESULT TRACKING
    // ======================================================

    let createdCount = 0;

    let existingCount = 0;

    const stores = [];


    // ======================================================
    // PROCESS FARMS
    // ======================================================

    for (
        const dairy of dairyFarms
    ) {

        const result =

            await ensureFeedStoreForFarm(
                dairy
            );


        if (result.created) {

            createdCount++;

        } else if (result.store) {

            existingCount++;

        }


        if (result.store) {

            stores.push(

                result.store

            );

        }

    }


    // ======================================================
    // RETURN SUMMARY
    // ======================================================

    return {

        totalFarms:
            dairyFarms.length,

        existing:
            existingCount,

        created:
            createdCount,

        totalStores:
            stores.length,

        stores

    };

}


// ==========================================================
// FIND FEED STORE FOR A DAIRY FARM
// ==========================================================
//
// Convenience helper.
//
// Example:
//
//     const store =
//         await getFeedStore(-10);
//
// ==========================================================

async function getFeedStore(
    dairyCode
) {

    const code =
        Number(dairyCode);


    if (

        !Number.isInteger(code) ||

        code >= 0

    ) {

        return null;

    }


    return Dairy.findOne({

        type: FEED_STORE_TYPE,

        assetCode: code

    });

}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    ensureFeedStoreForFarm,

    ensureFeedStores,

    getFeedStore,

    FEED_STORE_TYPE,

    FEED_STORE_PROFILE_IMAGE

};