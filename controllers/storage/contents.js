// ==========================================================
// controllers/storage/contents.js
// STORAGE CONTENTS CONTROLLER
// ==========================================================
//
// PURPOSE:
//
//     Display and manage everything allocated inside a
//     particular Room or AgroStore.
//
// ROUTE:
//
//     GET /storage/:dairyId/contents/:storageId
//
// PARAMETERS:
//
//     dairyId
//         = parent Dairy._id
//
//     storageId
//         = DairyStorage._id
//
// ==========================================================
//
// OPERATIONS:
//
//     GET
//         View contents page
//
//     POST add
//         Add selected unallocated items to this storage
//
//     POST omit
//         Remove selected items from this storage
//         by setting:
//
//             dwellNumber = null
//
//     POST reshuffle
//         Move selected items to another storage facility
//         of the SAME TYPE belonging to the SAME FARM.
//
//         Room      → Room
//         AgroStore → AgroStore
//
// ==========================================================
//
// ALLOCATION RULE:
//
//     Dairy.assetCode
//         ===
//     parent Dairy Farm.code
//
// AND
//
//     Dairy.dwellNumber
//         ===
//     DairyStorage.roomNumber
//
// ==========================================================


const storageContentsService =
    require("../../services/storage/contents");


// ==========================================================
// HELPERS
// ==========================================================


/* ==========================================================
   GET REQUEST VALUE
========================================================== */

function getBodyValue(
    req,
    key
) {

    if (
        req.body &&
        Object.prototype.hasOwnProperty.call(
            req.body,
            key
        )
    ) {

        return req.body[key];

    }

    return undefined;

}


/* ==========================================================
   NORMALIZE SELECTED ITEM IDS
==========================================================
//
// Supports both:
//
//     itemIds=abc
//
// and:
//
//     itemIds=abc&itemIds=def
//
// depending on how the form submits the checkboxes.
//
//========================================================== */

function getItemIds(
    req
) {

    const value =
        getBodyValue(
            req,
            "itemIds"
        );


    if (Array.isArray(value)) {

        return value;

    }


    if (value) {

        return [value];

    }


    return [];

}


// ==========================================================
// RENDER CONTENTS PAGE
// ==========================================================
//
// Centralized rendering so that GET and successful
// mutations can use exactly the same page structure.
//
// ==========================================================

async function renderContents(
    req,
    res,
    options = {}
) {

    const dairyId =
        req.params.dairyId;

    const storageId =
        req.params.storageId;


    // ======================================================
    // LOAD EVERYTHING REQUIRED BY THE PAGE
    // ======================================================

    const result =
        await storageContentsService.getStorageContents({

            dairyId,

            storageId

        });


    // ======================================================
    // ACTIVE TAB
    // ======================================================
    //
    // Default:
    //
    //     view
    //
    // When the user submits Add and validation fails,
    // the controller can return to:
    //
    //     add
    //
    // ======================================================

    const activeTab =
        options.activeTab ||
        req.query.tab ||
        "view";


    // ======================================================
    // SUCCESS / ERROR MESSAGE
    // ======================================================

    const successMessage =
        options.successMessage ||
        null;

    const pageError =
        options.pageError ||
        null;


    // ======================================================
    // RENDER
    // ======================================================

    return res.render(
        "storage/contents",
        {

            dairy:
                result.dairy,

            storage:
                result.storage,

            // ----------------------------------------------
            // CURRENT CONTENTS
            // ----------------------------------------------

            items:
                result.items,

            itemCount:
                result.itemCount,

            // ----------------------------------------------
            // ITEMS AVAILABLE FOR ADDITION
            // ----------------------------------------------

            availableItems:
                result.availableItems,

            // ----------------------------------------------
            // SAME-TYPE TARGET STORAGE FACILITIES
            // ----------------------------------------------

            targetStorages:
                result.targetStorages,

            // ----------------------------------------------
            // UI STATE
            // ----------------------------------------------

            activeTab,

            successMessage,

            pageError

        }
    );

}


// ==========================================================
// GET STORAGE CONTENTS
// ==========================================================
//
// ROUTE:
//
//     GET /storage/:dairyId/contents/:storageId
//
// ==========================================================

async function contents(
    req,
    res
) {

    try {

        return await renderContents(
            req,
            res
        );

    } catch (error) {

        console.error(
            "Storage contents error:",
            error
        );


        return sendError(
            res,
            error,
            "Unable to load storage contents."
        );

    }

}


// ==========================================================
// ADD ITEMS
// ==========================================================
//
// EXPECTED BODY:
//
//     itemIds
//
// Example:
//
//     itemIds[]=id1
//     itemIds[]=id2
//
// SERVICE:
//
//     addItemsToStorage()
//
// RESULT:
//
//     dwellNumber becomes the current storage.roomNumber.
//
// ==========================================================

async function addItems(
    req,
    res
) {

    try {

        const dairyId =
            req.params.dairyId;

        const storageId =
            req.params.storageId;

        const itemIds =
            getItemIds(
                req
            );


        // ==================================================
        // SERVICE
        // ==================================================

        const result =
            await storageContentsService.addItemsToStorage({

                dairyId,

                storageId,

                itemIds

            });


        // ==================================================
        // SUCCESS
        // ==================================================
        //
        // Redirect back to the contents page.
        //
        // This prevents duplicate submissions when the user
        // refreshes the browser.
        //
        // ==================================================

        return res.redirect(
            `/storage/${dairyId}/contents/${storageId}?tab=add&success=${encodeURIComponent(
                `${result.modifiedCount} ${
                    result.modifiedCount === 1
                        ? "item"
                        : "items"
                } added to ${result.storage.displayName || "storage"}.`
            )}`
        );


    } catch (error) {

        console.error(
            "Storage add items error:",
            error
        );


        return handleMutationError(
            req,
            res,
            error,
            "add"
        );

    }

}


// ==========================================================
// OMIT ITEMS
// ==========================================================
//
// EXPECTED BODY:
//
//     itemIds
//
// OPERATION:
//
//     dwellNumber = null
//
// ==========================================================

async function omitItems(
    req,
    res
) {

    try {

        const dairyId =
            req.params.dairyId;

        const storageId =
            req.params.storageId;

        const itemIds =
            getItemIds(
                req
            );


        // ==================================================
        // SERVICE
        // ==================================================

        const result =
            await storageContentsService.omitItemsFromStorage({

                dairyId,

                storageId,

                itemIds

            });


        // ==================================================
        // SUCCESS
        // ==================================================

        return res.redirect(
            `/storage/${dairyId}/contents/${storageId}?tab=view&success=${encodeURIComponent(
                `${result.modifiedCount} ${
                    result.modifiedCount === 1
                        ? "item"
                        : "items"
                } omitted from ${result.storage.displayName || "storage"}.`
            )}`
        );


    } catch (error) {

        console.error(
            "Storage omit items error:",
            error
        );


        return handleMutationError(
            req,
            res,
            error,
            "view"
        );

    }

}


// ==========================================================
// RESHUFFLE ITEMS
// ==========================================================
//
// EXPECTED BODY:
//
//     itemIds
//     targetStorageId
//
// OPERATION:
//
//     dwellNumber = targetStorage.roomNumber
//
// ==========================================================

async function reshuffleItems(
    req,
    res
) {

    try {

        const dairyId =
            req.params.dairyId;

        const storageId =
            req.params.storageId;

        const itemIds =
            getItemIds(
                req
            );

        const targetStorageId =
            getBodyValue(
                req,
                "targetStorageId"
            );


        // ==================================================
        // SERVICE
        // ==================================================

        const result =
            await storageContentsService.reshuffleItems({

                dairyId,

                storageId,

                targetStorageId,

                itemIds

            });


        // ==================================================
        // SUCCESS
        // ==================================================

        return res.redirect(
            `/storage/${dairyId}/contents/${storageId}?tab=view&success=${encodeURIComponent(
                `${result.modifiedCount} ${
                    result.modifiedCount === 1
                        ? "item"
                        : "items"
                } reshuffled to ${
                    result.targetStorage.displayName ||
                    "the selected storage"
                }.`
            )}`
        );


    } catch (error) {

        console.error(
            "Storage reshuffle error:",
            error
        );


        return handleMutationError(
            req,
            res,
            error,
            "view"
        );

    }

}


// ==========================================================
// HANDLE MUTATION ERROR
// ==========================================================
//
// Instead of returning a plain error page, return the user
// to the contents page.
//
// This is particularly useful for:
//
//     - no items selected
//     - invalid target storage
//     - wrong storage type
//     - item already allocated
//     - item belongs to another farm
//
// ==========================================================

async function handleMutationError(
    req,
    res,
    error,
    activeTab
) {

    const statusCode =
        Number(
            error.status ||
            error.statusCode ||
            500
        );


    // ======================================================
    // FOR SERVER ERRORS
    // ======================================================

    if (
        statusCode >= 500
    ) {

        return sendError(
            res,
            error,
            "Unable to update storage contents."
        );

    }


    // ======================================================
    // FOR EXPECTED USER / VALIDATION ERRORS
    // ======================================================

    try {

        return await renderContents(
            req,
            res,
            {

                activeTab,

                pageError:
                    error.message ||
                    "Unable to update storage contents."

            }
        );

    } catch (renderError) {

        console.error(
            "Storage contents error rendering failed:",
            renderError
        );


        return sendError(
            res,
            renderError,
            "Unable to update storage contents."
        );

    }

}


// ==========================================================
// SEND ERROR
// ==========================================================

function sendError(
    res,
    error,
    fallbackMessage
) {

    const statusCode =
        Number(
            error.status ||
            error.statusCode ||
            500
        );


    return res
        .status(
            statusCode >= 400 &&
            statusCode < 600
                ? statusCode
                : 500
        )
        .send(
            error.message ||
            fallbackMessage
        );

}


// ==========================================================
// EXPORT
// ==========================================================
//
// The router can now map:
//
//     contents
//     addItems
//     omitItems
//     reshuffleItems
//
// ==========================================================

module.exports = {

    contents,

    addItems,

    omitItems,

    reshuffleItems

};