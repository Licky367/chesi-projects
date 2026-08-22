// ==========================================================
// controllers/storage/contents.js
// STORAGE CONTENTS CONTROLLER
// ==========================================================
//
// PURPOSE:
//
//     Display and manage everything allocated inside an
//     existing Room or AgroStore.
//
// PAGES:
//
//     /storage/:dairyId/contents/:storageId
//
//     /storage/:dairyId/contents/:storageId/details/:itemId
//
// STORAGE TYPES:
//
//     room
//         - normal storage
//         - add
//         - omit
//         - reshuffle
//
//     agroStore
//         - feed storage
//         - add feeds
//         - update quantity
//         - automatic omission when quantity = 0
//         - no manual omit
//         - no reshuffle
//
// IMPORTANT:
//
//     Every render of storage/content-item.ejs explicitly
//     receives:
//
//         successMessage
//         pageError
//
//     This prevents:
//
//         ReferenceError:
//         successMessage is not defined
//
// ==========================================================


const storageContentsService =
    require("../../services/storage");


// ==========================================================
// STORAGE TYPES
// ==========================================================

const STORAGE_TYPES = {

    ROOM: "room",

    AGRO_STORE: "agroStore"

};


// ==========================================================
// BODY HELPERS
// ==========================================================

function getBodyValue(req, key) {

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
// GET ITEM IDS
// ==========================================================

function getItemIds(req) {

    const value =
        getBodyValue(
            req,
            "itemIds"
        );


    if (Array.isArray(value)) {

        return value
            .filter(Boolean)
            .map(
                value => String(value).trim()
            )
            .filter(Boolean);

    }


    if (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
    ) {

        return [
            String(value).trim()
        ];

    }


    return [];

}


// ==========================================================
// CREATE COUNT MESSAGE
// ==========================================================

function createCountMessage(
    count,
    singular,
    plural
) {

    const safeCount =
        Number(count) || 0;


    return `${safeCount} ${
        safeCount === 1
            ? singular
            : plural
    }`;

}


// ==========================================================
// ROUTE IDS
// ==========================================================

function getRouteIds(req) {

    return {

        dairyId:
            String(
                req.params?.dairyId || ""
            ).trim(),

        storageId:
            String(
                req.params?.storageId || ""
            ).trim()

    };

}


// ==========================================================
// CONTENT ITEM ROUTE IDS
// ==========================================================

function getContentItemRouteIds(req) {

    return {

        dairyId:
            String(
                req.params?.dairyId || ""
            ).trim(),

        storageId:
            String(
                req.params?.storageId || ""
            ).trim(),

        itemId:
            String(
                req.params?.itemId || ""
            ).trim()

    };

}


// ==========================================================
// CONTENTS URL
// ==========================================================

function getContentsUrl(
    dairyId,
    storageId,
    query = {}
) {

    const baseUrl =
        `/storage/${encodeURIComponent(
            dairyId
        )}/contents/${encodeURIComponent(
            storageId
        )}`;


    const params =
        new URLSearchParams();


    Object.entries(query).forEach(
        function ([key, value]) {

            if (
                value !== undefined &&
                value !== null &&
                String(value) !== ""
            ) {

                params.set(
                    key,
                    String(value)
                );

            }

        }
    );


    const queryString =
        params.toString();


    return queryString
        ? `${baseUrl}?${queryString}`
        : baseUrl;

}


// ==========================================================
// CONTENT ITEM URL
// ==========================================================

function getContentItemUrl(
    dairyId,
    storageId,
    itemId
) {

    return (
        `/storage/${encodeURIComponent(
            dairyId
        )}` +
        `/contents/${encodeURIComponent(
            storageId
        )}` +
        `/details/${encodeURIComponent(
            itemId
        )}`
    );

}


// ==========================================================
// VALIDATE STORAGE TYPE
// ==========================================================

function validateStorageType(storage) {

    const storageType =
        storage?.type;


    if (
        storageType !== STORAGE_TYPES.ROOM &&
        storageType !== STORAGE_TYPES.AGRO_STORE
    ) {

        const error =
            new Error(
                "Storage facility must be either room or agroStore."
            );

        error.status = 400;

        throw error;

    }


    return storageType;

}


// ==========================================================
// FIND ITEM INSIDE STORAGE
// ==========================================================

function findContentItem(
    items,
    itemId
) {

    if (!Array.isArray(items)) {

        return null;

    }


    return (
        items.find(
            function (item) {

                if (
                    !item ||
                    item._id === undefined ||
                    item._id === null
                ) {

                    return false;

                }


                return (
                    String(item._id) ===
                    String(itemId)
                );

            }
        ) || null
    );

}


// ==========================================================
// NORMALIZE RENDER VARIABLES
// ==========================================================
//
// This is important.
//
// EJS throws:
//
//     ReferenceError:
//     successMessage is not defined
//
// when a variable was not supplied at all.
//
// We therefore ALWAYS supply:
//
//     successMessage
//     pageError
//
// even when their value is null.
//
// ==========================================================

function getRenderMessages(
    req,
    options = {}
) {

    const querySuccess =
        req.query?.success;


    const successMessage =
        options.successMessage !== undefined
            ? options.successMessage
            : (
                querySuccess !== undefined
                    ? String(querySuccess)
                    : null
            );


    const pageError =
        options.pageError !== undefined
            ? options.pageError
            : null;


    return {

        successMessage,

        pageError

    };

}


// ==========================================================
// RENDER STORAGE CONTENTS
// ==========================================================

async function renderContents(
    req,
    res,
    options = {}
) {

    // ------------------------------------------------------
    // IDS
    // ------------------------------------------------------

    const {
        dairyId,
        storageId
    } =
        getRouteIds(req);


    // ------------------------------------------------------
    // REQUIRE DAIRY ID
    // ------------------------------------------------------

    if (!dairyId) {

        const error =
            new Error(
                "Dairy ID is required."
            );

        error.status = 400;

        throw error;

    }


    // ------------------------------------------------------
    // REQUIRE STORAGE ID
    // ------------------------------------------------------

    if (!storageId) {

        const error =
            new Error(
                "Storage ID is required."
            );

        error.status = 400;

        throw error;

    }


    // ------------------------------------------------------
    // LOAD STORAGE CONTENTS
    // ------------------------------------------------------

    const result =
        await storageContentsService
            .getStorageContents({
                dairyId,
                storageId
            });


    // ------------------------------------------------------
    // REQUIRE RESULT
    // ------------------------------------------------------

    if (
        !result ||
        !result.storage
    ) {

        const error =
            new Error(
                "Storage facility not found."
            );

        error.status = 404;

        throw error;

    }


    // ------------------------------------------------------
    // STORAGE TYPE
    // ------------------------------------------------------

    const storageType =
        validateStorageType(
            result.storage
        );


    // ------------------------------------------------------
    // ACTIVE TAB
    // ------------------------------------------------------

    const activeTab =
        options.activeTab ||
        req.query?.tab ||
        "view";


    // ------------------------------------------------------
    // MESSAGES
    // ------------------------------------------------------

    const {
        successMessage,
        pageError
    } =
        getRenderMessages(
            req,
            options
        );


    // ------------------------------------------------------
    // RENDER
    // ------------------------------------------------------

    return res.render(
        "storage/contents",
        {

            // =================================================
            // BASIC PAGE INFORMATION
            // =================================================

            title:
                result.storage.displayName ||
                result.storage.name ||
                "Storage Contents",


            // =================================================
            // DAIRY
            // =================================================

            dairy:
                result.dairy || null,


            dairyId,


            // =================================================
            // STORAGE
            // =================================================

            storage:
                result.storage,


            storageId,


            // =================================================
            // STORAGE TYPE
            // =================================================

            storageType,


            isRoom:
                storageType ===
                STORAGE_TYPES.ROOM,


            isAgroStore:
                storageType ===
                STORAGE_TYPES.AGRO_STORE,


            // =================================================
            // CONTENTS
            // =================================================

            items:
                Array.isArray(result.items)
                    ? result.items
                    : [],


            itemCount:
                Number(result.itemCount) || 0,


            availableItems:
                Array.isArray(
                    result.availableItems
                )
                    ? result.availableItems
                    : [],


            targetStorages:
                Array.isArray(
                    result.targetStorages
                )
                    ? result.targetStorages
                    : [],


            // =================================================
            // UI STATE
            // =================================================

            activeTab,


            // IMPORTANT:
            // ALWAYS DEFINED
            successMessage,


            // IMPORTANT:
            // ALWAYS DEFINED
            pageError

        }
    );

}


// ==========================================================
// GET CONTENT ITEM DETAILS
// ==========================================================
//
// GET:
//
// /storage/:dairyId/contents/:storageId/details/:itemId
//
// ==========================================================

async function contentItem(req, res) {

    try {

        // ----------------------------------------------------
        // ROUTE IDS
        // ----------------------------------------------------

        const {
            dairyId,
            storageId,
            itemId
        } =
            getContentItemRouteIds(req);


        // ----------------------------------------------------
        // VALIDATE DAIRY ID
        // ----------------------------------------------------

        if (!dairyId) {

            const error =
                new Error(
                    "Dairy ID is required."
                );

            error.status = 400;

            throw error;

        }


        // ----------------------------------------------------
        // VALIDATE STORAGE ID
        // ----------------------------------------------------

        if (!storageId) {

            const error =
                new Error(
                    "Storage ID is required."
                );

            error.status = 400;

            throw error;

        }


        // ----------------------------------------------------
        // VALIDATE ITEM ID
        // ----------------------------------------------------

        if (!itemId) {

            const error =
                new Error(
                    "Content item ID is required."
                );

            error.status = 400;

            throw error;

        }


        // ----------------------------------------------------
        // GET STORAGE CONTENTS
        // ----------------------------------------------------

        const result =
            await storageContentsService
                .getStorageContents({
                    dairyId,
                    storageId
                });


        // ----------------------------------------------------
        // REQUIRE RESULT
        // ----------------------------------------------------

        if (!result) {

            const error =
                new Error(
                    "Storage contents could not be loaded."
                );

            error.status = 404;

            throw error;

        }


        // ----------------------------------------------------
        // REQUIRE STORAGE
        // ----------------------------------------------------

        if (!result.storage) {

            const error =
                new Error(
                    "Storage facility not found."
                );

            error.status = 404;

            throw error;

        }


        // ----------------------------------------------------
        // VALIDATE STORAGE TYPE
        // ----------------------------------------------------

        const storageType =
            validateStorageType(
                result.storage
            );


        // ----------------------------------------------------
        // FIND ITEM
        // ----------------------------------------------------

        const item =
            findContentItem(
                result.items || [],
                itemId
            );


        // ----------------------------------------------------
        // ITEM NOT FOUND
        // ----------------------------------------------------

        if (!item) {

            const error =
                new Error(
                    "Content item was not found in this storage facility."
                );

            error.status = 404;

            throw error;

        }


        // ----------------------------------------------------
        // MESSAGES
        // ----------------------------------------------------
        //
        // THIS IS THE FIX FOR:
        //
        //     successMessage is not defined
        //
        // We explicitly provide BOTH variables to EJS.
        //
        // ----------------------------------------------------

        const {
            successMessage,
            pageError
        } =
            getRenderMessages(
                req
            );


        // ----------------------------------------------------
        // CONTENTS URL
        // ----------------------------------------------------

        const contentsUrl =
            getContentsUrl(
                dairyId,
                storageId
            );


        // ----------------------------------------------------
        // ITEM URL
        // ----------------------------------------------------

        const contentItemUrl =
            getContentItemUrl(
                dairyId,
                storageId,
                itemId
            );


        // ----------------------------------------------------
        // RENDER
        // ----------------------------------------------------

        return res.render(
            "storage/content-item",
            {

                // =================================================
                // PAGE
                // =================================================

                title:
                    item.name ||
                    "Content Item",


                // =================================================
                // DAIRY
                // =================================================

                dairy:
                    result.dairy || null,


                dairyId,


                // =================================================
                // STORAGE
                // =================================================

                storage:
                    result.storage,


                storageId,


                // =================================================
                // ITEM
                // =================================================

                item,


                itemId,


                // =================================================
                // STORAGE TYPE
                // =================================================

                storageType,


                isRoom:
                    storageType ===
                    STORAGE_TYPES.ROOM,


                isAgroStore:
                    storageType ===
                    STORAGE_TYPES.AGRO_STORE,


                // =================================================
                // URLS
                // =================================================

                contentsUrl,

                contentItemUrl,


                // =================================================
                // IMPORTANT EJS VARIABLES
                // =================================================
                //
                // These MUST exist even when null.
                //
                // =================================================

                successMessage,

                pageError

            }
        );

    } catch (error) {

        console.error(
            "Storage content item error:",
            error
        );


        return sendError(
            res,
            error,
            "Unable to load content item."
        );

    }

}


// ==========================================================
// GET STORAGE CONTENTS
// ==========================================================

async function contents(req, res) {

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
// ADD ITEMS TO STORAGE
// ==========================================================
//
// POST:
//
// /storage/:dairyId/contents/:storageId/add
//
// ==========================================================

async function addItems(req, res) {

    try {

        const {
            dairyId,
            storageId
        } =
            getRouteIds(req);


        const itemIds =
            getItemIds(req);


        const result =
            await storageContentsService
                .addItemsToStorage({
                    dairyId,
                    storageId,
                    itemIds
                });


        const message =
            `${createCountMessage(
                result?.modifiedCount,
                "item",
                "items"
            )} added to ${
                result?.storage?.displayName ||
                result?.storage?.name ||
                "storage"
            }.`;



        return res.redirect(
            getContentsUrl(
                dairyId,
                storageId,
                {
                    tab: "add",
                    success: message
                }
            )
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
// UPDATE AGROSTORE QUANTITY
// ==========================================================
//
// POST:
//
// /storage/:dairyId/contents/:storageId/quantity
//
// ==========================================================

async function updateQuantity(req, res) {

    try {

        const {
            dairyId,
            storageId
        } =
            getRouteIds(req);


        const itemId =
            getBodyValue(
                req,
                "itemId"
            );


        const quantity =
            getBodyValue(
                req,
                "quantity"
            );


        const unit =
            getBodyValue(
                req,
                "unit"
            );


        const result =
            await storageContentsService
                .updateFeedQuantity({
                    dairyId,
                    storageId,
                    itemId,
                    quantity,
                    unit
                });


        let message;


        if (
            result?.omitted === true
        ) {

            message =
                `${
                    result.item?.name ||
                    "Feed item"
                } has been automatically omitted because its quantity reached zero.`;

        } else {

            message =
                `${
                    result?.item?.name ||
                    "Feed item"
                } quantity updated to ${
                    result?.item?.quantity ??
                    quantity
                } ${
                    result?.item?.unit ||
                    unit ||
                    ""
                }.`.trim();

        }


        return res.redirect(
            getContentsUrl(
                dairyId,
                storageId,
                {
                    tab: "view",
                    success: message
                }
            )
        );

    } catch (error) {

        console.error(
            "Storage quantity update error:",
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
// OMIT ITEMS
// ==========================================================
//
// POST:
//
// /storage/:dairyId/contents/:storageId/omit
//
// ==========================================================

async function omitItems(req, res) {

    try {

        const {
            dairyId,
            storageId
        } =
            getRouteIds(req);


        const itemIds =
            getItemIds(req);


        const result =
            await storageContentsService
                .omitItemsFromStorage({
                    dairyId,
                    storageId,
                    itemIds
                });


        const message =
            `${createCountMessage(
                result?.modifiedCount,
                "item",
                "items"
            )} omitted from ${
                result?.storage?.displayName ||
                result?.storage?.name ||
                "storage"
            }.`;



        return res.redirect(
            getContentsUrl(
                dairyId,
                storageId,
                {
                    tab: "view",
                    success: message
                }
            )
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
// POST:
//
// /storage/:dairyId/contents/:storageId/reshuffle
//
// ==========================================================

async function reshuffleItems(req, res) {

    try {

        const {
            dairyId,
            storageId
        } =
            getRouteIds(req);


        const itemIds =
            getItemIds(req);


        const targetStorageId =
            getBodyValue(
                req,
                "targetStorageId"
            );


        const result =
            await storageContentsService
                .reshuffleItems({
                    dairyId,
                    storageId,
                    targetStorageId,
                    itemIds
                });


        const message =
            `${createCountMessage(
                result?.modifiedCount,
                "item",
                "items"
            )} reshuffled to ${
                result?.targetStorage?.displayName ||
                result?.targetStorage?.name ||
                "the selected storage"
            }.`;



        return res.redirect(
            getContentsUrl(
                dairyId,
                storageId,
                {
                    tab: "view",
                    success: message
                }
            )
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
            error?.status ||
            error?.statusCode ||
            500
        );


    // ------------------------------------------------------
    // SERVER ERROR
    // ------------------------------------------------------

    if (statusCode >= 500) {

        return sendError(
            res,
            error,
            "Unable to update storage contents."
        );

    }


    // ------------------------------------------------------
    // VALIDATION / CLIENT ERROR
    // ------------------------------------------------------

    try {

        return await renderContents(
            req,
            res,
            {

                activeTab,

                successMessage:
                    null,

                pageError:
                    error?.message ||
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
            error?.status ||
            error?.statusCode ||
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
            error?.message ||
            fallbackMessage
        );

}


// ==========================================================
// EXPORT
// ==========================================================

module.exports = {

    // ------------------------------------------------------
    // GET PAGES
    // ------------------------------------------------------

    contents,

    contentItem,


    // ------------------------------------------------------
    // STORAGE OPERATIONS
    // ------------------------------------------------------

    addItems,

    omitItems,

    reshuffleItems,

    updateQuantity

};