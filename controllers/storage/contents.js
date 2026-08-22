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
//
// These are the ONLY supported storage facility types.
//
// ==========================================================

const STORAGE_TYPES = {

    ROOM: "room",

    AGRO_STORE: "agroStore"

};


// ==========================================================
// REQUEST / BODY HELPERS
// ==========================================================


// ----------------------------------------------------------
// GET BODY VALUE
// ----------------------------------------------------------

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


// ----------------------------------------------------------
// NORMALIZE SELECTED ITEM IDS
// ----------------------------------------------------------

function getItemIds(req) {

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

    return `${count} ${
        count === 1
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

function getRouteIds(req) {

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

function getContentItemRouteIds(req) {

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


// ----------------------------------------------------------
// BUILD CONTENTS URL
// ----------------------------------------------------------
//
// ALWAYS returns:
//
//     /storage/:dairyId/contents/:storageId
//
// Optional query parameters are appended when supplied.
//
// ----------------------------------------------------------

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
        query
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


// ----------------------------------------------------------
// BUILD CONTENT ITEM DETAILS URL
// ----------------------------------------------------------
//
// ALWAYS returns:
//
//     /storage/:dairyId/contents/:storageId/details/:itemId
//
// ----------------------------------------------------------

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
//
// The application supports exactly:
//
//     room
//     agroStore
//
// Nothing else is accepted.
//
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
// FIND ITEM INSIDE STORAGE CONTENTS
// ==========================================================
//
// IMPORTANT:
//
//     We deliberately use the contents returned by
//     getStorageContents().
//
// This guarantees that the requested item belongs to the
// requested storage facility before content-item.ejs is
// rendered.
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


    return items.find(
        function(item) {

            if (
                !item ||
                item._id === null ||
                item._id === undefined
            ) {

                return false;

            }


            return String(
                item._id
            ) === String(
                itemId
            );

        }
    ) || null;

}


// ==========================================================
// RENDER CONTENTS
// ==========================================================

async function renderContents(
    req,
    res,
    options = {}
) {

    // ======================================================
    // GET ROUTE IDS
    // ======================================================

    const {
        dairyId,
        storageId
    } =
        getRouteIds(req);


    // ======================================================
    // REQUIRE DAIRY ID
    // ======================================================

    if (!dairyId) {

        const error =
            new Error(
                "Dairy ID is required."
            );

        error.status = 400;

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

        error.status = 400;

        throw error;

    }


    // ======================================================
    // GET STORAGE CONTENTS
    // ======================================================
    //
    // The service receives BOTH IDs.
    //
    // dairyId:
    //     parent Dairy._id
    //
    // storageId:
    //     storage facility Dairy._id
    //
    // ======================================================

    const result =
        await storageContentsService
            .getStorageContents({
                dairyId,
                storageId
            });


    // ======================================================
    // REQUIRE STORAGE RESULT
    // ======================================================

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
        req.query.tab ||
        "view";


    // ======================================================
    // SUCCESS MESSAGE
    // ======================================================

    const successMessage =
        options.successMessage ||
        req.query.success ||
        null;


    // ======================================================
    // PAGE ERROR
    // ======================================================

    const pageError =
        options.pageError ||
        null;


    // ======================================================
    // RENDER
    // ======================================================

    return res.render(
        "storage/contents",
        {

            title:
                result.storage.displayName ||
                "Storage Contents",

            dairy:
                result.dairy,

            storage:
                result.storage,

            storageType,

            isRoom:
                storageType === STORAGE_TYPES.ROOM,

            isAgroStore:
                storageType === STORAGE_TYPES.AGRO_STORE,

            items:
                result.items || [],

            itemCount:
                result.itemCount || 0,

            availableItems:
                result.availableItems || [],

            targetStorages:
                result.targetStorages || [],

            activeTab,

            successMessage,

            pageError,

            // ----------------------------------------------
            // EXPLICIT URL VALUES FOR THE VIEW
            // ----------------------------------------------

            dairyId,

            storageId

        }
    );

}


// ==========================================================
// GET CONTENT ITEM DETAILS
// ==========================================================
//
// GET:
//
//     /storage/:dairyId/contents/:storageId/details/:itemId
//
// PURPOSE:
//
//     Display one item currently contained inside a Room or
//     AgroStore.
//
// VIEW:
//
//     views/storage/content-item.ejs
//
// ==========================================================

async function contentItem(req, res) {

    try {

        // ==================================================
        // GET ROUTE IDS
        // ==================================================

        const {
            dairyId,
            storageId,
            itemId
        } =
            getContentItemRouteIds(req);


        // ==================================================
        // REQUIRE DAIRY ID
        // ==================================================

        if (!dairyId) {

            const error =
                new Error(
                    "Dairy ID is required."
                );

            error.status = 400;

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

            error.status = 400;

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

            error.status = 400;

            throw error;

        }


        // ==================================================
        // GET STORAGE CONTENTS
        // ==================================================
        //
        // We use the same service already used by the
        // contents page.
        //
        // This also allows us to verify that the item really
        // belongs to the requested storage facility.
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

            error.status = 404;

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

            error.status = 404;

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
        // FIND REQUESTED ITEM
        // ==================================================
        //
        // IMPORTANT:
        //
        // The item must exist in result.items.
        //
        // This prevents somebody from using an arbitrary
        // Dairy._id together with a storage URL to view an
        // unrelated record.
        //
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

            error.status = 404;

            throw error;

        }


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
                // REQUESTED ITEM
                // ------------------------------------------

                item,

                // ------------------------------------------
                // STORAGE TYPE
                // ------------------------------------------

                storageType,

                isRoom:
                    storageType === STORAGE_TYPES.ROOM,

                isAgroStore:
                    storageType === STORAGE_TYPES.AGRO_STORE,

                // ------------------------------------------
                // EXPLICIT IDS
                // ------------------------------------------

                dairyId,

                storageId,

                itemId,

                // ------------------------------------------
                // URLS
                // ------------------------------------------

                contentsUrl:
                    getContentsUrl(
                        dairyId,
                        storageId
                    ),

                contentItemUrl:
                    getContentItemUrl(
                        dairyId,
                        storageId,
                        itemId
                    )

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
// ADD ITEMS
// ==========================================================
//
// POST:
//
//     /storage/:dairyId/contents/:storageId/add
//
// ==========================================================
//
// This operation is supported by both:
//
//     room
//     agroStore
//
// The storage service remains responsible for deciding how
// the selected items are allocated according to the storage
// facility type.
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
                result.modifiedCount,
                "item",
                "items"
            )} added to ${
                result.storage?.displayName ||
                "storage"
            }.`;


        // ==================================================
        // REDIRECT BACK TO SAME STORAGE
        // ==================================================

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
//     /storage/:dairyId/contents/:storageId/quantity
//
// ==========================================================
//
// This operation applies specifically to:
//
//     storage.type === "agroStore"
//
// The service determines whether:
//
//     quantity > 0
//
// or:
//
//     quantity === 0
//
// When quantity reaches zero, the item is automatically
// omitted from the AgroStore.
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


        // ==================================================
        // ITEM AUTOMATICALLY OMITTED
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


        // ==================================================
        // REDIRECT BACK TO SAME STORAGE
        // ==================================================

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
//     /storage/:dairyId/contents/:storageId/omit
//
// ==========================================================
//
// Supported only by:
//
//     room
//
// AgroStore uses automatic omission when quantity reaches
// zero.
//
// The service remains responsible for enforcing this rule.
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
                result.modifiedCount,
                "item",
                "items"
            )} omitted from ${
                result.storage?.displayName ||
                "storage"
            }.`;

        
        // ==================================================
        // REDIRECT BACK TO SAME STORAGE
        // ==================================================

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
//     /storage/:dairyId/contents/:storageId/reshuffle
//
// ==========================================================
//
// Supported only by:
//
//     room
//
// AgroStore does not support reshuffling.
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
                result.modifiedCount,
                "item",
                "items"
            )} reshuffled to ${
                result.targetStorage?.displayName ||
                "the selected storage"
            }.`;


        // ==================================================
        // REDIRECT BACK TO ORIGINAL STORAGE
        // ==================================================

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
// ERROR HANDLING
// ==========================================================


// ----------------------------------------------------------
// HANDLE MUTATION ERROR
// ----------------------------------------------------------

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