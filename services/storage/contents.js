// ==========================================================
// controllers/storage/contents.js
// STORAGE CONTENTS CONTROLLER
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
// COUNT MESSAGE
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
        ([key, value]) => {

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
        String(
            storage?.type || ""
        ).trim();


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
// FIND CONTENT ITEM
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
            item =>
                item &&
                item._id !== undefined &&
                item._id !== null &&
                String(item._id) ===
                    String(itemId)
        ) || null
    );

}


// ==========================================================
// GET AGROSTORE FEEDS
// ==========================================================
//
// IMPORTANT:
//
// result.items comes from:
//
//     getStorageContents()
//
// For an AgroStore, those are the records currently
// allocated to:
//
//     dwellNumber === storage.roomNumber
//
// Therefore this is the correct source for the feed cards.
//
// We do NOT use availableItems here because those records
// are NOT currently inside the AgroStore.
//
// ==========================================================

function getAgroStoreFeedItems(result) {

    const items =
        Array.isArray(result?.items)
            ? result.items
            : [];


    return items.filter(
        item => {

            if (!item) {

                return false;

            }


            // ------------------------------------------------
            // Quantity must be greater than zero.
            // ------------------------------------------------

            const quantity =
                Number(
                    item.quantity
                );


            if (
                !Number.isFinite(quantity) ||
                quantity <= 0
            ) {

                return false;

            }


            // ------------------------------------------------
            // Animal feed.
            //
            // Normal value:
            //
            //     "feeds"
            //
            // Also tolerate:
            //
            //     "feed"
            //     "Feeds"
            //     "FEEDS"
            //
            // ------------------------------------------------

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
// RENDER MESSAGES
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


    // ------------------------------------------------------
    // LOAD REAL STORAGE DATA
    // ------------------------------------------------------

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


    // ------------------------------------------------------
    // ACTUAL FEEDS INSIDE AGROSTORE
    // ------------------------------------------------------

    const feedUpdateItems =
        storageType === STORAGE_TYPES.AGRO_STORE
            ? getAgroStoreFeedItems(result)
            : [];


    return res.render(
        "storage/contents",
        {

            title:
                result.storage.displayName ||
                result.storage.name ||
                "Storage Contents",


            // ------------------------------------------------
            // DAIRY
            // ------------------------------------------------

            dairy:
                result.dairy || null,

            dairyId,

            parentId:
                dairyId,


            // ------------------------------------------------
            // STORAGE
            // ------------------------------------------------

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


            // ------------------------------------------------
            // CURRENT STORAGE CONTENTS
            // ------------------------------------------------

            items:
                Array.isArray(result.items)
                    ? result.items
                    : [],


            itemCount:
                Number(
                    result.itemCount
                ) || 0,


            // ------------------------------------------------
            // ITEMS NOT YET ALLOCATED
            // ------------------------------------------------

            availableItems:
                Array.isArray(
                    result.availableItems
                )
                    ? result.availableItems
                    : [],


            // ------------------------------------------------
            // AGROSTORE FEEDS
            // ------------------------------------------------
            //
            // These are dynamic database records.
            //
            // Nothing is hardcoded.
            //
            // ------------------------------------------------

            feedUpdateItems,

            animalFeeds:
                feedUpdateItems,

            feedItems:
                feedUpdateItems,

            agroStoreItems:
                feedUpdateItems,


            // ------------------------------------------------
            // TARGET STORAGE FACILITIES
            // ------------------------------------------------

            targetStorages:
                Array.isArray(
                    result.targetStorages
                )
                    ? result.targetStorages
                    : [],


            // ------------------------------------------------
            // UI
            // ------------------------------------------------

            activeTab,


            // ------------------------------------------------
            // ALWAYS DEFINED
            // ------------------------------------------------

            successMessage,

            pageError

        }
    );

}


// ==========================================================
// CONTENT ITEM DETAILS
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


        if (!result?.storage) {

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
            getRenderMessages(req);


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
                    ),


                dairyContentItemUrl:
                    getDairyContentItemUrl(
                        dairyId,
                        storageId,
                        itemId
                    ),


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
// STORAGE CONTENTS PAGE
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
// FEED UPDATE CARDS
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
// This route renders ONLY:
//
//     views/update/storage/feed-update-cards.ejs
//
// It does NOT require the card to be included inside
// contents.ejs.
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


        // ----------------------------------------------------
        // LOAD THE REAL STORAGE CONTENTS
        // ----------------------------------------------------

        const result =
            await storageContentsService
                .getStorageContents({
                    dairyId,
                    storageId
                });


        if (!result?.storage) {

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


        // ----------------------------------------------------
        // AGROSTORE ONLY
        // ----------------------------------------------------

        if (
            storageType !==
            STORAGE_TYPES.AGRO_STORE
        ) {

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

                    items: [],

                    availableItems: [],

                    feedUpdateItems: [],

                    animalFeeds: [],

                    feedItems: [],

                    agroStoreItems: []

                }
            );

        }


        // ----------------------------------------------------
        // GET ACTUAL FEEDS CURRENTLY IN AGROSTORE
        // ----------------------------------------------------

        const feedUpdateItems =
            getAgroStoreFeedItems(
                result
            );


        // ----------------------------------------------------
        // RENDER THE EJS CARD
        // ----------------------------------------------------

        return res.render(
            "update/storage/feed-update-cards",
            {

                title:
                    "Available Animal Feeds",


                // ------------------------------------------------
                // DAIRY
                // ------------------------------------------------

                dairy:
                    result.dairy || null,

                dairyId,

                parentId:
                    dairyId,


                // ------------------------------------------------
                // STORAGE
                // ------------------------------------------------

                storage:
                    result.storage,

                storageId,

                storageType,


                // ------------------------------------------------
                // REAL FEED RECORDS
                // ------------------------------------------------

                items:
                    feedUpdateItems,

                availableItems:
                    feedUpdateItems,

                feedUpdateItems,

                animalFeeds:
                    feedUpdateItems,

                feedItems:
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
// ADD ITEMS
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
// UPDATE FEED QUANTITY
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