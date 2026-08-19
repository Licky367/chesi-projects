// =========================================================
// controllers/update/storageController.js
// =========================================================
//
// FEED STORE / STORAGE CONTROLLER
//
// ACTUAL ROUTES:
//
//     GET    /dairy/feedstore/:dairyId
//     GET    /dairy/:dairyId/feedstore/add
//     GET    /dairy/:dairyId/feedstore/update/:stockId
//     GET    /dairy/:dairyId/feedstore/restock/:stockId
//
//     POST   /dairy/:dairyId/feedstore/add
//     PUT    /dairy/:dairyId/feedstore/update/:stockId
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
// ==========================================================


const storageService =
    require("../../services/update/storageService");


// ==========================================================
// USER
// ==========================================================

function getUser(req) {

    return (
        req.session &&
        req.session.user
    ) || null;

}


// ==========================================================
// ROLE CHECKS
// ==========================================================

function isAdmin(req) {

    const user =
        getUser(req);

    return Boolean(

        user &&
        user.role === "admin"

    );

}


function canAccessStorage(req) {

    const user =
        getUser(req);

    return Boolean(

        user &&

        (
            user.role === "admin" ||
            user.role === "dairyWorker"
        )

    );

}


// ==========================================================
// ROUTE PARAMETERS
// ==========================================================

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


// ==========================================================
// UPLOADED IMAGES
// ==========================================================

function getUploadedImages(req) {

    if (!req.files) {

        return [];

    }


    let files = [];


    // ------------------------------------------------------
    // multer.array("images", 10)
    // ------------------------------------------------------

    if (Array.isArray(req.files)) {

        files =
            req.files;

    }


    // ------------------------------------------------------
    // multer.fields(...)
    // ------------------------------------------------------

    else if (
        Array.isArray(req.files.images)
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


// ==========================================================
// STORAGE OPTIONS
// ==========================================================

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


// ==========================================================
// FEED STORE ITEMS
// ==========================================================

function getFeedStoreItems(
    dairy
) {

    return (

        dairy &&
        Array.isArray(
            dairy.feedStocks
        )

    )

        ? dairy.feedStocks

        : [];

}


// ==========================================================
// COMMON VIEW DATA
// ==========================================================

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


// ==========================================================
// LOAD DAIRY
// ==========================================================

async function loadDairy(
    dairyId
) {

    if (!dairyId) {

        const error =
            new Error(
                "Dairy ID is required."
            );

        error.statusCode =
            400;

        throw error;

    }


    if (
        !storageService ||
        typeof storageService.getDairy !==
            "function"
    ) {

        const error =
            new Error(
                "Storage service cannot load the dairy."
            );

        error.statusCode =
            500;

        throw error;

    }


    const dairy =
        await storageService.getDairy(
            dairyId
        );


    if (!dairy) {

        const error =
            new Error(
                "Dairy not found."
            );

        error.statusCode =
            404;

        throw error;

    }


    return dairy;

}


// ==========================================================
// GET FEED STOCK PAGE
// ==========================================================
//
// GET:
//
//     /dairy/feedstore/:dairyId
//
// ==========================================================

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


// ==========================================================
// GET ADD STOCK PAGE
// ==========================================================
//
// GET:
//
//     /dairy/:dairyId/feedstore/add
//
// ==========================================================

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


// ==========================================================
// GET UPDATE STOCK PAGE
// ==========================================================
//
// GET:
//
//     /dairy/:dairyId/feedstore/update/:stockId
//
// ==========================================================

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


// ==========================================================
// GET RESTOCK PAGE
// ==========================================================
//
// GET:
//
//     /dairy/:dairyId/feedstore/restock/:stockId
//
// VIEW:
//
//     views/update/storage/restock.ejs
//
// ==========================================================

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


        // --------------------------------------------------
        // IMPORTANT:
        //
        // The actual file is:
        //
        //     views/update/storage/restock.ejs
        //
        // NOT:
        //
        //     restock-stock.ejs
        // --------------------------------------------------

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


// ==========================================================
// BUILD STOCK DATA
// ==========================================================
//
// `name` is now the primary stock-name field.
//
// Legacy:
//
//     feedName
//     medicineName
//
// are still accepted so older forms do not break.
//
// ==========================================================

function buildStockData(
    req
) {

    const body =
        req.body || {};


    const category =
        String(
            body.category ||
            "feed"
        )
            .trim()
            .toLowerCase();


    const submittedName =
        String(
            body.name ||
            ""
        ).trim();


    const feedName =
        String(
            body.feedName ||
            ""
        ).trim();


    const medicineName =
        String(
            body.medicineName ||
            ""
        ).trim();


    let name =
        submittedName;


    // ------------------------------------------------------
    // Backwards compatibility
    // ------------------------------------------------------

    if (!name) {

        if (category === "medicine") {

            name =
                medicineName;

        }

        else {

            name =
                feedName;

        }

    }


    return {

        name,

        feedName,

        medicineName,

        category,

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


// ==========================================================
// BUILD RESTOCK DATA
// ==========================================================
//
// Restock is different from Update.
//
// It adds quantity to the existing stock.
//
// The restock form does not edit:
//
//     - stock name
//     - category
//     - unit
//
// Those belong to the existing stock item.
//
// Admin can provide:
//
//     - quantity
//     - price
//     - instructions
//     - expected duration
//     - additional information
//
// ==========================================================

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


// ==========================================================
// ADD STOCK
// ==========================================================
//
// POST:
//
//     /dairy/:dairyId/feedstore/add
//
// ==========================================================

async function addStock(
    req,
    res
) {

    const dairyId =
        getDairyId(req);


    try {

        if (!isAdmin(req)) {

            return res.status(403).json({

                success:
                    false,

                message:
                    "Only an administrator can add stock."

            });

        }


        if (!dairyId) {

            return res.status(400).json({

                success:
                    false,

                message:
                    "Dairy ID is required."

            });

        }


        const data =
            buildStockData(req);


        const images =
            getUploadedImages(req);


        await storageService.restockStock({

            dairyId,

            stockId:
                "",

            data,

            images

        });


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


// ==========================================================
// UPDATE STOCK
// ==========================================================
//
// PUT:
//
//     /dairy/:dairyId/feedstore/update/:stockId
//
// ADMIN:
//
//     Can update name.
//     Can update quantity.
//     Can update price.
//     Can update instructions.
//     Can update expected duration.
//     Can update additional information.
//
// DAIRY WORKER:
//
//     Can update quantity.
//     Can update additional information.
//
//     Cannot update:
//
//         name
//         price
//         instructions
//         expectedDuration
//
// ==========================================================

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

                success:
                    false,

                message:
                    "You are not allowed to update stock."

            });

        }


        if (!dairyId) {

            return res.status(400).json({

                success:
                    false,

                message:
                    "Dairy ID is required."

            });

        }


        if (!stockId) {

            return res.status(400).json({

                success:
                    false,

                message:
                    "Stock ID is required."

            });

        }


        const data =
            buildStockData(req);


        // --------------------------------------------------
        // SECURITY:
        //
        // Dairy workers cannot change admin-controlled
        // fields, even if they manually submit them.
        // --------------------------------------------------

        if (!isAdmin(req)) {

            delete data.name;

            delete data.feedName;

            delete data.medicineName;

            delete data.price;

            delete data.instructions;

            delete data.expectedDuration;

        }


        const images =
            getUploadedImages(req);


        await storageService.saveStock({

            dairyId,

            stockId,

            data,

            images

        });


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


// ==========================================================
// RESTOCK STOCK
// ==========================================================
//
// POST:
//
//     /dairy/:dairyId/feedstore/restock/:stockId
//
// IMPORTANT:
//
//     Restock ADDS quantity.
//
//     It does NOT replace the existing quantity.
//
//     Example:
//
//         Existing = 100
//         Received = 50
//         Result   = 150
//
// ==========================================================

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

                success:
                    false,

                message:
                    "Only an administrator can restock stock."

            });

        }


        if (!dairyId) {

            return res.status(400).json({

                success:
                    false,

                message:
                    "Dairy ID is required."

            });

        }


        if (!stockId) {

            return res.status(400).json({

                success:
                    false,

                message:
                    "Stock ID is required."

            });

        }


        // --------------------------------------------------
        // IMPORTANT:
        //
        // Restock.ejs only submits the NEW quantity received.
        //
        // It does NOT submit the current stock quantity.
        //
        // The service is responsible for adding the submitted
        // quantity to the existing quantity.
        // --------------------------------------------------

        const data =
            buildRestockData(req);


        const images =
            getUploadedImages(req);


        await storageService.restockStock({

            dairyId,

            stockId,

            data,

            images

        });


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


// ==========================================================
// GET ONE STOCK
// ==========================================================
//
// GET:
//
//     /dairy/:dairyId/feedstore/:stockId
//
// ==========================================================

async function getStock(
    req,
    res
) {

    try {

        if (!canAccessStorage(req)) {

            return res.status(403).json({

                success:
                    false,

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

                success:
                    false,

                message:
                    "Dairy ID is required."

            });

        }


        if (!stockId) {

            return res.status(400).json({

                success:
                    false,

                message:
                    "Stock ID is required."

            });

        }


        const stock =
            await storageService.getStock({

                dairyId,

                stockId

            });


        if (!stock) {

            return res.status(404).json({

                success:
                    false,

                message:
                    "Stock not found."

            });

        }


        return res.json({

            success:
                true,

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

            success:
                false,

            message:
                error.message ||
                "Unable to load stock."

        });

    }

}


// ==========================================================
// DELETE STOCK
// ==========================================================
//
// DELETE:
//
//     /dairy/:dairyId/feedstore/:stockId
//
// ==========================================================

async function deleteStock(
    req,
    res
) {

    try {

        if (!isAdmin(req)) {

            return res.status(403).json({

                success:
                    false,

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

                success:
                    false,

                message:
                    "Dairy ID is required."

            });

        }


        if (!stockId) {

            return res.status(400).json({

                success:
                    false,

                message:
                    "Stock ID is required."

            });

        }


        await storageService.deleteStock({

            dairyId,

            stockId

        });


        return res.json({

            success:
                true,

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

            success:
                false,

            message:
                error.message ||
                "Unable to delete stock."

        });

    }

}


// ==========================================================
// EXPORT
// ==========================================================

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