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
//     /storage/<parentId>/contents/<storageId>/details/<itemId>
//
// VARIABLE CONTRACT
// ----------------------------------------------------------
//
// The same variable name is used throughout:
//
//     itemLinks
//
// `itemLinks` is an ARRAY of resolved storage-item objects.
//
// Each itemLink may contain:
//
//     _id
//     name
//     feedName
//     itemName
//     title
//     agroStoreName
//     storageName
//     storeName
//     href
//     url
//     detailsUrl
//
// This matches:
//
//     views/update/storage/itemLink.ejs
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
// `itemLinks` is always an ARRAY.
//
// This makes the resolved items available to views rendered
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
        // SAFE STORAGE ITEM ARRAY
        // ==================================================

        const itemLinks =
            Array.isArray(storageItems)
                ? storageItems
                : [];


        // ==================================================
        // ALL RESOLVED STORAGE ITEMS
        // ==================================================

        res.locals.storageItems =
            itemLinks;


        // ==================================================
        // ITEM LINKS
        // ==================================================
        //
        // The view contract is:
        //
        //     itemLinks
        //
        // Do NOT convert this into an object keyed by _id.
        //
        // itemLink.ejs expects:
        //
        //     itemLinks.forEach(...)
        //
        // ==================================================

        res.locals.itemLinks =
            itemLinks;


        return next();

    } catch (error) {

        return next(error);

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


        // ==================================================
        // ITEM ID REQUIRED
        // ==================================================

        if (!itemId) {

            return res
                .status(400)
                .json({

                    success: false,

                    message:
                        "Storage item ID is required."

                });

        }


        // ==================================================
        // RESOLVE STORAGE ITEM
        // ==================================================

        const result =
            await getStorageItemLink(
                itemId
            );


        // ==================================================
        // ITEM NOT FOUND
        // ==================================================

        if (!result) {

            return res
                .status(404)
                .json({

                    success: false,

                    message:
                        "Storage item could not be resolved."

                });

        }


        // ==================================================
        // SUCCESS
        // ==================================================

        return res
            .status(200)
            .json({

                success: true,

                ...result

            });

    } catch (error) {

        return next(error);

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
// Also accepts:
//
//     req.params.dairyId
//     req.params.farmId
//
// Makes the following available to the view:
//
//     res.locals.storageItems
//     res.locals.itemLinks
//
// Both are ALWAYS ARRAYS.
//
// ==========================================================

async function loadStorageItems(
    req,
    res,
    next
) {

    try {

        // ==================================================
        // PARENT DAIRY / FARM ID
        // ==================================================

        const parentId =
            req.params.parentId ||
            req.params.dairyId ||
            req.params.farmId;


        // ==================================================
        // STORAGE ID
        // ==================================================

        const storageId =
            req.params.storageId;


        // ==================================================
        // REQUIRED PARAMETERS MISSING
        //
        // Keep the view contract safe by supplying empty
        // arrays instead of leaving variables undefined.
        // ==================================================

        if (
            !parentId ||
            !storageId
        ) {

            res.locals.storageItems =
                [];

            res.locals.itemLinks =
                [];

            return next();

        }


        // ==================================================
        // GET STORAGE ITEMS
        // ==================================================

        const storageItems =
            await getStorageItems(

                parentId,

                storageId

            );


        // ==================================================
        // SAFE ARRAY
        // ==================================================

        const itemLinks =
            Array.isArray(storageItems)
                ? storageItems
                : [];


        // ==================================================
        // STORAGE ITEMS
        // ==================================================

        res.locals.storageItems =
            itemLinks;


        // ==================================================
        // ITEM LINKS
        //
        // Keep the SAME ARRAY.
        //
        // itemLink.ejs expects:
        //
        //     itemLinks.forEach(function (itemLink) {
        //
        // ==================================================

        res.locals.itemLinks =
            itemLinks;


        return next();

    } catch (error) {

        return next(error);

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