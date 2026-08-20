// ==========================================================
// controllers/storage/contents.js
// STORAGE CONTENTS CONTROLLER
// ==========================================================
//
// PURPOSE:
//
//     Display and manage everything allocated inside a
//     Room or AgroStore.
//
// ==========================================================

const storageContentsService =
    require("../../services/storage/contents");


// ==========================================================
// GET BODY VALUE
// ==========================================================

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


// ==========================================================
// NORMALIZE SELECTED ITEM IDS
// ==========================================================

function getItemIds(
    req
) {

    const value =
        getBodyValue(
            req,
            "itemIds"
        );


    if (
        Array.isArray(value)
    ) {

        return value
            .filter(Boolean)
            .map(String);

    }


    if (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
    ) {

        return [
            String(value)
        ];

    }


    return [];

}


// ==========================================================
// CREATE SUCCESS MESSAGE
// ==========================================================

function createCountMessage(
    count,
    singular,
    plural
) {

    return `${count} ${
        count === 1
            ? singular
            : plural
    }`;

}


// ==========================================================
// RENDER CONTENTS
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


    const result =
        await storageContentsService.getStorageContents({

            dairyId,

            storageId

        });


    const activeTab =
        options.activeTab ||
        req.query.tab ||
        "view";


    const successMessage =
        options.successMessage ||
        req.query.success ||
        null;


    const pageError =
        options.pageError ||
        null;


    return res.render(
        "storage/contents",
        {

            dairy:
                result.dairy,

            storage:
                result.storage,

            items:
                result.items,

            itemCount:
                result.itemCount,

            availableItems:
                result.availableItems,

            targetStorages:
                result.targetStorages,

            activeTab,

            successMessage,

            pageError

        }
    );

}


// ==========================================================
// GET CONTENTS
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
            getItemIds(req);


        const result =
            await storageContentsService.addItemsToStorage({

                dairyId,

                storageId,

                itemIds

            });


        const message =
            `${createCountMessage(
                result.modifiedCount,
                "item",
                "items"
            )} added to ${
                result.storage.displayName ||
                "storage"
            }.`;


        return res.redirect(
            `/storage/${dairyId}/contents/${storageId}?tab=add&success=${encodeURIComponent(
                message
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
            getItemIds(req);


        const result =
            await storageContentsService.omitItemsFromStorage({

                dairyId,

                storageId,

                itemIds

            });


        const message =
            `${createCountMessage(
                result.modifiedCount,
                "item",
                "items"
            )} omitted from ${
                result.storage.displayName ||
                "storage"
            }.`;


        return res.redirect(
            `/storage/${dairyId}/contents/${storageId}?tab=view&success=${encodeURIComponent(
                message
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
            getItemIds(req);

        const targetStorageId =
            getBodyValue(
                req,
                "targetStorageId"
            );


        const result =
            await storageContentsService.reshuffleItems({

                dairyId,

                storageId,

                targetStorageId,

                itemIds

            });


        const message =
            `${createCountMessage(
                result.modifiedCount,
                "item",
                "items"
            )} reshuffled to ${
                result.targetStorage.displayName ||
                "the selected storage"
            }.`;


        return res.redirect(
            `/storage/${dairyId}/contents/${storageId}?tab=view&success=${encodeURIComponent(
                message
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


    if (
        statusCode >= 500
    ) {

        return sendError(
            res,
            error,
            "Unable to update storage contents."
        );

    }


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
            "Storage contents render error:",
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


    const safeStatus =
        statusCode >= 400 &&
        statusCode < 600
            ? statusCode
            : 500;


    return res
        .status(safeStatus)
        .send(
            error.message ||
            fallbackMessage
        );

}


// ==========================================================
// EXPORT
// ==========================================================

module.exports = {

    contents,

    addItems,

    omitItems,

    reshuffleItems

};