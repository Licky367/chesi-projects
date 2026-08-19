// =========================================================
// controllers/update/storageController.js
// =========================================================
//
// FEED STORE / STORAGE CONTROLLER
//
// ROUTES:
//
//     GET    /dairy/feedstore/:dairyId
//
//     GET    /dairy/:dairyId/feedstore/add
//     POST   /dairy/:dairyId/feedstore/add
//
//     GET    /dairy/:dairyId/feedstore/update/:stockId
//     PUT    /dairy/:dairyId/feedstore/update/:stockId
//
//     GET    /dairy/:dairyId/feedstore/restock/:stockId
//     POST   /dairy/:dairyId/feedstore/restock/:stockId
//
//     GET    /dairy/:dairyId/feedstore/:stockId
//     DELETE /dairy/:dairyId/feedstore/:stockId
//
// SERVICE:
//
//     services/update/storageService.js
//
// MODEL:
//
//     models/dairy.js
//
// IMPORTANT
// ---------------------------------------------------------
//
// dairyId
//     = MongoDB _id of the FEED STORE document.
//
// stockId
//     = MongoDB _id of the embedded dairy.feedStocks item.
//
// New stock:
//     MUST be created as a new feedStocks subdocument.
//
// Existing stock:
//     MUST be located using dairy.feedStocks._id.
//
// =========================================================


const storageService =
    require("../../services/update/storageService");


// =========================================================
// USER
// =========================================================

function getUser(req) {

    return (

        req.session &&
        req.session.user

    ) || null;

}


// =========================================================
// ROLE CHECKS
// =========================================================

function isAdmin(req) {

    const user =
        getUser(req);

    return Boolean(

        user &&
        user.role === "admin"

    );

}


function isDairyWorker(req) {

    const user =
        getUser(req);

    return Boolean(

        user &&
        user.role === "dairyWorker"

    );

}


function canAccessStorage(req) {

    return (

        isAdmin(req) ||
        isDairyWorker(req)

    );

}


// =========================================================
// ROUTE PARAMETERS
// =========================================================

function getDairyId(req) {

    return String(
        req.params.dairyId || ""
    ).trim();

}


function getStockId(req) {

    return String(
        req.params.stockId || ""
    ).trim();

}


// =========================================================
// ERROR HELPER
// =========================================================

function createError(
    message,
    statusCode = 400
) {

    const error =
        new Error(message);

    error.statusCode =
        statusCode;

    return error;

}


// =========================================================
// UPLOADED IMAGES
// =========================================================
//
// Router normally uses:
//
//     upload.array("images", 10)
//
// Therefore multer places files in:
//
//     req.files
//
// =========================================================

function getUploadedImages(req) {

    if (!req || !req.files) {

        return [];

    }


    let files = [];


    // ------------------------------------------------------
    // upload.array(...)
    // ------------------------------------------------------

    if (Array.isArray(req.files)) {

        files =
            req.files;

    }


    // ------------------------------------------------------
    // upload.fields(...)
    // ------------------------------------------------------

    else if (
        Array.isArray(
            req.files.images
        )
    ) {

        files =
            req.files.images;

    }


    return files

        .map(function(file) {

            if (
                typeof file === "string"
            ) {

                return file;

            }


            return (

                file.secure_url ||
                file.url ||
                file.path ||
                file.location ||
                ""

            );

        })

        .map(function(value) {

            return String(
                value || ""
            ).trim();

        })

        .filter(Boolean);

}


// =========================================================
// STORAGE OPTIONS
// =========================================================

function getStockOptions() {

    if (
        !storageService ||
        typeof storageService.getStorageOptions !==
            "function"
    ) {

        return {

            feedTypes: [],

            medicineTypes: [],

            stockUnits: []

        };

    }


    const options =
        storageService.getStorageOptions() || {};


    return {

        feedTypes:

            Array.isArray(
                options.feedTypes
            )

                ? options.feedTypes

                : [],


        medicineTypes:

            Array.isArray(
                options.veterinaryMedicines
            )

                ? options.veterinaryMedicines

                : [],


        stockUnits:

            Array.isArray(
                options.stockUnits
            )

                ? options.stockUnits

                : []

    };

}


// =========================================================
// FEED STORE ITEMS
// =========================================================

function getFeedStoreItems(
    dairy
) {

    if (
        !dairy ||
        !Array.isArray(
            dairy.feedStocks
        )
    ) {

        return [];

    }


    return dairy.feedStocks;

}


// =========================================================
// COMMON VIEW DATA
// =========================================================

function buildCommonViewData(
    dairy,
    req
) {

    const options =
        getStockOptions();


    return {

        dairy,

        user:
            getUser(req),

        feedStoreItems:
            getFeedStoreItems(
                dairy
            ),

        feedTypes:
            options.feedTypes,

        medicineTypes:
            options.medicineTypes,

        stockUnits:
            options.stockUnits

    };

}


// =========================================================
// LOAD DAIRY / FEED STORE
// =========================================================
//
// IMPORTANT:
//
// The :dairyId in these routes is the _id of the
// FEED STORE document.
//
// It is NOT:
//
//     assetCode
//     farm code
//     parent farm code
//     stock id
//
// =========================================================

async function loadDairy(
    dairyId
) {

    if (!dairyId) {

        throw createError(
            "Dairy ID is required.",
            400
        );

    }


    if (
        !storageService ||
        typeof storageService.getDairy !==
            "function"
    ) {

        throw createError(
            "Storage service cannot load the dairy.",
            500
        );

    }


    const dairy =
        await storageService.getDairy(
            dairyId
        );


    if (!dairy) {

        throw createError(
            "Feed store not found.",
            404
        );

    }


    // ------------------------------------------------------
    // Ensure this document is actually a feed store.
    // ------------------------------------------------------

    const isFeedStore =
        Boolean(

            (

                typeof dairy.isFeedStore ===
                "boolean"

                    ? dairy.isFeedStore

                    : false

            ) ||

            dairy.type === "feedStore"

        );


    if (!isFeedStore) {

        throw createError(
            "The selected Dairy document is not a feed store.",
            400
        );

    }


    // ------------------------------------------------------
    // Guarantee an array for the view.
    // ------------------------------------------------------

    if (
        !Array.isArray(
            dairy.feedStocks
        )
    ) {

        dairy.feedStocks = [];

    }


    return dairy;

}


// =========================================================
// VALIDATE CATEGORY
// =========================================================

function validateCategory(
    category
) {

    if (
        category !== "feed" &&
        category !== "medicine"
    ) {

        throw createError(
            "Stock category must be either feed or medicine.",
            400
        );

    }

}


// =========================================================
// VALIDATE STOCK DATA
// =========================================================

function validateStockData(
    data,
    options = {}
) {

    const requireQuantity =
        options.requireQuantity !== false;


    // ------------------------------------------------------
    // NAME
    // ------------------------------------------------------

    if (!String(data.name || "").trim()) {

        throw createError(
            "Stock name is required.",
            400
        );

    }


    // ------------------------------------------------------
    // CATEGORY
    // ------------------------------------------------------

    validateCategory(
        String(
            data.category || ""
        )
        .trim()
        .toLowerCase()
    );


    // ------------------------------------------------------
    // CATEGORY-SPECIFIC NAME
    // ------------------------------------------------------

    if (
        data.category === "feed" &&
        !String(
            data.feedName || ""
        ).trim()
    ) {

        throw createError(
            "Feed name is required for feed stock.",
            400
        );

    }


    if (
        data.category === "medicine" &&
        !String(
            data.medicineName || ""
        ).trim()
    ) {

        throw createError(
            "Medicine name is required for medicine stock.",
            400
        );

    }


    // ------------------------------------------------------
    // QUANTITY
    // ------------------------------------------------------

    if (requireQuantity) {

        const quantity =
            Number(
                data.quantity
            );


        if (
            !Number.isFinite(quantity) ||
            quantity < 0
        ) {

            throw createError(
                "Stock quantity must be a valid non-negative number.",
                400
            );

        }

    }


    // ------------------------------------------------------
    // UNIT
    // ------------------------------------------------------

    if (
        !String(
            data.unit || ""
        ).trim()
    ) {

        throw createError(
            "Stock unit is required.",
            400
        );

    }


    // ------------------------------------------------------
    // PRICE
    // ------------------------------------------------------

    if (
        data.price !== undefined &&
        data.price !== null &&
        data.price !== ""
    ) {

        const price =
            Number(
                data.price
            );


        if (
            !Number.isFinite(price) ||
            price < 0
        ) {

            throw createError(
                "Stock price must be a valid non-negative number.",
                400
            );

        }

    }

}


// =========================================================
// BUILD STOCK DATA
// =========================================================
//
// Matches add/update EJS:
//
//     name
//     category
//     feedName
//     medicineName
//     quantity
//     unit
//     price
//     instructions
//     expectedDuration
//     message
//
// =========================================================

function buildStockData(
    req
) {

    const body =
        req.body || {};


    const category =
        String(
            body.category || ""
        )
        .trim()
        .toLowerCase();


    const submittedName =
        String(
            body.name || ""
        ).trim();


    const feedName =
        String(
            body.feedName || ""
        ).trim();


    const medicineName =
        String(
            body.medicineName || ""
        ).trim();


    let name =
        submittedName;


    // ------------------------------------------------------
    // Backwards compatibility.
    //
    // If the form does not submit `name`, derive it from
    // the category-specific field.
    // ------------------------------------------------------

    if (!name) {

        if (
            category === "medicine"
        ) {

            name =
                medicineName;

        }

        else if (
            category === "feed"
        ) {

            name =
                feedName;

        }

    }


    return {

        name,

        category,

        feedName,

        medicineName,

        quantity:
            body.quantity,

        unit:
            body.unit,

        price:
            body.price,

        instructions:
            body.instructions,

        expectedDuration:
            body.expectedDuration,

        message:
            body.message

    };

}


// =========================================================
// BUILD RESTOCK DATA
// =========================================================

function buildRestockData(
    req
) {

    const body =
        req.body || {};


    return {

        quantity:
            body.quantity,

        price:
            body.price,

        instructions:
            body.instructions,

        expectedDuration:
            body.expectedDuration,

        message:
            body.message

    };

}


// =========================================================
// GET FEED STOCK LIST
// =========================================================
//
// GET:
//
//     /dairy/feedstore/:dairyId
//
// =========================================================

async function getFeedStock(
    req,
    res
) {

    try {

        if (!canAccessStorage(req)) {

            return res.status(403).send(
                "Access denied."
            );

        }


        const dairyId =
            getDairyId(req);


        const dairy =
            await loadDairy(
                dairyId
            );


        const viewData =
            buildCommonViewData(
                dairy,
                req
            );


        return res.render(
            "update/storage/feed-stock",
            viewData
        );

    }

    catch (error) {

        console.error(
            "STORAGE FEED STOCK PAGE ERROR:",
            error
        );


        return res.status(
            error.statusCode || 500
        ).send(
            error.message ||
            "Unable to load feed stock."
        );

    }

}


// =========================================================
// GET ADD STOCK PAGE
// =========================================================

async function getAddStock(
    req,
    res
) {

    try {

        if (!isAdmin(req)) {

            return res.status(403).send(
                "Only an administrator can add stock."
            );

        }


        const dairyId =
            getDairyId(req);


        const dairy =
            await loadDairy(
                dairyId
            );


        const viewData =
            buildCommonViewData(
                dairy,
                req
            );


        return res.render(
            "update/storage/add-stock",
            viewData
        );

    }

    catch (error) {

        console.error(
            "STORAGE ADD PAGE ERROR:",
            error
        );


        return res.status(
            error.statusCode || 500
        ).send(
            error.message ||
            "Unable to load Add Stock page."
        );

    }

}


// =========================================================
// GET UPDATE STOCK PAGE
// =========================================================

async function getUpdateStock(
    req,
    res
) {

    try {

        if (!canAccessStorage(req)) {

            return res.status(403).send(
                "Access denied."
            );

        }


        const dairyId =
            getDairyId(req);


        const stockId =
            getStockId(req);


        if (!dairyId) {

            return res.status(400).send(
                "Dairy ID is required."
            );

        }


        if (!stockId) {

            return res.status(400).send(
                "Stock ID is required."
            );

        }


        const dairy =
            await loadDairy(
                dairyId
            );


        const stock =
            await storageService.getStock({

                dairyId,

                stockId

            });


        if (!stock) {

            return res.status(404).send(
                "Stock not found."
            );

        }


        const viewData =
            buildCommonViewData(
                dairy,
                req
            );


        viewData.stock =
            stock;


        return res.render(
            "update/storage/update-stock",
            viewData
        );

    }

    catch (error) {

        console.error(
            "STORAGE UPDATE PAGE ERROR:",
            error
        );


        return res.status(
            error.statusCode || 500
        ).send(
            error.message ||
            "Unable to load Update Stock page."
        );

    }

}


// =========================================================
// GET RESTOCK PAGE
// =========================================================

async function getRestock(
    req,
    res
) {

    try {

        if (!isAdmin(req)) {

            return res.status(403).send(
                "Only an administrator can restock stock."
            );

        }


        const dairyId =
            getDairyId(req);


        const stockId =
            getStockId(req);


        if (!dairyId) {

            return res.status(400).send(
                "Dairy ID is required."
            );

        }


        if (!stockId) {

            return res.status(400).send(
                "Stock ID is required."
            );

        }


        const dairy =
            await loadDairy(
                dairyId
            );


        const stock =
            await storageService.getStock({

                dairyId,

                stockId

            });


        if (!stock) {

            return res.status(404).send(
                "Stock not found."
            );

        }


        const viewData =
            buildCommonViewData(
                dairy,
                req
            );


        viewData.stock =
            stock;


        return res.render(
            "update/storage/restock",
            viewData
        );

    }

    catch (error) {

        console.error(
            "STORAGE RESTOCK PAGE ERROR:",
            error
        );


        return res.status(
            error.statusCode || 500
        ).send(
            error.message ||
            "Unable to load Restock page."
        );

    }

}


// =========================================================
// ADD NEW STOCK
// =========================================================
//
// POST:
//
//     /dairy/:dairyId/feedstore/add
//
// CRITICAL:
//
// This creates a NEW embedded feedStocks document.
//
// It MUST NOT call restockStock() with:
//
//     stockId: ""
//
// =========================================================

async function addStock(
    req,
    res
) {

    const dairyId =
        getDairyId(req);


    try {

        if (!isAdmin(req)) {

            return res.status(403).json({

                success: false,

                message:
                    "Only an administrator can add stock."

            });

        }


        if (!dairyId) {

            return res.status(400).json({

                success: false,

                message:
                    "Dairy ID is required."

            });

        }


        // --------------------------------------------------
        // Confirm the target is the actual feed store.
        // --------------------------------------------------

        await loadDairy(
            dairyId
        );


        // --------------------------------------------------
        // Build incoming stock data.
        // --------------------------------------------------

        const data =
            buildStockData(req);


        // --------------------------------------------------
        // Validate before touching the database.
        // --------------------------------------------------

        validateStockData(
            data,
            {
                requireQuantity: true
            }
        );


        const images =
            getUploadedImages(req);


        // --------------------------------------------------
        // CREATE NEW STOCK
        // --------------------------------------------------
        //
        // Preferred service method:
        //
        //     createStock()
        //
        // Some versions of the service may call this:
        //
        //     addStock()
        //
        // We support either explicitly.
        //
        // We NEVER use restockStock() to create a new item.
        // --------------------------------------------------

        if (
            storageService &&
            typeof storageService.createStock ===
                "function"
        ) {

            await storageService.createStock({

                dairyId,

                data,

                images

            });

        }

        else if (
            storageService &&
            typeof storageService.addStock ===
                "function"
        ) {

            await storageService.addStock({

                dairyId,

                data,

                images

            });

        }

        else {

            throw createError(

                "Storage service does not expose a createStock() or addStock() method. New stock cannot be saved safely.",

                500

            );

        }


        // --------------------------------------------------
        // IMPORTANT:
        //
        // Reload the feed store after saving.
        //
        // This confirms that the newly-created stock is
        // actually persisted inside dairy.feedStocks.
        // --------------------------------------------------

        const savedDairy =
            await loadDairy(
                dairyId
            );


        if (
            !Array.isArray(
                savedDairy.feedStocks
            )
        ) {

            throw createError(

                "Stock creation returned successfully, but the feed store contains no feedStocks array.",

                500

            );

        }


        // --------------------------------------------------
        // SUCCESS
        // --------------------------------------------------

        return res.redirect(
            `/dairy/feedstore/${encodeURIComponent(dairyId)}`
        );

    }

    catch (error) {

        console.error(
            "STORAGE ADD STOCK ERROR:",
            error
        );


        const message =
            encodeURIComponent(
                error.message ||
                "Unable to add stock."
            );


        return res.redirect(
            `/dairy/feedstore/${encodeURIComponent(dairyId)}?feedStoreError=${message}`
        );

    }

}


// =========================================================
// UPDATE EXISTING STOCK
// =========================================================
//
// PUT:
//
//     /dairy/:dairyId/feedstore/update/:stockId
//
// =========================================================

async function updateStock(
    req,
    res
) {

    const dairyId =
        getDairyId(req);

    const stockId =
        getStockId(req);


    try {

        if (!canAccessStorage(req)) {

            return res.status(403).json({

                success: false,

                message:
                    "You are not allowed to update stock."

            });

        }


        if (!dairyId) {

            return res.status(400).json({

                success: false,

                message:
                    "Dairy ID is required."

            });

        }


        if (!stockId) {

            return res.status(400).json({

                success: false,

                message:
                    "Stock ID is required."

            });

        }


        // --------------------------------------------------
        // Confirm feed store.
        // --------------------------------------------------

        await loadDairy(
            dairyId
        );


        // --------------------------------------------------
        // Get existing embedded stock.
        // --------------------------------------------------

        const existingStock =
            await storageService.getStock({

                dairyId,

                stockId

            });


        if (!existingStock) {

            return res.status(404).json({

                success: false,

                message:
                    "Stock not found."

            });

        }


        // --------------------------------------------------
        // Build incoming data.
        // --------------------------------------------------

        const data =
            buildStockData(req);


        // --------------------------------------------------
        // ADMIN
        // --------------------------------------------------

        if (isAdmin(req)) {

            validateStockData(
                data,
                {
                    requireQuantity: true
                }
            );

        }

        // --------------------------------------------------
        // DAIRY WORKER
        // --------------------------------------------------
        //
        // Worker is allowed to change:
        //
        //     quantity
        //     message
        //
        // Everything else comes from the existing stock.
        //
        // IMPORTANT:
        //
        // Stored price is `unitPrice`, NOT `price`.
        // --------------------------------------------------

        else {

            data.name =
                String(
                    existingStock.name || ""
                ).trim();


            data.category =
                String(
                    existingStock.category || ""
                )
                .trim()
                .toLowerCase();


            data.feedName =
                String(
                    existingStock.feedName || ""
                ).trim();


            data.medicineName =
                String(
                    existingStock.medicineName || ""
                ).trim();


            data.unit =
                existingStock.unit;


            // ----------------------------------------------
            // FORM/service contract uses `price`.
            // Stored schema uses `unitPrice`.
            // ----------------------------------------------

            data.price =
                existingStock.unitPrice;


            data.instructions =
                existingStock.instructions || "";


            data.expectedDuration =
                existingStock.expectedDuration || "";


            validateStockData(
                data,
                {
                    requireQuantity: true
                }
            );

        }


        const images =
            getUploadedImages(req);


        // --------------------------------------------------
        // SAVE EXISTING EMBEDDED STOCK.
        // --------------------------------------------------

        if (
            !storageService ||
            typeof storageService.saveStock !==
                "function"
        ) {

            throw createError(

                "Storage service does not expose saveStock().",

                500

            );

        }


        await storageService.saveStock({

            dairyId,

            stockId,

            data,

            images

        });


        // --------------------------------------------------
        // RELOAD AFTER SAVE
        // --------------------------------------------------

        const savedDairy =
            await loadDairy(
                dairyId
            );


        const savedStock =
            Array.isArray(
                savedDairy.feedStocks
            )

                ? savedDairy.feedStocks.id
                    ? savedDairy.feedStocks.id(
                        stockId
                    )
                    : savedDairy.feedStocks.find(
                        function(stock) {

                            return String(
                                stock._id
                            ) === String(
                                stockId
                            );

                        }
                    )

                : null;


        if (!savedStock) {

            throw createError(

                "Stock update completed without the updated stock being found in the feed store.",

                500

            );

        }


        return res.redirect(
            `/dairy/feedstore/${encodeURIComponent(dairyId)}`
        );

    }

    catch (error) {

        console.error(
            "STORAGE UPDATE STOCK ERROR:",
            error
        );


        const message =
            encodeURIComponent(
                error.message ||
                "Unable to update stock."
            );


        return res.redirect(
            `/dairy/feedstore/${encodeURIComponent(dairyId)}?feedStoreError=${message}`
        );

    }

}


// =========================================================
// RESTOCK EXISTING STOCK
// =========================================================
//
// POST:
//
//     /dairy/:dairyId/feedstore/restock/:stockId
//
// ADMIN ONLY
//
// =========================================================

async function restockStock(
    req,
    res
) {

    const dairyId =
        getDairyId(req);

    const stockId =
        getStockId(req);


    try {

        if (!isAdmin(req)) {

            return res.status(403).json({

                success: false,

                message:
                    "Only an administrator can restock stock."

            });

        }


        if (!dairyId) {

            return res.status(400).json({

                success: false,

                message:
                    "Dairy ID is required."

            });

        }


        if (!stockId) {

            return res.status(400).json({

                success: false,

                message:
                    "Stock ID is required."

            });

        }


        // --------------------------------------------------
        // Confirm target is feed store.
        // --------------------------------------------------

        await loadDairy(
            dairyId
        );


        // --------------------------------------------------
        // Confirm embedded stock exists.
        // --------------------------------------------------

        const existingStock =
            await storageService.getStock({

                dairyId,

                stockId

            });


        if (!existingStock) {

            return res.status(404).json({

                success: false,

                message:
                    "Stock not found."

            });

        }


        // --------------------------------------------------
        // Build restock data.
        // --------------------------------------------------

        const data =
            buildRestockData(req);


        // --------------------------------------------------
        // Restock quantity must be positive.
        // --------------------------------------------------

        const quantity =
            Number(
                data.quantity
            );


        if (
            !Number.isFinite(quantity) ||
            quantity <= 0
        ) {

            throw createError(

                "Restock quantity must be greater than zero.",

                400

            );

        }


        // --------------------------------------------------
        // Price is optional only if the service supports
        // retaining the previous unit price.
        //
        // If supplied, it must be valid.
        // --------------------------------------------------

        if (
            data.price !== undefined &&
            data.price !== null &&
            data.price !== ""
        ) {

            const price =
                Number(
                    data.price
                );


            if (
                !Number.isFinite(price) ||
                price < 0
            ) {

                throw createError(

                    "Restock price must be a valid non-negative number.",

                    400

                );

            }

        }


        const images =
            getUploadedImages(req);


        // --------------------------------------------------
        // EXISTING STOCK RESTOCK
        //
        // This is the ONLY place where restockStock()
        // should be called.
        // --------------------------------------------------

        if (
            !storageService ||
            typeof storageService.restockStock !==
                "function"
        ) {

            throw createError(

                "Storage service does not expose restockStock().",

                500

            );

        }


        await storageService.restockStock({

            dairyId,

            stockId,

            data,

            images

        });


        // --------------------------------------------------
        // RELOAD AFTER RESTOCK
        //
        // This is intentional.
        //
        // We verify the same embedded stock now exists in
        // the persisted feed store before redirecting.
        // --------------------------------------------------

        const savedDairy =
            await loadDairy(
                dairyId
            );


        let savedStock =
            null;


        if (
            Array.isArray(
                savedDairy.feedStocks
            )
        ) {

            if (
                typeof savedDairy.feedStocks.id ===
                    "function"
            ) {

                savedStock =
                    savedDairy.feedStocks.id(
                        stockId
                    );

            }


            if (!savedStock) {

                savedStock =
                    savedDairy.feedStocks.find(
                        function(stock) {

                            return String(
                                stock._id
                            ) === String(
                                stockId
                            );

                        }
                    );

            }

        }


        if (!savedStock) {

            throw createError(

                "Restock completed without the stock being found in the persisted feed store.",

                500

            );

        }


        return res.redirect(
            `/dairy/feedstore/${encodeURIComponent(dairyId)}`
        );

    }

    catch (error) {

        console.error(
            "STORAGE RESTOCK ERROR:",
            error
        );


        const message =
            encodeURIComponent(
                error.message ||
                "Unable to restock stock."
            );


        return res.redirect(
            `/dairy/feedstore/${encodeURIComponent(dairyId)}?feedStoreError=${message}`
        );

    }

}


// =========================================================
// GET ONE STOCK
// =========================================================
//
// GET:
//
//     /dairy/:dairyId/feedstore/:stockId
//
// =========================================================

async function getStock(
    req,
    res
) {

    try {

        if (!canAccessStorage(req)) {

            return res.status(403).json({

                success: false,

                message:
                    "Access denied."

            });

        }


        const dairyId =
            getDairyId(req);


        const stockId =
            getStockId(req);


        if (!dairyId) {

            return res.status(400).json({

                success: false,

                message:
                    "Dairy ID is required."

            });

        }


        if (!stockId) {

            return res.status(400).json({

                success: false,

                message:
                    "Stock ID is required."

            });

        }


        // --------------------------------------------------
        // Ensure dairy is feed store.
        // --------------------------------------------------

        await loadDairy(
            dairyId
        );


        const stock =
            await storageService.getStock({

                dairyId,

                stockId

            });


        if (!stock) {

            return res.status(404).json({

                success: false,

                message:
                    "Stock not found."

            });

        }


        return res.json({

            success: true,

            stock

        });

    }

    catch (error) {

        console.error(
            "STORAGE GET STOCK ERROR:",
            error
        );


        return res.status(
            error.statusCode || 500
        ).json({

            success: false,

            message:
                error.message ||
                "Unable to load stock."

        });

    }

}


// =========================================================
// DELETE STOCK
// =========================================================
//
// DELETE:
//
//     /dairy/:dairyId/feedstore/:stockId
//
// =========================================================

async function deleteStock(
    req,
    res
) {

    try {

        if (!isAdmin(req)) {

            return res.status(403).json({

                success: false,

                message:
                    "Only an administrator can delete stock."

            });

        }


        const dairyId =
            getDairyId(req);


        const stockId =
            getStockId(req);


        if (!dairyId) {

            return res.status(400).json({

                success: false,

                message:
                    "Dairy ID is required."

            });

        }


        if (!stockId) {

            return res.status(400).json({

                success: false,

                message:
                    "Stock ID is required."

            });

        }


        await loadDairy(
            dairyId
        );


        if (
            !storageService ||
            typeof storageService.deleteStock !==
                "function"
        ) {

            throw createError(

                "Storage service does not expose deleteStock().",

                500

            );

        }


        await storageService.deleteStock({

            dairyId,

            stockId

        });


        return res.json({

            success: true,

            message:
                "Stock deleted successfully."

        });

    }

    catch (error) {

        console.error(
            "STORAGE DELETE ERROR:",
            error
        );


        return res.status(
            error.statusCode || 500
        ).json({

            success: false,

            message:
                error.message ||
                "Unable to delete stock."

        });

    }

}


// =========================================================
// EXPORT
// =========================================================

module.exports = {

    getFeedStock,

    getAddStock,

    getUpdateStock,

    getRestock,

    addStock,

    updateStock,

    restockStock,

    getStock,

    deleteStock

};