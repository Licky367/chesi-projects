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
// URL ID CONTRACT:
//
//     :dairyId
//         = parent Dairy._id
//
//     :storageId
//         = storage facility Dairy._id
//
//     :itemId
//         = Dairy._id of the item inside the storage
//
// STORAGE FACILITY TYPES:
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
// ==========================================================


const storageContentsService =
    require("../../services/storage/contents");


// ==========================================================
// STORAGE TYPE CONSTANTS
// ==========================================================

const STORAGE_TYPES = {

    ROOM:
        "room",

    AGRO_STORE:
        "agroStore"

};


// ==========================================================
// REQUEST / BODY HELPERS
// ==========================================================


// ----------------------------------------------------------
// GET BODY VALUE
// ----------------------------------------------------------

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


// ----------------------------------------------------------
// NORMALIZE SELECTED ITEM IDS
// ----------------------------------------------------------

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
            .map(
                value =>
                    String(value).trim()
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


// ----------------------------------------------------------
// CREATE SUCCESS MESSAGE
// ----------------------------------------------------------

function createCountMessage(
    count,
    singular,
    plural
) {

    const numericCount =
        Number(count) || 0;


    return `${numericCount} ${
        numericCount === 1
            ? singular
            : plural
    }`;

}


// ==========================================================
// ROUTE HELPERS
// ==========================================================


// ----------------------------------------------------------
// GET CONTENTS ROUTE PARAMETERS
// ----------------------------------------------------------
//
// URL:
//
//     /storage/:dairyId/contents/:storageId
//
// ----------------------------------------------------------

function getRouteIds(
    req
) {

    return {

        dairyId:
            String(
                req.params.dairyId || ""
            ).trim(),

        storageId:
            String(
                req.params.storageId || ""
            ).trim()

    };

}


// ----------------------------------------------------------
// GET CONTENT ITEM ROUTE PARAMETERS
// ----------------------------------------------------------
//
// URL:
//
//     /storage/:dairyId/contents/:storageId/details/:itemId
//
// ----------------------------------------------------------

function getContentItemRouteIds(
    req
) {

    return {

        dairyId:
            String(
                req.params.dairyId || ""
            ).trim(),

        storageId:
            String(
                req.params.storageId || ""
            ).trim(),

        itemId:
            String(
                req.params.itemId || ""
            ).trim()

    };

}


// ==========================================================
// BUILD CONTENTS URL
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


    Object.entries(
        query || {}
    ).forEach(
        function([
            key,
            value
        ]) {

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
// BUILD CONTENT ITEM DETAILS URL
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

function validateStorageType(
    storage
) {

    const storageType =
        storage?.type;


    if (
        storageType !==
            STORAGE_TYPES.ROOM &&
        storageType !==
            STORAGE_TYPES.AGRO_STORE
    ) {

        const error =
            new Error(
                "Storage facility must be either room or agroStore."
            );

        error.status =
            400;

        error.statusCode =
            400;

        throw error;

    }


    return storageType;

}


// ==========================================================
// FIND ITEM INSIDE STORAGE CONTENTS
// ==========================================================
//
// IMPORTANT:
//
//     The item must come from result.items.
//
//     result.items is generated by the storage service using
//     the actual storage allocation rules.
//
// Therefore an arbitrary Dairy ID cannot be used to display
// an unrelated item.
//
// ==========================================================

function findContentItem(
    items,
    itemId
) {

    if (
        !Array.isArray(items)
    ) {

        return null;

    }


    return (
        items.find(
            function(item) {

                if (
                    !item ||
                    item._id ===
                        null ||
                    item._id ===
                        undefined
                ) {

                    return false;

                }


                return String(
                    item._id
                ) ===
                String(
                    itemId
                );

            }
        ) ||
        null
    );

}


// ==========================================================
// RENDER STORAGE CONTENTS
// ==========================================================

async function renderContents(
    req,
    res,
    options = {}
) {

    // ======================================================
    // ROUTE IDS
    // ======================================================

    const {
        dairyId,
        storageId
    } =
        getRouteIds(
            req
        );


    // ======================================================
    // REQUIRE DAIRY ID
    // ======================================================

    if (!dairyId) {

        const error =
            new Error(
                "Dairy ID is required."
            );

        error.status =
            400;

        error.statusCode =
            400;

        throw error;

    }


    // ======================================================
    // REQUIRE STORAGE ID
    // ======================================================

    if (!storageId) {

        const error =
            new Error(
                "Storage ID is required."
            );

        error.status =
            400;

        error.statusCode =
            400;

        throw error;

    }


    // ======================================================
    // GET STORAGE CONTENTS
    // ======================================================

    const result =
        await storageContentsService
            .getStorageContents({
                dairyId,
                storageId
            });


    // ======================================================
    // REQUIRE RESULT
    // ======================================================

    if (
        !result
    ) {

        const error =
            new Error(
                "Storage contents could not be loaded."
            );

        error.status =
            404;

        error.statusCode =
            404;

        throw error;

    }


    // ======================================================
    // REQUIRE STORAGE
    // ======================================================

    if (
        !result.storage
    ) {

        const error =
            new Error(
                "Storage facility not found."
            );

        error.status =
            404;

        error.statusCode =
            404;

        throw error;

    }


    // ======================================================
    // VALIDATE STORAGE TYPE
    // ======================================================

    const storageType =
        validateStorageType(
            result.storage
        );


    // ======================================================
    // ACTIVE TAB
    // ======================================================

    const activeTab =
        options.activeTab ||
        req.query?.tab ||
        "view";


    // ======================================================
    // SUCCESS MESSAGE
    // ======================================================
    //
    // IMPORTANT:
    //
    // Always provide this variable because the EJS views
    // directly use:
    //
    //     <% if (successMessage) { %>
    //
    // ======================================================

    const successMessage =
        options.successMessage ??
        req.query?.success ??
        null;


    // ======================================================
    // PAGE ERROR
    // ======================================================

    const pageError =
        options.pageError ??
        null;


    // ======================================================
    // RENDER CONTENTS
    // ======================================================

    return res.render(
        "storage/contents",
        {

            // ----------------------------------------------
            // PAGE
            // ----------------------------------------------

            title:
                result.storage.displayName ||
                result.storage.name ||
                "Storage Contents",

            // ----------------------------------------------
            // PARENT DAIRY
            // ----------------------------------------------

            dairy:
                result.dairy,

            // ----------------------------------------------
            // STORAGE
            // ----------------------------------------------

            storage:
                result.storage,

            // ----------------------------------------------
            // STORAGE TYPE
            // ----------------------------------------------

            storageType,

            isRoom:
                storageType ===
                STORAGE_TYPES.ROOM,

            isAgroStore:
                storageType ===
                STORAGE_TYPES.AGRO_STORE,

            // ----------------------------------------------
            // CURRENT ITEMS
            // ----------------------------------------------

            items:
                Array.isArray(
                    result.items
                )
                    ? result.items
                    : [],

            itemCount:
                Number(
                    result.itemCount
                ) ||
                0,

            // ----------------------------------------------
            // AVAILABLE ITEMS
            // ----------------------------------------------

            availableItems:
                Array.isArray(
                    result.availableItems
                )
                    ? result.availableItems
                    : [],

            // ----------------------------------------------
            // TARGET STORAGE FACILITIES
            // ----------------------------------------------

            targetStorages:
                Array.isArray(
                    result.targetStorages
                )
                    ? result.targetStorages
                    : [],

            // ----------------------------------------------
            // UI STATE
            // ----------------------------------------------

            activeTab,

            successMessage,

            pageError,

            // ----------------------------------------------
            // EXPLICIT ROUTE VALUES
            // ----------------------------------------------

            dairyId,

            storageId

        }
    );

}


// ==========================================================
// GET STORAGE CONTENT ITEM DETAILS
// ==========================================================
//
// GET:
//
//     /storage/:dairyId/contents/:storageId/details/:itemId
//
// VIEW:
//
//     views/storage/content-item.ejs
//
// ==========================================================

async function contentItem(
    req,
    res
) {

    try {

        // ==================================================
        // ROUTE IDS
        // ==================================================

        const {
            dairyId,
            storageId,
            itemId
        } =
            getContentItemRouteIds(
                req
            );


        // ==================================================
        // REQUIRE DAIRY ID
        // ==================================================

        if (!dairyId) {

            const error =
                new Error(
                    "Dairy ID is required."
                );

            error.status =
                400;

            error.statusCode =
                400;

            throw error;

        }


        // ==================================================
        // REQUIRE STORAGE ID
        // ==================================================

        if (!storageId) {

            const error =
                new Error(
                    "Storage ID is required."
                );

            error.status =
                400;

            error.statusCode =
                400;

            throw error;

        }


        // ==================================================
        // REQUIRE ITEM ID
        // ==================================================

        if (!itemId) {

            const error =
                new Error(
                    "Content item ID is required."
                );

            error.status =
                400;

            error.statusCode =
                400;

            throw error;

        }


        // ==================================================
        // GET STORAGE CONTENTS
        // ==================================================
        //
        // This is intentional.
        //
        // The service verifies:
        //
        //     dairyId
        //     storageId
        //
        // and returns only items that actually belong to the
        // selected storage.
        //
        // ==================================================

        const result =
            await storageContentsService
                .getStorageContents({
                    dairyId,
                    storageId
                });


        // ==================================================
        // REQUIRE RESULT
        // ==================================================

        if (
            !result
        ) {

            const error =
                new Error(
                    "Storage contents could not be loaded."
                );

            error.status =
                404;

            error.statusCode =
                404;

            throw error;

        }


        // ==================================================
        // REQUIRE STORAGE
        // ==================================================

        if (
            !result.storage
        ) {

            const error =
                new Error(
                    "Storage facility not found."
                );

            error.status =
                404;

            error.statusCode =
                404;

            throw error;

        }


        // ==================================================
        // VALIDATE STORAGE TYPE
        // ==================================================

        const storageType =
            validateStorageType(
                result.storage
            );


        // ==================================================
        // FIND ITEM
        // ==================================================

        const item =
            findContentItem(
                result.items || [],
                itemId
            );


        // ==================================================
        // ITEM NOT FOUND
        // ==================================================

        if (!item) {

            const error =
                new Error(
                    "Content item was not found in this storage facility."
                );

            error.status =
                404;

            error.statusCode =
                404;

            throw error;

        }


        // ==================================================
        // SUCCESS MESSAGE
        // ==================================================
        //
        // IMPORTANT:
        //
        // content-item.ejs uses successMessage directly.
        //
        // Therefore it MUST be supplied even when there is
        // no success message.
        //
        // ==================================================

        const successMessage =
            req.query?.success ??
            null;


        // ==================================================
        // PAGE ERROR
        // ==================================================

        const pageError =
            req.query?.error ??
            null;


        // ==================================================
        // ACTIVE TAB
        // ==================================================

        const activeTab =
            req.query?.tab ||
            "view";


        // ==================================================
        // CONTENTS URL
        // ==================================================

        const contentsUrl =
            getContentsUrl(
                dairyId,
                storageId
            );


        // ==================================================
        // CONTENT ITEM URL
        // ==================================================

        const contentItemUrl =
            getContentItemUrl(
                dairyId,
                storageId,
                itemId
            );


        // ==================================================
        // RENDER CONTENT ITEM
        // ==================================================

        return res.render(
            "storage/content-item",
            {

                // ------------------------------------------
                // PAGE TITLE
                // ------------------------------------------

                title:
                    item.name ||
                    "Content Item",

                // ------------------------------------------
                // PARENT DAIRY
                // ------------------------------------------

                dairy:
                    result.dairy,

                // ------------------------------------------
                // STORAGE FACILITY
                // ------------------------------------------

                storage:
                    result.storage,

                // ------------------------------------------
                // ITEM
                // ------------------------------------------

                item,

                // ------------------------------------------
                // STORAGE TYPE
                // ------------------------------------------

                storageType,

                isRoom:
                    storageType ===
                    STORAGE_TYPES.ROOM,

                isAgroStore:
                    storageType ===
                    STORAGE_TYPES.AGRO_STORE,

                // ------------------------------------------
                // IDS
                // ------------------------------------------

                dairyId,

                storageId,

                itemId,

                // ------------------------------------------
                // URLS
                // ------------------------------------------

                contentsUrl,

                contentItemUrl,

                // ------------------------------------------
                // UI STATE
                // ------------------------------------------

                activeTab,

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
// GET CONTENTS
// ==========================================================
//
// GET:
//
//     /storage/:dairyId/contents/:storageId
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
// POST:
//
//     /storage/:dairyId/contents/:storageId/add
//
// Supported:
//
//     room
//     agroStore
//
// ==========================================================

async function addItems(
    req,
    res
) {

    try {

        const {
            dairyId,
            storageId
        } =
            getRouteIds(
                req
            );


        const itemIds =
            getItemIds(
                req
            );


        const result =
            await storageContentsService
                .addItemsToStorage({
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
                result.storage?.displayName ||
                result.storage?.name ||
                "storage"
            }.`;


        return res.redirect(
            getContentsUrl(
                dairyId,
                storageId,
                {
                    tab:
                        "add",

                    success:
                        message
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
//     /storage/:dairyId/contents/:storageId/quantity
//
// ==========================================================

async function updateQuantity(
    req,
    res
) {

    try {

        const {
            dairyId,
            storageId
        } =
            getRouteIds(
                req
            );


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


        // ==================================================
        // AUTOMATIC OMISSION
        // ==================================================

        if (
            result.omitted === true
        ) {

            message =
                `${
                    result.item?.name ||
                    "Feed item"
                } has been automatically omitted because its quantity reached zero.`;

        }


        // ==================================================
        // QUANTITY UPDATED
        // ==================================================

        else {

            message =
                `${
                    result.item?.name ||
                    "Feed item"
                } quantity updated to ${
                    result.item?.quantity
                } ${
                    result.item?.unit ||
                    ""
                }.`.trim();

        }


        return res.redirect(
            getContentsUrl(
                dairyId,
                storageId,
                {
                    tab:
                        "view",

                    success:
                        message
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
//     /storage/:dairyId/contents/:storageId/omit
//
// Normal Room only.
//
// AgroStore quantities are reduced to zero instead.
//
// ==========================================================

async function omitItems(
    req,
    res
) {

    try {

        const {
            dairyId,
            storageId
        } =
            getRouteIds(
                req
            );


        const itemIds =
            getItemIds(
                req
            );


        const result =
            await storageContentsService
                .omitItemsFromStorage({
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
                result.storage?.displayName ||
                result.storage?.name ||
                "storage"
            }.`;


        return res.redirect(
            getContentsUrl(
                dairyId,
                storageId,
                {
                    tab:
                        "view",

                    success:
                        message
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
//     /storage/:dairyId/contents/:storageId/reshuffle
//
// ==========================================================

async function reshuffleItems(
    req,
    res
) {

    try {

        const {
            dairyId,
            storageId
        } =
            getRouteIds(
                req
            );


        const itemIds =
            getItemIds(
                req
            );


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
                result.modifiedCount,
                "item",
                "items"
            )} reshuffled to ${
                result.targetStorage?.displayName ||
                result.targetStorage?.name ||
                "the selected storage"
            }.`;


        return res.redirect(
            getContentsUrl(
                dairyId,
                storageId,
                {
                    tab:
                        "view",

                    success:
                        message
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
// ERROR HANDLING
// ==========================================================


// ----------------------------------------------------------
// HANDLE MUTATION ERROR
// ----------------------------------------------------------
//
// Validation errors:
//
//     render the storage contents page again.
//
// Server errors:
//
//     send a normal HTTP error.
//
// ----------------------------------------------------------

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


    // ======================================================
    // SERVER ERROR
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
    // CLIENT / VALIDATION ERROR
    // ======================================================

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


// ----------------------------------------------------------
// SEND ERROR
// ----------------------------------------------------------

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
        .status(
            safeStatus
        )
        .send(
            error?.message ||
            fallbackMessage
        );

}


// ==========================================================
// EXPORT
// ==========================================================
//
// IMPORTANT:
//
// controllers/storage/index.js expects:
//
//     contents
//     contentItem
//     addItems
//     omitItems
//     reshuffleItems
//     updateQuantity
//
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