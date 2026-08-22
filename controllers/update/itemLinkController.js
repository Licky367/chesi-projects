// ==========================================================
// controllers/update/itemLinkController.js
// STORAGE ITEM LINK CONTROLLER
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
//
// Fetch storage-item relationships from:
//
//     services/update/itemLink.js
//
// and make the generated details URLs available to views.
//
// Generated URL:
//
//     storage/<parentId>/contents/<storageId>/details/<itemId>
//
// ==========================================================


const {
    getAllStorageItems,
    getStorageItemLink,
    getStorageItems
} = require("../../services/update");


// ==========================================================
// LOAD ALL STORAGE ITEM LINKS
// ==========================================================
//
// Attaches:
//
//     res.locals.storageItems
//     res.locals.itemLinks
//
// This makes the links available to every view rendered
// after this middleware runs.
//
// ==========================================================

async function loadStorageItemLinks(
    req,
    res,
    next
) {

    try {

        const storageItems =
            await getAllStorageItems();


        // ==================================================
        // ALL RESOLVED ITEMS
        // ==================================================

        res.locals.storageItems =
            storageItems;


        // ==================================================
        // ITEM LINK LOOKUP
        // ==================================================
        //
        // Allows EJS to use:
        //
        //     itemLinks[item._id]
        //
        // ==================================================

        const itemLinks = {};


        for (
            const item of storageItems
        ) {

            if (
                !item ||
                !item._id ||
                !item.detailsUrl
            ) {

                continue;

            }


            itemLinks[
                String(item._id)
            ] =
                item.detailsUrl;

        }


        res.locals.itemLinks =
            itemLinks;


        next();

    } catch (error) {

        next(error);

    }

}


// ==========================================================
// GET STORAGE ITEM LINK
// ==========================================================
//
// Controller helper for a route/controller that already
// knows the item ID.
//
// Returns:
//
//     {
//         item,
//         parentFarm,
//         storage,
//         detailsUrl
//     }
//
// ==========================================================

async function getItemLink(
    req,
    res,
    next
) {

    try {

        const itemId =
            req.params.itemId;


        const result =
            await getStorageItemLink(
                itemId
            );


        if (
            !result
        ) {

            return res.status(404).json({

                success: false,

                message:
                    "Storage item could not be resolved."

            });

        }


        return res.json({

            success: true,

            ...result

        });

    } catch (error) {

        next(error);

    }

}


// ==========================================================
// LOAD ITEMS FOR A STORAGE
// ==========================================================
//
// Expected route parameters:
//
//     req.params.parentId
//     req.params.storageId
//
// Makes the following available to the view:
//
//     res.locals.storageItems
//
// and:
//
//     res.locals.itemLinks
//
// ==========================================================

async function loadStorageItems(
    req,
    res,
    next
) {

    try {

        const parentId =
            req.params.parentId ||
            req.params.dairyId ||
            req.params.farmId;


        const storageId =
            req.params.storageId;


        if (
            !parentId ||
            !storageId
        ) {

            res.locals.storageItems =
                [];

            res.locals.itemLinks =
                {};

            return next();

        }


        const storageItems =
            await getStorageItems(

                parentId,

                storageId

            );


        res.locals.storageItems =
            storageItems;


        const itemLinks = {};


        for (
            const item of storageItems
        ) {

            if (
                item &&
                item._id &&
                item.detailsUrl
            ) {

                itemLinks[
                    String(item._id)
                ] =
                    item.detailsUrl;

            }

        }


        res.locals.itemLinks =
            itemLinks;


        next();

    } catch (error) {

        next(error);

    }

}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    loadStorageItemLinks,

    loadStorageItems,

    getItemLink

};