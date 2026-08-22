// ==========================================================
// services/update/itemLink.js
// ==========================================================
//
// PURPOSE:
//
// Generates the animal-feed item links that are displayed
// on:
//
//     views/update/storage/itemLink.ejs
//
// CONTRACT:
//
//     Input:
//         dairy
//
//     Output:
//         Array of itemLinks
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
    // CURRENT DAIRY
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
    // ONLY DAIRY FARM
    //
    // Dairy Farms use negative codes.
    // ======================================================

    const dairyCode =
        Number(dairy.code);


    if (
        !Number.isFinite(dairyCode) ||
        dairyCode >= 0
    ) {

        return [];

    }


    // ======================================================
    // FIND AGROSTORES
    //
    // AgroStores are structures whose roomNumber is
    // negative.
    //
    // The parent farm is identified through farmCode.
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


    if (!Array.isArray(agroStores)) {

        return [];

    }


    // ======================================================
    // BUILD ITEM LINKS
    // ======================================================

    const itemLinks = [];


    agroStores.forEach(
        function (agroStore) {

            if (
                !agroStore ||
                !agroStore._id
            ) {

                return;

            }


            // ==================================================
            // INVENTORY
            //
            // Animal feeds associated with this AgroStore
            // use:
            //
            //     Dairy.dwellNumber ===
            //     AgroStore.roomNumber
            //
            // ==================================================

            const items =
                Array.isArray(
                    agroStore.animalFeeds
                )
                    ? agroStore.animalFeeds
                    : [];


            // ==================================================
            // CREATE LINK FOR EACH ITEM
            // ==================================================

            items.forEach(
                function (item) {

                    if (!item) {

                        return;

                    }


                    const itemId =
                        item._id ||
                        item.id;


                    if (!itemId) {

                        return;

                    }


                    const itemName =
                        item.name ||
                        item.feedName ||
                        item.itemName ||
                        item.title ||
                        "Animal Feed";


                    itemLinks.push({

                        _id:
                            itemId,

                        name:
                            itemName,

                        agroStoreId:
                            agroStore._id,

                        agroStoreName:
                            agroStore.name ||
                            agroStore.roomName ||
                            agroStore.roomNumber ||
                            "AgroStore",

                        href:
                            `/dairy/${itemId}`

                    });

                }
            );

        }
    );


    // ======================================================
    // RETURN
    // ======================================================

    return itemLinks;

};