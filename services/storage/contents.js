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
//     /dairy/:parentId/contents/:storageId/details/:itemId
//
//     /update/storage/feed-update-cards
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
//     The controller NEVER hardcodes feed information.
//
//     The service loads the actual Dairy records.
//
//     The feed-update-cards EJS receives those records.
//
// ==========================================================

const storageContentsService =
    require("../../services/storage");


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
// DAIRY CONTENT ITEM ROUTE IDS
// ==========================================================

function getDairyContentItemRouteIds(req) {

    return {

        parentId:
            String(
                req.params?.parentId || ""
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
// DAIRY CONTENT ITEM URL
// ==========================================================

function getDairyContentItemUrl(
    parentId,
    storageId,
    itemId
) {

    return (
        `/dairy/${encodeURIComponent(
            parentId
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
        storageType !==
            STORAGE_TYPES.ROOM &&
        storageType !==
            STORAGE_TYPES.AGRO_STORE
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
// GET AGROSTORE FEED ITEMS
// ==========================================================
//
// IMPORTANT:
//
//     DO NOT use availableItems here.
//
//     result.items means:
//
//         CURRENTLY INSIDE THIS STORAGE
//
//     result.availableItems means:
//
//         NOT CURRENTLY ALLOCATED
//
//     For the feed update cards we need:
//
//         result.items
//
//     because these are the feeds that actually belong to
//     the selected AgroStore.
//
// ==========================================================

function getAgroStoreFeedItems(
    result,
    storageType
) {

    if (
        storageType !==
        STORAGE_TYPES.AGRO_STORE
    ) {

        return [];

    }


    if (!Array.isArray(result?.items)) {

        return [];

    }


    return result.items.filter(
        function (item) {

            if (!item) {

                return false;

            }


            const quantity =
                Number(
                    item.quantity
                );


            if (
                !Number.isFinite(
                    quantity
                ) ||
                quantity <= 0
            ) {

                return false;

            }


            const type =
                String(
                    item.type || ""
                )
                    .trim()
                    .toLowerCase();


            return (
                type === "feeds" ||
                type === "feed"
            );

        }
    );

}


// ==========================================================
// NORMALIZE RENDER VARIABLES
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

    const {
        dairyId,
        storageId
    } =
        getRouteIds(req);


    if (!dairyId) {

        const error =
            new Error(
                "Dairy ID is required."
            );

        error.status = 400;

        throw error;

    }


    if (!storageId) {

        const error =
            new Error(
                "Storage ID is required."
            );

        error.status = 400;

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

        error.status = 404;

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


    // ======================================================
    // ACTUAL FEEDS CURRENTLY IN AGROSTORE
    // ======================================================

    const feedUpdateItems =
        getAgroStoreFeedItems(
            result,
            storageType
        );


    // ======================================================
    // RENDER
    // ======================================================

    return res.render(
        "storage/contents",
        {

            title:
                result.storage.displayName ||
                result.storage.name ||
                "Storage Contents",


            dairy:
                result.dairy || null,


            dairyId,


            parentId:
                dairyId,


            storage:
                result.storage,


            storageId,


            storageType,


            isRoom:
                storageType ===
                STORAGE_TYPES.ROOM,


            isAgroStore:
                storageType ===
                STORAGE_TYPES.AGRO_STORE,


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


            // =================================================
            // DYNAMIC FEED CARD DATA
            // =================================================

            feedUpdateItems,


            agroStoreItems:
                feedUpdateItems,


            targetStorages:
                Array.isArray(
                    result.targetStorages
                )
                    ? result.targetStorages
                    : [],


            activeTab,


            // =================================================
            // ALWAYS DEFINED
            // =================================================

            successMessage,

            pageError

        }
    );

}


// ==========================================================
// GET CONTENT ITEM DETAILS
// ==========================================================

async function contentItem(req, res) {

    try {

        const {
            dairyId,
            storageId,
            itemId
        } =
            getContentItemRouteIds(req);


        if (!dairyId) {

            const error =
                new Error(
                    "Dairy ID is required."
                );

            error.status = 400;

            throw error;

        }


        if (!storageId) {

            const error =
                new Error(
                    "Storage ID is required."
                );

            error.status = 400;

            throw error;

        }


        if (!itemId) {

            const error =
                new Error(
                    "Content item ID is required."
                );

            error.status = 400;

            throw error;

        }


        const result =
            await storageContentsService
                .getStorageContents({

                    dairyId,

                    storageId

                });


        if (!result) {

            const error =
                new Error(
                    "Storage contents could not be loaded."
                );

            error.status = 404;

            throw error;

        }


        if (!result.storage) {

            const error =
                new Error(
                    "Storage facility not found."
                );

            error.status = 404;

            throw error;

        }


        const storageType =
            validateStorageType(
                result.storage
            );


        const item =
            findContentItem(
                result.items || [],
                itemId
            );


        if (!item) {

            const error =
                new Error(
                    "Content item was not found in this storage facility."
                );

            error.status = 404;

            throw error;

        }


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


        const dairyContentItemUrl =
            getDairyContentItemUrl(
                dairyId,
                storageId,
                itemId
            );


        return res.render(
            "storage/content-item",
            {

                title:
                    item.name ||
                    "Content Item",


                dairy:
                    result.dairy || null,


                dairyId,


                parentId:
                    dairyId,


                storage:
                    result.storage,


                storageId,


                item,


                itemId,


                storageType,


                isRoom:
                    storageType ===
                    STORAGE_TYPES.ROOM,


                isAgroStore:
                    storageType ===
                    STORAGE_TYPES.AGRO_STORE,


                contentsUrl,


                contentItemUrl,


                dairyContentItemUrl,


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
// RENDER FEED UPDATE CARDS
// ==========================================================
//
// GET:
//
// /update/storage/feed-update-cards
//
// QUERY:
//
// ?dairyId=:dairyId&storageId=:storageId
//
// IMPORTANT:
//
//     This endpoint renders the EJS card independently.
//
//     It does NOT require the card to be included inside
//     contents.ejs.
//
// ==========================================================

async function feedUpdateCards(req, res) {

    try {

        const dairyId =
            String(
                req.query?.dairyId ||
                req.params?.dairyId ||
                ""
            ).trim();


        const storageId =
            String(
                req.query?.storageId ||
                req.params?.storageId ||
                ""
            ).trim();


        if (!dairyId) {

            const error =
                new Error(
                    "Dairy ID is required."
                );

            error.status = 400;

            throw error;

        }


        if (!storageId) {

            const error =
                new Error(
                    "Storage ID is required."
                );

            error.status = 400;

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

            error.status = 404;

            throw error;

        }


        const storageType =
            validateStorageType(
                result.storage
            );


        // ==================================================
        // IMPORTANT
        // ==================================================
        //
        // Get the feeds CURRENTLY IN THE SELECTED AGROSTORE.
        //
        // NOT availableItems.
        //
        // ==================================================

        const feedUpdateItems =
            getAgroStoreFeedItems(
                result,
                storageType
            );


        return res.render(
            "update/storage/feed-update-cards",
            {

                title:
                    "Available Animal Feeds",


                dairy:
                    result.dairy || null,


                dairyId,


                parentId:
                    dairyId,


                storage:
                    result.storage,


                storageId,


                storageType,


                // =================================================
                // DYNAMIC ITEMS
                // =================================================

                items:
                    feedUpdateItems,


                availableItems:
                    feedUpdateItems,


                feedUpdateItems,


                agroStoreItems:
                    feedUpdateItems

            }
        );

    } catch (error) {

        console.error(
            "Feed update cards error:",
            error
        );


        return sendError(
            res,
            error,
            "Unable to load available animal feeds."
        );

    }

}


// ==========================================================
// ADD ITEMS TO STORAGE
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


    if (statusCode >= 500) {

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

    contents,

    contentItem,

    feedUpdateCards,

    addItems,

    omitItems,

    reshuffleItems,

    updateQuantity

};