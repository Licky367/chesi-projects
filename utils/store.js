// ==========================================================
// utils/store.js
// ==========================================================
//
// AGROSTORE / FEED STORE INITIALIZER
//
// RESPONSIBILITIES
// ----------------------------------------------------------
//
// 1. Delete ALL existing feedStore Dairy documents.
//
// 2. Find all existing Dairy Farms.
//
// 3. Create exactly ONE new feedStore / AgroStore for every
//    existing Dairy Farm.
//
// 4. The new AgroStore is a standalone Dairy document.
//
// 5. The AgroStore is identified by:
//
//        type === "feedStore"
//        storageNumber === dairyFarm.code
//
// CANONICAL RELATIONSHIP
// ----------------------------------------------------------
//
// Dairy Farm:
//
//     code: -10
//     name: "Green Valley Farm"
//
// AgroStore:
//
//     code: null
//     type: "feedStore"
//     storageNumber: -10
//     name: "Green Valley Farm's AgroStore"
//
// IMPORTANT
// ----------------------------------------------------------
//
// `assetCode` is NO LONGER used to connect the AgroStore
// to the Dairy Farm.
//
// The canonical relationship is:
//
//     feedStore.storageNumber === dairyFarm.code
//
// PROFILE IMAGE
// ----------------------------------------------------------
//
// Physical file:
//
//     public/images/h2.png
//
// Public URL:
//
//     /images/h2.png
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
// CREATE AGROSTORE FOR ONE DAIRY FARM
// ==========================================================
//
// A new AgroStore is ALWAYS created by this initializer.
//
// The caller should normally use this after old feedStore
// documents have been deleted.
//
// ==========================================================

async function createFeedStoreForFarm(
    dairy
) {

    // ======================================================
    // VALIDATE FARM
    // ======================================================

    if (!dairy) {

        return {

            created: false,

            store: null,

            reason:
                "Dairy farm was not provided."

        };

    }


    // ======================================================
    // DAIRY FARM CODE
    // ======================================================
    //
    // Dairy farms are identified by negative integer codes.
    //
    // ======================================================

    const dairyCode =
        Number(
            dairy.code
        );


    if (
        !Number.isInteger(
            dairyCode
        ) ||
        dairyCode >= 0
    ) {

        return {

            created: false,

            store: null,

            reason:
                "Document is not a valid dairy farm."

        };

    }


    // ======================================================
    // FARM NAME
    // ======================================================

    const farmName =
        String(
            dairy.name || ""
        ).trim();


    if (!farmName) {

        return {

            created: false,

            store: null,

            reason:
                "Dairy farm has no name."

        };

    }


    // ======================================================
    // AGROSTORE NAME
    // ======================================================

    const storeName =
        `${farmName}'s AgroStore`;


    // ======================================================
    // CREATE NEW AGROSTORE
    // ======================================================
    //
    // IMPORTANT:
    //
    // This is a completely new Dairy document.
    //
    // It is NOT embedded inside the farm.
    //
    // It is NOT linked through assetCode.
    //
    // ======================================================

    const store =
        new Dairy({

            // ------------------------------------------------
            // STRUCTURE / FACILITY
            // ------------------------------------------------
            //
            // code === null means this is a structure/facility.
            //
            code: null,


            // ------------------------------------------------
            // NAME
            // ------------------------------------------------

            name:
                storeName,


            // ------------------------------------------------
            // FACILITY TYPE
            // ------------------------------------------------

            type:
                FEED_STORE_TYPE,


            // ------------------------------------------------
            // STORAGE NUMBER
            // ------------------------------------------------
            //
            // THIS IS THE CANONICAL LINK TO THE FARM.
            //
            // Example:
            //
            // farm.code = -10
            //
            // store.storageNumber = -10
            //
            // ------------------------------------------------

            storageNumber:
                dairyCode,


            // ------------------------------------------------
            // DO NOT USE assetCode
            // ------------------------------------------------
            //
            // The new architecture uses storageNumber.
            //
            // Therefore assetCode is deliberately omitted.
            //
            // ------------------------------------------------


            // ------------------------------------------------
            // PROFILE IMAGE
            // ------------------------------------------------
            //
            // Physical file:
            //
            //     public/images/h2.png
            //
            // Browser URL:
            //
            //     /images/h2.png
            //
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
            // AgroStore is not an animal.
            //
            // ------------------------------------------------

            dateOfBirth:
                null,

            mass:
                0,

            isMilking:
                false,


            // ------------------------------------------------
            // FEED STOCK
            // ------------------------------------------------
            //
            // Every new AgroStore starts empty.
            //
            // ------------------------------------------------

            feedStocks:
                [],

            feedsAmount:
                0,


            // ------------------------------------------------
            // ASSET / FINANCIAL VALUES
            // ------------------------------------------------

            buyingPrice:
                0,

            sellingPrice:
                0,

            revenue:
                0,

            currentWorth:
                0,


            // ------------------------------------------------
            // DESCRIPTION
            // ------------------------------------------------

            description:
                "AgroStore for storage of animal feed, veterinary medicine and related farm supplies.",


            // ------------------------------------------------
            // STATUS
            // ------------------------------------------------

            status:
                "active"

        });


    // ======================================================
    // SAVE
    // ======================================================

    await store.save();


    // ======================================================
    // RETURN
    // ======================================================

    return {

        created:
            true,

        store

    };

}


// ==========================================================
// DELETE ALL EXISTING FEED STORES
// ==========================================================
//
// IMPORTANT
// ----------------------------------------------------------
//
// This removes ALL existing Dairy documents where:
//
//     type === "feedStore"
//
// This is intentionally done before rebuilding the AgroStores.
//
// ==========================================================

async function deleteExistingFeedStores() {

    const result =
        await Dairy.deleteMany({

            type:
                FEED_STORE_TYPE

        });


    return {

        deletedCount:
            Number(
                result.deletedCount || 0
            )

    };

}


// ==========================================================
// ENSURE ALL AGROSTORES
// ==========================================================
//
// PROCESS
// ----------------------------------------------------------
//
// STEP 1
//     Delete every existing feedStore.
//
// STEP 2
//     Find every existing Dairy Farm.
//
// STEP 3
//     Create a fresh AgroStore for every farm.
//
// STEP 4
//     storageNumber = farm.code
//
// STEP 5
//     name = farm.name + "'s AgroStore"
//
// ==========================================================

async function ensureFeedStores() {

    // ======================================================
    // STEP 1
    // DELETE OLD FEED STORES
    // ======================================================

    const deletion =
        await deleteExistingFeedStores();


    // ======================================================
    // STEP 2
    // FIND ALL DAIRY FARMS
    // ======================================================
    //
    // Dairy Farm:
    //
    //     code < 0
    //
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

    let createdCount =
        0;


    let failedCount =
        0;


    const stores =
        [];


    const failures =
        [];


    // ======================================================
    // STEP 3
    // CREATE AGROSTORE FOR EACH FARM
    // ======================================================

    for (
        const dairy of dairyFarms
    ) {

        try {

            const result =
                await createFeedStoreForFarm(
                    dairy
                );


            if (
                result.created &&
                result.store
            ) {

                createdCount++;


                stores.push(
                    result.store
                );

            }

            else {

                failedCount++;


                failures.push({

                    dairyId:
                        dairy._id,

                    dairyCode:
                        dairy.code,

                    dairyName:
                        dairy.name,

                    reason:
                        result.reason ||
                        "AgroStore was not created."

                });

            }

        }

        catch (error) {

            failedCount++;


            failures.push({

                dairyId:
                    dairy._id,

                dairyCode:
                    dairy.code,

                dairyName:
                    dairy.name,

                reason:
                    error.message ||
                    "Unable to create AgroStore."

            });


            console.error(

                "AGROSTORE CREATION ERROR:",

                {
                    dairyId:
                        dairy._id,

                    dairyCode:
                        dairy.code,

                    dairyName:
                        dairy.name,

                    error

                }

            );

        }

    }


    // ======================================================
    // RETURN SUMMARY
    // ======================================================

    return {

        // --------------------------------------------------
        // OLD STORES REMOVED
        // --------------------------------------------------

        deleted:
            deletion.deletedCount,


        deletedFeedStores:
            deletion.deletedCount,


        // --------------------------------------------------
        // FARMS
        // --------------------------------------------------

        totalFarms:
            dairyFarms.length,


        // --------------------------------------------------
        // NEW STORES
        // --------------------------------------------------

        created:
            createdCount,


        totalStores:
            stores.length,


        // --------------------------------------------------
        // FAILURES
        // --------------------------------------------------

        failed:
            failedCount,


        failures,


        // --------------------------------------------------
        // CREATED STORES
        // --------------------------------------------------

        stores

    };

}


// ==========================================================
// GET AGROSTORE FOR A DAIRY FARM
// ==========================================================
//
// The supplied value is the Dairy Farm's `code`.
//
// Example:
//
//     await getFeedStore(-10);
//
// Finds:
//
//     {
//         type: "feedStore",
//         storageNumber: -10
//     }
//
// ==========================================================

async function getFeedStore(
    dairyCode
) {

    const code =
        Number(
            dairyCode
        );


    if (
        !Number.isInteger(
            code
        ) ||
        code >= 0
    ) {

        return null;

    }


    return Dairy.findOne({

        type:
            FEED_STORE_TYPE,

        storageNumber:
            code

    });

}


// ==========================================================
// GET AGROSTORE BY STORAGE NUMBER
// ==========================================================
//
// This is an explicit helper for the new architecture.
//
// Example:
//
//     await getFeedStoreByStorageNumber(-10);
//
// ==========================================================

async function getFeedStoreByStorageNumber(
    storageNumber
) {

    const number =
        Number(
            storageNumber
        );


    if (
        !Number.isInteger(
            number
        )
    ) {

        return null;

    }


    return Dairy.findOne({

        type:
            FEED_STORE_TYPE,

        storageNumber:
            number

    });

}


// ==========================================================
// GET ALL AGROSTORES
// ==========================================================

async function getFeedStores() {

    return Dairy.find({

        type:
            FEED_STORE_TYPE

    })
    .sort({

        storageNumber: 1

    });

}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    createFeedStoreForFarm,

    deleteExistingFeedStores,

    ensureFeedStores,

    getFeedStore,

    getFeedStoreByStorageNumber,

    getFeedStores,

    FEED_STORE_TYPE,

    FEED_STORE_PROFILE_IMAGE

};