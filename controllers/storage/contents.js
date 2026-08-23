// =========================================================
// controllers/storage/contents.js
// STORAGE CONTENTS CONTROLLER
// =========================================================
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
//         - stock update note
//         - update recorder
//         - update timestamp
//         - update images
//         - automatic omission when quantity = 0
//         - no manual omit
//         - no reshuffle
//
// IMPORTANT:
//
//     The authenticated user is taken from:
//
//         req.user
//
//     The controller passes:
//
//         user
//         user._id
//         images
//         stockUpdateNote
//
//     to the service.
//
//     The service remains responsible for all database
//     mutations.
//
// ==========================================================


const storageContentsService =
    require("../../services/storage/contents");


// ==========================================================
// STORAGE TYPES
// ==========================================================

const STORAGE_TYPES = {

    ROOM:
        "room",

    AGRO_STORE:
        "agroStore"

};


// ==========================================================
// BODY HELPERS
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
// GET ITEM IDS
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
        Array.isArray(
            value
        )
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

function getRouteIds(
    req
) {

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

function getContentItemRouteIds(
    req
) {

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


    Object.entries(
        query
    ).forEach(
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

        throw error;

    }


    return storageType;

}


// ==========================================================
// NORMALIZE RENDER MESSAGES
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
                    ? String(
                        querySuccess
                    )
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
// GET AUTHENTICATED USER
// ==========================================================
//
// The storage update must always know who performed the
// update.
//
// req.user is supplied by the authentication middleware.
//
// ==========================================================

function getAuthenticatedUser(
    req
) {

    const user =
        req.user;


    if (
        !user
    ) {

        const error =
            new Error(
                "Authentication is required."
            );

        error.status =
            401;

        throw error;

    }


    if (
        !user._id
    ) {

        const error =
            new Error(
                "Authenticated user ID is missing."
            );

        error.status =
            401;

        throw error;

    }


    return user;

}


// ==========================================================
// GET UPLOADED IMAGES
// ==========================================================
//
// Supports:
//
//     req.files
//     req.file
//
// This allows the route to use either:
//
//     upload.array(...)
//
// or:
//
//     upload.single(...)
//
// The service receives the actual uploaded file objects.
//
// ==========================================================

function getUploadedImages(
    req
) {

    if (
        Array.isArray(
            req.files
        )
    ) {

        return req.files
            .filter(Boolean);

    }


    if (
        req.files &&
        typeof req.files === "object"
    ) {

        return Object.values(
            req.files
        )
        .flat()
        .filter(Boolean);

    }


    if (
        req.file
    ) {

        return [
            req.file
        ];

    }


    return [];

}


// ==========================================================
// GET STOCK UPDATE NOTE
// ==========================================================

function getStockUpdateNote(
    req
) {

    const value =
        getBodyValue(
            req,
            "stockUpdateNote"
        );


    if (
        value === undefined ||
        value === null
    ) {

        return "";

    }


    return String(
        value
    ).trim();

}


// ==========================================================
// GET STORAGE CONTENTS
// ==========================================================

async function renderContents(
    req,
    res,
    options = {}
) {

    const {
        dairyId,
        storageId
    } =
        getRouteIds(
            req
        );


    if (
        !dairyId
    ) {

        const error =
            new Error(
                "Dairy ID is required."
            );

        error.status =
            400;

        throw error;

    }


    if (
        !storageId
    ) {

        const error =
            new Error(
                "Storage ID is required."
            );

        error.status =
            400;

        throw error;

    }


    const result =
        await storageContentsService
            .getStorageContents({
                dairyId,
                storageId
            });


    if (
        !result ||
        !result.storage
    ) {

        const error =
            new Error(
                "Storage facility not found."
            );

        error.status =
            404;

        throw error;

    }


    const storageType =
        validateStorageType(
            result.storage
        );


    const activeTab =
        options.activeTab ||
        req.query?.tab ||
        "view";


    const {
        successMessage,
        pageError
    } =
        getRenderMessages(
            req,
            options
        );


    return res.render(
        "storage/contents",
        {

            // =================================================
            // PAGE
            // =================================================

            title:
                result.storage.displayName ||
                result.storage.name ||
                "Storage Contents",


            // =================================================
            // USER
            // =================================================

            user:
                req.user || null,


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
                Array.isArray(
                    result.items
                )
                    ? result.items
                    : [],


            itemCount:
                Number(
                    result.itemCount
                ) || 0,


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
            // UI
            // =================================================

            activeTab,


            // =================================================
            // MESSAGES
            // =================================================

            successMessage,

            pageError

        }
    );

}


// ==========================================================
// GET STORAGE CONTENT ITEM DETAILS
// ==========================================================
//
// GET:
//
// /storage/:dairyId/contents/:storageId/details/:itemId
//
// IMPORTANT:
//
// Uses:
//
//     getContentItemDetails()
//
// rather than loading the entire contents collection and
// manually finding the item.
//
// This allows the service to enforce the exact storage
// membership rules.
//
// ==========================================================

async function contentItem(
    req,
    res
) {

    try {

        const {
            dairyId,
            storageId,
            itemId
        } =
            getContentItemRouteIds(
                req
            );


        if (
            !dairyId
        ) {

            const error =
                new Error(
                    "Dairy ID is required."
                );

            error.status =
                400;

            throw error;

        }


        if (
            !storageId
        ) {

            const error =
                new Error(
                    "Storage ID is required."
                );

            error.status =
                400;

            throw error;

        }


        if (
            !itemId
        ) {

            const error =
                new Error(
                    "Content item ID is required."
                );

            error.status =
                400;

            throw error;

        }


        const result =
            await storageContentsService
                .getContentItemDetails({

                    dairyId,

                    storageId,

                    itemId

                });


        if (
            !result ||
            !result.storage
        ) {

            const error =
                new Error(
                    "Storage facility not found."
                );

            error.status =
                404;

            throw error;

        }


        if (
            !result.item
        ) {

            const error =
                new Error(
                    "Content item was not found in this storage facility."
            );

            error.status =
                404;

            throw error;

        }


        const storageType =
            validateStorageType(
                result.storage
            );


        const {
            successMessage,
            pageError
        } =
            getRenderMessages(
                req
            );


        const contentsUrl =
            getContentsUrl(
                dairyId,
                storageId
            );


        const contentItemUrl =
            getContentItemUrl(
                dairyId,
                storageId,
                itemId
            );


        return res.render(
            "storage/content-item",
            {

                // =================================================
                // PAGE
                // =================================================

                title:
                    result.item.name ||
                    "Content Item",


                // =================================================
                // USER
                // =================================================

                user:
                    req.user || null,


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

                item:
                    result.item,

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
                // MESSAGES
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
// ADD ITEMS TO STORAGE
// ==========================================================
//
// POST:
//
// /storage/:dairyId/contents/:storageId/add
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
// UPDATE STORAGE CONTENT ITEM
// ==========================================================
//
// POST:
//
// /storage/:dairyId/contents/:storageId/update/:itemId
//
// PURPOSE:
//
//     Update one feed item currently contained inside an
//     AgroStore.
//
// ROUTE PARAMETER:
//
//     itemId
//
// BODY:
//
//     quantity
//     unit
//     stockUpdateNote
//
// FILES:
//
//     images
//
// IMPORTANT:
//
//     itemId is taken from:
//
//         req.params.itemId
//
//     The authenticated user is taken from:
//
//         req.user
//
//     recordedBy and recordedAt are generated by the
//     service.
//
// ==========================================================

async function updateContentItem(
    req,
    res
) {

    try {

        // ----------------------------------------------------
        // AUTHENTICATED USER
        // ----------------------------------------------------

        const user =
            getAuthenticatedUser(
                req
            );


        // ----------------------------------------------------
        // ROUTE IDS
        // ----------------------------------------------------

        const {
            dairyId,
            storageId
        } =
            getRouteIds(
                req
            );


        // ----------------------------------------------------
        // ITEM ID
        // ----------------------------------------------------
        //
        // The route is:
        //
        //     /update/:itemId
        //
        // Therefore the route parameter is authoritative.
        //
        // A body fallback is retained for compatibility with
        // older forms that may still submit itemId.
        //

        const itemId =
            String(
                req.params?.itemId ||
                getBodyValue(
                    req,
                    "itemId"
                ) ||
                ""
            ).trim();


        // ----------------------------------------------------
        // BODY
        // ----------------------------------------------------

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


        const stockUpdateNote =
            getStockUpdateNote(
                req
            );


        // ----------------------------------------------------
        // IMAGES
        // ----------------------------------------------------

        const images =
            getUploadedImages(
                req
            );


        // ====================================================
        // SERVICE
        // ====================================================

        const result =
            await storageContentsService
                .updateFeedQuantity({

                    dairyId,

                    storageId,

                    itemId,

                    quantity,

                    unit,

                    stockUpdateNote,

                    images,

                    user

                });


        // ====================================================
        // MESSAGE
        // ====================================================

        let message;


        if (
            result?.omitted === true
        ) {

            message =
                `${
                    result?.item?.name ||
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


        // ====================================================
        // REDIRECT
        // ====================================================

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
            "Storage content item update error:",
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
// UPDATE AGROSTORE FEED
// ==========================================================
//
// POST:
//
// /storage/:dairyId/contents/:storageId/quantity
//
// EXPECTED BODY:
//
//     itemId
//     quantity
//     unit
//     stockUpdateNote
//
// EXPECTED FILES:
//
//     images
//
// AUTHENTICATED USER:
//
//     req.user
//
// ==========================================================
//
// This handler is retained for compatibility with the
// previous quantity architecture.
//
// The newer route should use:
//
//     updateContentItem
//
// ==========================================================

async function updateQuantity(
    req,
    res
) {

    try {

        const user =
            getAuthenticatedUser(
                req
            );


        const {
            dairyId,
            storageId
        } =
            getRouteIds(
                req
            );


        const itemId =
            String(
                req.params?.itemId ||
                getBodyValue(
                    req,
                    "itemId"
                ) ||
                ""
            ).trim();


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


        const stockUpdateNote =
            getStockUpdateNote(
                req
            );


        const images =
            getUploadedImages(
                req
            );


        const result =
            await storageContentsService
                .updateFeedQuantity({

                    dairyId,

                    storageId,

                    itemId,

                    quantity,

                    unit,

                    stockUpdateNote,

                    images,

                    user

                });


        let message;


        if (
            result?.omitted === true
        ) {

            message =
                `${
                    result?.item?.name ||
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
// UPDATE MULTIPLE FEED QUANTITIES
// ==========================================================
//
// POST:
//
// Can be used by a bulk-update form.
//
// Each record may contain:
//
//     itemId
//     quantity
//     unit
//     stockUpdateNote
//     images
//
// ==========================================================

async function updateQuantities(
    req,
    res
) {

    try {

        const user =
            getAuthenticatedUser(
                req
            );


        const {
            dairyId,
            storageId
        } =
            getRouteIds(
                req
            );


        const records =
            getBodyValue(
                req,
                "records"
            );


        if (
            !Array.isArray(
                records
            ) ||
            records.length === 0
        ) {

            const error =
                new Error(
                    "No feed quantity records were supplied."
                );

            error.status =
                400;

            throw error;

        }


        const images =
            getUploadedImages(
                req
            );


        const normalizedRecords =
            records.map(
                function (record) {

                    return {

                        itemId:
                            record?.itemId,

                        quantity:
                            record?.quantity,

                        unit:
                            record?.unit,

                        stockUpdateNote:
                            record?.stockUpdateNote ||
                            "",

                        images

                    };

                }
            );


        const result =
            await storageContentsService
                .updateFeedQuantities({

                    dairyId,

                    storageId,

                    records:
                        normalizedRecords,

                    user

                });


        const count =
            Array.isArray(
                result?.results
            )
                ? result.results.length
                : 0;


        const message =
            `${createCountMessage(
                count,
                "feed quantity",
                "feed quantities"
            )} updated successfully.`;


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
            "Storage multiple quantity update error:",
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
// AgroStore omission is rejected by the service.
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
// /storage/:dairyId/contents/:storageId/reshuffle
//
// AgroStore reshuffling is rejected by the service.
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

    if (
        statusCode >= 500
    ) {

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


    // ------------------------------------------------------
    // AGROSTORE
    // ------------------------------------------------------

    updateQuantity,

    updateQuantities,

    updateContentItem

};