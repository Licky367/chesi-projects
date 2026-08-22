// ==========================================================
// services/update/itemLink.js
// ==========================================================
//
// PURPOSE:
// ----------------------------------------------------------
//
// Generates the animal-feed item links displayed by:
//
//     views/update/storage/itemLink.ejs
//
// CONTRACT:
// ----------------------------------------------------------
//
// Input:
//
//     dairyId
//
// Output:
//
//     Array of itemLinks
//
// Every returned itemLink represents an animal-feed item
// belonging to an AgroStore associated with the current
// Dairy Farm.
//
// ==========================================================


const Dairy =
    require("../../models/dairy");


// ==========================================================
// GET ITEM LINKS
// ==========================================================

exports.getItemLinks =
async function (dairyId) {

    // ======================================================
    // SAFETY
    // ======================================================

    if (!dairyId) {

        return [];

    }


    // ======================================================
    // CURRENT DAIRY FARM
    // ======================================================

    const dairy =
        await Dairy.findById(
            dairyId
        )
        .lean();


    if (!dairy) {

        return [];

    }


    // ======================================================
    // ONLY DAIRY FARMS
    //
    // Dairy Farms use negative codes.
    // ======================================================

    const dairyCode =
        Number(
            dairy.code
        );


    if (
        !Number.isFinite(dairyCode) ||
        dairyCode >= 0
    ) {

        return [];

    }


    // ======================================================
    // FIND AGROSTORES
    //
    // AgroStores are structures whose roomNumber
    // is negative.
    //
    // The parent Dairy Farm is identified by:
    //
    //     farmCode === dairy.code
    //
    // ======================================================

    const agroStores =
        await Dairy.find({

            farmCode:
                dairy.code,

            roomNumber: {
                $lt: 0
            }

        })
        .sort({
            roomNumber: 1
        })
        .lean();


    if (
        !Array.isArray(
            agroStores
        )
    ) {

        return [];

    }


    // ======================================================
    // BUILD ITEM LINKS
    // ======================================================

    const itemLinks = [];


    agroStores.forEach(
        function (agroStore) {

            // ==================================================
            // SAFETY
            // ==================================================

            if (
                !agroStore ||
                !agroStore._id
            ) {

                return;

            }


            // ==================================================
            // ANIMAL FEED INVENTORY
            //
            // Animal feeds belonging to this AgroStore
            // are stored in:
            //
            //     agroStore.animalFeeds
            //
            // ==================================================

            const items =
                Array.isArray(
                    agroStore.animalFeeds
                )
                    ? agroStore.animalFeeds
                    : [];


            // ==================================================
            // CREATE LINK FOR EACH ANIMAL FEED ITEM
            // ==================================================

            items.forEach(
                function (item) {

                    // ==========================================
                    // SAFETY
                    // ==========================================

                    if (!item) {

                        return;

                    }


                    // ==========================================
                    // ITEM ID
                    // ==========================================

                    const itemId =
                        item._id ||
                        item.id;


                    if (!itemId) {

                        return;

                    }


                    // ==========================================
                    // ITEM NAME
                    // ==========================================

                    const itemName =
                        item.name ||
                        item.feedName ||
                        item.itemName ||
                        item.title ||
                        "Animal Feed";


                    // ==========================================
                    // AGROSTORE NAME
                    // ==========================================

                    const agroStoreName =
                        agroStore.name ||
                        agroStore.roomName ||
                        agroStore.roomNumber ||
                        "AgroStore";


                    // ==========================================
                    // ADD ITEM LINK
                    // ==========================================

                    itemLinks.push({

                        _id:
                            itemId,

                        name:
                            itemName,

                        agroStoreId:
                            agroStore._id,

                        agroStoreName:
                            agroStoreName,

                        href:
                            `/dairy/${itemId}`

                    });

                }
            );

        }
    );


    // ======================================================
    // RETURN ITEM LINKS
    // ======================================================

    return itemLinks;

};