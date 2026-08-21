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
// PAGE URL:
//
//     /storage/:dairyId/contents/:storageId
//
// DIRECT ADD PAGE:
//
//     GET
//
//         /storage/:dairyId/contents/:storageId/add
//
//     POST
//
//         /storage/:dairyId/contents/:storageId/add
//
// URL ID CONTRACT:
//
//     :dairyId
//         = parent Dairy._id
//
//     :storageId
//         = storage facility Dairy._id
//
// IMPORTANT:
//
//     item._id is used inside forms as itemId.
//
//     It is NOT used as the storage contents page ID.
//
// STORAGE ARCHITECTURE:
//
//     NORMAL STORAGE
//         - add
//         - omit
//         - reshuffle
//
//     AGROSTORE (type === "feeds")
//         - add feeds
//         - update quantity
//         - automatic omission when quantity = 0
//         - no manual omit
//         - no reshuffle
//
// ==========================================================


const storageContentsService =
    require("../../services/storage/contents");


const storageListService =
    require("../../services/storage/list");


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

            String(value).trim()

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
// GET URL PARAMETERS
// ==========================================================
//
// URL:
//
//     /storage/:dairyId/contents/:storageId
//
// :dairyId
//     = parent Dairy._id
//
// :storageId
//     = storage facility Dairy._id
//
// ==========================================================

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


// ==========================================================
// BUILD CONTENTS URL
// ==========================================================
//
// ALWAYS returns:
//
//     /storage/<dairyId>/contents/<storageId>
//
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
// GET DIRECT-ADD PAGE
// ==========================================================
//
// GET:
//
//     /storage/:dairyId/contents/:storageId/add
//
// IMPORTANT:
//
//     The browser does NOT choose the destination storage.
//
//     The destination is resolved from:
//
//         dairyId
//         storageId
//
//     The service remains responsible for validating that
//     the storage belongs to the parent Dairy.
//
// ==========================================================

async function getAddItemPage(
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


        // ==================================================
        // REQUIRE DAIRY ID
        // ==================================================

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


        // ==================================================
        // REQUIRE STORAGE ID
        // ==================================================

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


        // ==================================================
        // RESOLVE PARENT DAIRY
        // ==================================================

        const dairy =
            await storageListService
                .getParentDairy(
                    dairyId
                );


        if (
            !dairy
        ) {

            const error =
                new Error(
                    "Parent Dairy Farm was not found."
                );

            error.status =
                404;

            throw error;

        }


        // ==================================================
        // RESOLVE STORAGE
        // ==================================================
        //
        // IMPORTANT:
        //
        // The storage service should verify that this
        // storage belongs to the supplied parent Dairy.
        //
        // ==================================================

        const storage =
            await storageListService
                .getStorageFacility({

                    dairyId,

                    storageId

                });


        if (
            !storage
        ) {

            const error =
                new Error(
                    "Storage facility was not found."
                );

            error.status =
                404;

            throw error;

        }


        // ==================================================
        // DETERMINE STORAGE TYPE
        // ==================================================

        const storageType =
            String(

                storage.type ||
                ""

            )
            .trim();


        // ==================================================
        // LOAD BREEDS
        // ==================================================
        //
        // The direct-add view expects:
        //
        //     dairyBreeds
        //
        // Different projects expose breeds differently.
        //
        // Prefer a breeds collection already supplied by the
        // Dairy/list service if available.
        //
        // ==================================================

        let dairyBreeds = [];


        if (
            Array.isArray(
                dairy.dairyBreeds
            )
        ) {

            dairyBreeds =
                dairy.dairyBreeds;

        }

        else if (
            Array.isArray(
                dairy.breeds
            )
        ) {

            dairyBreeds =
                dairy.breeds;

        }


        // ==================================================
        // RENDER DIRECT-ADD PAGE
        // ==================================================

        return res.render(

            "storage/addNew",

            {

                title:
                    `Add Item to ${
                        storage.displayName ||
                        storage.name ||
                        "Storage"
                    }`,

                dairy,

                storage,

                dairyBreeds,

                storageType,

                dairyId,

                storageId

            }

        );

    } catch (error) {

        console.error(
            "Storage direct-add page error:",
            error
        );


        return sendError(

            res,

            error,

            "Unable to load the storage item form."

        );

    }

}


// ==========================================================
// POST DIRECT ADD ITEM
// ==========================================================
//
// POST:
//
//     /storage/:dairyId/contents/:storageId/add
//
// IMPORTANT:
//
//     This controller deliberately does NOT calculate:
//
//         assetCode
//         dwellNumber
//         roomNumber
//         recordType
//         storage ownership
//
//     Those values belong to the service layer.
//
// ==========================================================

async function postAddItem(
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


        // ==================================================
        // REQUIRE ROUTE IDS
        // ==================================================

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


        // ==================================================
        // CREATE ITEM THROUGH SERVICE
        // ==================================================
        //
        // The service is the final authority.
        //
        // It must determine:
        //
        //     parent Dairy
        //     storage
        //     storage type
        //     recordType
        //     assetCode
        //     roomNumber / dwellNumber
        //
        // and reject invalid combinations.
        //
        // ==================================================

        const result =
            await storageContentsService
                .createItemInStorage({

                    dairyId,

                    storageId,

                    data:
                        req.body,

                    file:
                        req.file,

                    files:
                        req.files

                });


        // ==================================================
        // SUCCESS
        // ==================================================

        const itemName =
            result &&
            result.item &&
            result.item.name

                ? result.item.name

                : "Item";


        const message =
            `${itemName} was added to ${
                result &&
                result.storage &&
                (
                    result.storage.displayName ||
                    result.storage.name
                )

                    ? (
                        result.storage.displayName ||
                        result.storage.name
                    )

                    : "storage"
            }.`;



        // ==================================================
        // REDIRECT TO CONTENTS
        // ==================================================

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
            "Storage direct-add item error:",
            error
        );


        // ==================================================
        // CLIENT / VALIDATION ERROR
        // ==================================================
        //
        // Re-render the form when the service rejects the
        // submitted data.
        //
        // This avoids losing the useful validation message.
        //
        // ==================================================

        const statusCode =
            Number(

                error.status ||
                error.statusCode ||
                500

            );


        if (
            statusCode >= 400 &&
            statusCode < 500
        ) {

            try {

                const {

                    dairyId,

                    storageId

                } =
                    getRouteIds(
                        req
                    );


                const dairy =
                    await storageListService
                        .getParentDairy(
                            dairyId
                        );


                const storage =
                    await storageListService
                        .getStorageFacility({

                            dairyId,

                            storageId

                        });


                let dairyBreeds = [];


                if (
                    Array.isArray(
                        dairy?.dairyBreeds
                    )
                ) {

                    dairyBreeds =
                        dairy.dairyBreeds;

                }

                else if (
                    Array.isArray(
                        dairy?.breeds
                    )
                ) {

                    dairyBreeds =
                        dairy.breeds;

                }


                const storageType =
                    String(

                        storage?.type ||
                        ""

                    )
                    .trim();


                return res

                    .status(
                        statusCode
                    )

                    .render(

                        "storage/addNew",

                        {

                            title:
                                `Add Item to ${
                                    storage?.displayName ||
                                    storage?.name ||
                                    "Storage"
                                }`,

                            dairy,

                            storage,

                            dairyBreeds,

                            storageType,

                            dairyId,

                            storageId,

                            pageError:
                                error.message ||
                                "Unable to add item to storage."

                        }

                    );

            } catch (renderError) {

                console.error(
                    "Storage direct-add form render error:",
                    renderError
                );


                return sendError(

                    res,

                    renderError,

                    "Unable to add item to storage."

                );

            }

        }


        // ==================================================
        // SERVER ERROR
        // ==================================================

        return sendError(

            res,

            error,

            "Unable to add item to storage."

        );

    }

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
        getRouteIds(
            req
        );


    // ======================================================
    // REQUIRE DAIRY ID
    // ======================================================

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


    // ======================================================
    // REQUIRE STORAGE ID
    // ======================================================

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


    // ======================================================
    // GET STORAGE CONTENTS
    // ======================================================
    //
    // Service receives BOTH IDs.
    //
    // dairyId:
    //     parent Dairy._id
    //
    // storageId:
    //     storage facility Dairy._id
    //
    // ======================================================

    const result =
        await storageContentsService.getStorageContents({

            dairyId,

            storageId

        });


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
// This is the EXISTING bulk/add-existing-item operation.
//
// It is intentionally kept separate from:
//
//     postAddItem()
//
// which creates a NEW item directly in storage.
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



        // ==================================================
        // REDIRECT BACK TO SAME STORAGE
        // ==================================================

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
// UPDATE FEED QUANTITY
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
            await storageContentsService.updateFeedQuantity({

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
                    result.item.name ||
                    "Feed item"
                } has been automatically omitted because its quantity reached zero.`;

        }


        // ==================================================
        // QUANTITY UPDATED
        // ==================================================

        else {

            message =
                `${
                    result.item.name ||
                    "Feed item"
                } quantity updated to ${
                    result.item.quantity
                } ${
                    result.item.unit ||
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

        .status(
            safeStatus
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
// IMPORTANT:
//
// routes/storage.js expects:
//
//     contents
//     addItems
//     omitItems
//     reshuffleItems
//     updateQuantity
//     getAddItemPage
//     postAddItem
//
// ==========================================================

module.exports = {

    contents,

    addItems,

    omitItems,

    reshuffleItems,

    updateQuantity,

    getAddItemPage,

    postAddItem

};