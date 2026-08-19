// =========================================================
// controllers/update/storageController.js
// =========================================================
//
// FEED STORE / STORAGE CONTROLLER
//
// NEW STORAGE ARCHITECTURE
// =========================================================
//
// The URL dairyId is the MongoDB _id of the DAIRY FARM.
//
// Example:
//
//     /dairy/68xxxxxxxxxxxxxxxxxxxx/feedstore
//
// The supplied dairyId identifies the farm.
//
// The farm has:
//
//     farm.code
//
// The storage facility has:
//
//     storageFacility.storageNumber
//
// The storage facility belonging to that farm is therefore:
//
//     storageFacility.storageNumber === farm.code
//
// STOCKS are stored on:
//
//     storageFacility.feedStocks[]
//
// Therefore:
//
//     URL dairyId
//          ↓
//     Dairy farm
//          ↓
//     farm.code
//          ↓
//     storageFacility.storageNumber
//          ↓
//     storageFacility._id
//          ↓
//     storageService
//          ↓
//     storageFacility.feedStocks[]
//
// IMPORTANT
// ---------------------------------------------------------
//
// The controller translates the FARM ID from the URL into
// the STORAGE FACILITY ID required by storageService.
//
// storageService itself continues to work with the actual
// storage facility document.
//
// =========================================================
//
// ROUTES
// ---------------------------------------------------------
//
// GET
//     /dairy/feedstore/:dairyId
//
// GET
//     /dairy/:dairyId/feedstore/add
//
// POST
//     /dairy/:dairyId/feedstore/add
//
// GET
//     /dairy/:dairyId/feedstore/update/:stockId
//
// PUT
//     /dairy/:dairyId/feedstore/update/:stockId
//
// GET
//     /dairy/:dairyId/feedstore/restock/:stockId
//
// POST
//     /dairy/:dairyId/feedstore/restock/:stockId
//
// GET
//     /dairy/:dairyId/feedstore/:stockId
//
// DELETE
//     /dairy/:dairyId/feedstore/:stockId
//
// =========================================================


const mongoose =
    require("mongoose");


const Dairy =
    require("../../models/dairy");


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

function getFarmId(req) {

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
// ERROR
// =========================================================

function createError(
    message,
    statusCode = 400
) {

    const error =
        new Error(
            message
        );


    error.statusCode =
        statusCode;


    return error;

}


// =========================================================
// VALID OBJECT ID
// =========================================================

function isValidObjectId(
    value
) {

    return mongoose.Types.ObjectId.isValid(
        String(
            value || ""
        )
    );

}


// =========================================================
// UPLOADED IMAGES
// =========================================================
//
// Supports:
//
//     upload.array("images", 10)
//
// and:
//
//     upload.fields([
//         { name: "images" }
//     ])
//
// =========================================================

function getUploadedImages(req) {

    if (
        !req ||
        !req.files
    ) {

        return [];

    }


    let files = [];


    // ------------------------------------------------------
    // upload.array(...)
    // ------------------------------------------------------

    if (
        Array.isArray(
            req.files
        )
    ) {

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


            if (
                !file ||
                typeof file !== "object"
            ) {

                return "";

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
// FEED STOCK ITEMS
// =========================================================

function getFeedStoreItems(
    storageFacility
) {

    if (
        !storageFacility ||
        !Array.isArray(
            storageFacility.feedStocks
        )
    ) {

        return [];

    }


    return storageFacility.feedStocks;

}


// =========================================================
// COMMON VIEW DATA
// =========================================================
//
// `dairy` is deliberately the FARM.
//
// `storageFacility` is the actual document containing
// feedStocks[].
//
// This allows the EJS to know both:
//
//     dairy.code
//
// and:
//
//     storageFacility.feedStocks
//
// =========================================================

function buildCommonViewData(
    farm,
    storageFacility,
    req
) {

    const options =
        getStockOptions();


    return {

        // --------------------------------------------------
        // FARM
        // --------------------------------------------------

        dairy:
            farm,


        // --------------------------------------------------
        // ACTUAL STORAGE FACILITY
        // --------------------------------------------------

        storageFacility,


        // --------------------------------------------------
        // USER
        // --------------------------------------------------

        user:
            getUser(req),


        // --------------------------------------------------
        // STOCKS
        // --------------------------------------------------

        feedStoreItems:
            getFeedStoreItems(
                storageFacility
            ),


        // --------------------------------------------------
        // OPTIONS
        // --------------------------------------------------

        feedTypes:
            options.feedTypes,


        medicineTypes:
            options.medicineTypes,


        stockUnits:
            options.stockUnits

    };

}


// =========================================================
// FIND DAIRY FARM
// =========================================================
//
// The URL dairyId is the FARM _id.
//
// =========================================================

async function getDairyFarm(
    farmId
) {

    const id =
        String(
            farmId || ""
        ).trim();


    if (!id) {

        throw createError(
            "Dairy farm ID is required.",
            400
        );

    }


    if (
        !isValidObjectId(
            id
        )
    ) {

        throw createError(
            "Invalid dairy farm ID.",
            400
        );

    }


    const farm =
        await Dairy.findById(
            id
        );


    if (!farm) {

        throw createError(
            "Dairy farm not found.",
            404
        );

    }


    return farm;

}


// =========================================================
// FIND STORAGE FACILITY FOR FARM
// =========================================================
//
// IMPORTANT
// ---------------------------------------------------------
//
// The storage facility is NOT identified by the URL ID.
//
// It is identified by:
//
//     storageFacility.storageNumber === farm.code
//
// =========================================================

async function getStorageFacilityForFarm(
    farm
) {

    if (!farm) {

        throw createError(
            "Dairy farm is required.",
            400
        );

    }


    const farmCode =
        farm.code;


    if (
        farmCode === undefined ||
        farmCode === null ||
        String(farmCode).trim() === ""
    ) {

        throw createError(
            "The dairy farm does not have a valid farm code.",
            400
        );

    }


    // ------------------------------------------------------
    // Match the storage facility using storageNumber.
    //
    // Storage facilities are represented by Dairy documents
    // whose code is null.
    // ------------------------------------------------------

    const storageFacility =
        await Dairy.findOne({

            code: null,

            storageNumber:
                farmCode

        });


    if (!storageFacility) {

        throw createError(

            `No storage facility was found for dairy farm code ${farmCode}.`,

            404

        );

    }


    // ------------------------------------------------------
    // Guarantee feedStocks exists.
    // ------------------------------------------------------

    if (
        !Array.isArray(
            storageFacility.feedStocks
        )
    ) {

        storageFacility.feedStocks = [];

    }


    return storageFacility;

}


// =========================================================
// LOAD STORAGE CONTEXT
// =========================================================
//
// This is the central controller resolver.
//
// It returns:
//
//     farm
//     storageFacility
//     storageId
//
// The service receives storageId.
//
// The views receive both farm and storageFacility.
//
// =========================================================

async function loadStorageContext(
    farmId
) {

    const farm =
        await getDairyFarm(
            farmId
        );


    const storageFacility =
        await getStorageFacilityForFarm(
            farm
        );


    return {

        farm,

        storageFacility,

        storageId:
            String(
                storageFacility._id
            )

    };

}


// =========================================================
// LOAD STOCK
// =========================================================
//
// Uses the storage facility ID internally.
//
// =========================================================

async function getStorageStock(
    storageId,
    stockId
) {

    if (!stockId) {

        throw createError(
            "Stock ID is required.",
            400
        );

    }


    return storageService.getStock({

        dairyId:
            storageId,

        stockId

    });

}


// =========================================================
// VALIDATE CATEGORY
// =========================================================

function validateCategory(
    category
) {

    const value =
        String(
            category || ""
        )
        .trim()
        .toLowerCase();


    if (
        value !== "feed" &&
        value !== "medicine"
    ) {

        throw createError(
            "Stock category must be either feed or medicine.",
            400
        );

    }


    return value;

}


// =========================================================
// BUILD STOCK DATA
// =========================================================
//
// Canonical stock identity:
//
//     name
//
// feedName and medicineName are category-specific legacy
// source fields and are retained only for compatibility.
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


    const feedName =
        String(
            body.feedName || ""
        ).trim();


    const medicineName =
        String(
            body.medicineName || ""
        ).trim();


    let name =
        String(
            body.name || ""
        ).trim();


    // ------------------------------------------------------
    // Compatibility fallback.
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

        quantityAdded:
            body.quantityAdded !== undefined
                ? body.quantityAdded
                : body.quantity,

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
// VALIDATE NEW / ADMIN STOCK DATA
// =========================================================
//
// The service also validates these values.
//
// This controller validation provides early and clear
// request errors.
//
// =========================================================

function validateStockData(
    data,
    options = {}
) {

    const requireQuantity =
        options.requireQuantity !== false;


    if (!String(data.name || "").trim()) {

        throw createError(
            "Stock name is required.",
            400
        );

    }


    validateCategory(
        data.category
    );


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
                "Unit price must be a valid non-negative number.",
                400
            );

        }

    }

}


// =========================================================
// GET FEED STOCK
// =========================================================
//
// GET:
//
//     /dairy/feedstore/:dairyId
//
// dairyId = FARM _id
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


        const farmId =
            getFarmId(req);


        const context =
            await loadStorageContext(
                farmId
            );


        const viewData =
            buildCommonViewData(

                context.farm,

                context.storageFacility,

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
// GET ADD STOCK
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


        const farmId =
            getFarmId(req);


        const context =
            await loadStorageContext(
                farmId
            );


        const viewData =
            buildCommonViewData(

                context.farm,

                context.storageFacility,

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
// GET UPDATE STOCK
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


        const farmId =
            getFarmId(req);


        const stockId =
            getStockId(req);


        if (!farmId) {

            return res.status(400).send(
                "Dairy farm ID is required."
            );

        }


        if (!stockId) {

            return res.status(400).send(
                "Stock ID is required."
            );

        }


        const context =
            await loadStorageContext(
                farmId
            );


        const stock =
            await getStorageStock(

                context.storageId,

                stockId

            );


        const viewData =
            buildCommonViewData(

                context.farm,

                context.storageFacility,

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
// GET RESTOCK
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


        const farmId =
            getFarmId(req);


        const stockId =
            getStockId(req);


        if (!farmId) {

            return res.status(400).send(
                "Dairy farm ID is required."
            );

        }


        if (!stockId) {

            return res.status(400).send(
                "Stock ID is required."
            );

        }


        const context =
            await loadStorageContext(
                farmId
            );


        const stock =
            await getStorageStock(

                context.storageId,

                stockId

            );


        const viewData =
            buildCommonViewData(

                context.farm,

                context.storageFacility,

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
// ADD STOCK
// =========================================================
//
// POST:
//
//     /dairy/:dairyId/feedstore/add
//
// dairyId = FARM _id
//
// =========================================================

async function addStock(
    req,
    res
) {

    const farmId =
        getFarmId(req);


    try {

        if (!isAdmin(req)) {

            return res.status(403).json({

                success: false,

                message:
                    "Only an administrator can add stock."

            });

        }


        if (!farmId) {

            return res.status(400).json({

                success: false,

                message:
                    "Dairy farm ID is required."

            });

        }


        const context =
            await loadStorageContext(
                farmId
            );


        const data =
            buildStockData(
                req
            );


        validateStockData(
            data,
            {
                requireQuantity: true
            }
        );


        const images =
            getUploadedImages(
                req
            );


        await storageService.createStock({

            // IMPORTANT:
            // This is the STORAGE FACILITY _id,
            // not the farm _id.

            dairyId:
                context.storageId,

            data,

            images

        });


        // --------------------------------------------------
        // Verify persistence.
        // --------------------------------------------------

        const savedStorage =
            await storageService.getDairy(
                context.storageId
            );


        if (
            !savedStorage ||
            !Array.isArray(
                savedStorage.feedStocks
            )
        ) {

            throw createError(

                "Stock was not found in the storage facility after saving.",

                500

            );

        }


        return res.redirect(

            `/dairy/feedstore/${encodeURIComponent(farmId)}`

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

            `/dairy/feedstore/${encodeURIComponent(farmId)}?feedStoreError=${message}`

        );

    }

}


// =========================================================
// UPDATE STOCK
// =========================================================
//
// PUT:
//
//     /dairy/:dairyId/feedstore/update/:stockId
//
// dairyId = FARM _id
//
// =========================================================

async function updateStock(
    req,
    res
) {

    const farmId =
        getFarmId(req);


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


        if (!farmId) {

            return res.status(400).json({

                success: false,

                message:
                    "Dairy farm ID is required."

            });

        }


        if (!stockId) {

            return res.status(400).json({

                success: false,

                message:
                    "Stock ID is required."

            });

        }


        const context =
            await loadStorageContext(
                farmId
            );


        const existingStock =
            await getStorageStock(

                context.storageId,

                stockId

            );


        if (!existingStock) {

            return res.status(404).json({

                success: false,

                message:
                    "Stock not found."

            });

        }


        const data =
            buildStockData(
                req
            );


        // ==================================================
        // ADMIN
        // ==================================================

        if (isAdmin(req)) {

            validateStockData(
                data,
                {
                    requireQuantity: true
                }
            );

        }


        // ==================================================
        // DAIRY WORKER
        // ==================================================
        //
        // Worker uses the existing stock's immutable
        // identity/category/unit/price information.
        //
        // ==================================================

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
            getUploadedImages(
                req
            );


        await storageService.updateStock({

            // STORAGE FACILITY ID

            dairyId:
                context.storageId,

            stockId,

            data,

            images

        });


        // --------------------------------------------------
        // Verify updated stock.
        // --------------------------------------------------

        const savedStock =
            await getStorageStock(

                context.storageId,

                stockId

            );


        if (!savedStock) {

            throw createError(

                "Stock update completed but the stock could not be found afterward.",

                500

            );

        }


        return res.redirect(

            `/dairy/feedstore/${encodeURIComponent(farmId)}`

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

            `/dairy/feedstore/${encodeURIComponent(farmId)}?feedStoreError=${message}`

        );

    }

}


// =========================================================
// RESTOCK STOCK
// =========================================================
//
// POST:
//
//     /dairy/:dairyId/feedstore/restock/:stockId
//
// dairyId = FARM _id
//
// =========================================================

async function restockStock(
    req,
    res
) {

    const farmId =
        getFarmId(req);


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


        if (!farmId) {

            return res.status(400).json({

                success: false,

                message:
                    "Dairy farm ID is required."

            });

        }


        if (!stockId) {

            return res.status(400).json({

                success: false,

                message:
                    "Stock ID is required."

            });

        }


        const context =
            await loadStorageContext(
                farmId
            );


        const existingStock =
            await getStorageStock(

                context.storageId,

                stockId

            );


        if (!existingStock) {

            return res.status(404).json({

                success: false,

                message:
                    "Stock not found."

            });

        }


        const data =
            buildRestockData(
                req
            );


        const quantity =
            Number(
                data.quantityAdded
            );


        if (
            !Number.isFinite(
                quantity
            ) ||
            quantity <= 0
        ) {

            throw createError(

                "Restock quantity must be greater than zero.",

                400

            );

        }


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
                !Number.isFinite(
                    price
                ) ||
                price < 0
            ) {

                throw createError(

                    "Restock price must be a valid non-negative number.",

                    400

                );

            }

        }


        const images =
            getUploadedImages(
                req
            );


        await storageService.restockStock({

            // STORAGE FACILITY ID

            dairyId:
                context.storageId,

            stockId,

            data,

            images

        });


        // --------------------------------------------------
        // Verify persistence.
        // --------------------------------------------------

        const savedStock =
            await getStorageStock(

                context.storageId,

                stockId

            );


        if (!savedStock) {

            throw createError(

                "Restock completed but the stock could not be found afterward.",

                500

            );

        }


        return res.redirect(

            `/dairy/feedstore/${encodeURIComponent(farmId)}`

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

            `/dairy/feedstore/${encodeURIComponent(farmId)}?feedStoreError=${message}`

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
// dairyId = FARM _id
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


        const farmId =
            getFarmId(req);


        const stockId =
            getStockId(req);


        if (!farmId) {

            return res.status(400).json({

                success: false,

                message:
                    "Dairy farm ID is required."

            });

        }


        if (!stockId) {

            return res.status(400).json({

                success: false,

                message:
                    "Stock ID is required."

            });

        }


        const context =
            await loadStorageContext(
                farmId
            );


        const stock =
            await getStorageStock(

                context.storageId,

                stockId

            );


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
// dairyId = FARM _id
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


        const farmId =
            getFarmId(req);


        const stockId =
            getStockId(req);


        if (!farmId) {

            return res.status(400).json({

                success: false,

                message:
                    "Dairy farm ID is required."

            });

        }


        if (!stockId) {

            return res.status(400).json({

                success: false,

                message:
                    "Stock ID is required."

            });

        }


        const context =
            await loadStorageContext(
                farmId
            );


        await storageService.deleteStock({

            // STORAGE FACILITY ID

            dairyId:
                context.storageId,

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
// EXPORTS
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