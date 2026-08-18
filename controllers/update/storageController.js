// =========================================================
// controllers/update/storageController.js
// =========================================================
//
// FEED STORE / STORAGE CONTROLLER
//
// ROUTES:
//
//     GET    /dairy/feedstore/:dairyId
//     GET    /dairy/:dairyId/feedstore/add
//     GET    /dairy/:dairyId/feedstore/:stockId/update
//     GET    /dairy/:dairyId/feedstore/:stockId/restock
//     GET    /dairy/:dairyId/feedstore/:stockId
//
//     POST   /dairy/:dairyId/feedstore/add
//     PUT    /dairy/:dairyId/feedstore/:stockId/update
//     POST   /dairy/:dairyId/feedstore/:stockId/restock
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
//
// Router mapping:
//
//     :dairyId
//     :stockId
//
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
        typeof storageService.getStorageOptions !== "function"
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

function getFeedStoreItems(dairy) {

    return (

        dairy &&
        Array.isArray(dairy.feedStocks)

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
        typeof storageService.getDairy !== "function"
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
// GET FEED STOCK
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
//     /dairy/:dairyId/feedstore/:stockId/update
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
//     /dairy/:dairyId/feedstore/:stockId/restock
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

function buildStockData(req) {

    return {

        category:
            req.body.category,

        feedName:
            req.body.feedName,

        medicineName:
            req.body.medicineName,

        quantity:
            req.body.quantity,

        unit:
            req.body.unit,

        price:
            req.body.price,

        instructions:
            req.body.instructions,

        expectedDuration:
            req.body.expectedDuration,

        message:
            req.body.message

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
// AFTER SUCCESS:
//
//     REDIRECT TO:
//
//     /dairy/feedstore/:dairyId
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


        await storageService.saveStock({

            dairyId,

            stockId:
                "",

            data,

            images

        });


        // ==================================================
        // CORRECT SUCCESS REDIRECT
        //
        // Router:
        //
        // GET /dairy/feedstore/:dairyId
        // ==================================================

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


        // ==================================================
        // CORRECT ERROR REDIRECT
        // ==================================================

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
//     /dairy/:dairyId/feedstore/:stockId/update
//
// AFTER SUCCESS:
//
//     REDIRECT TO:
//
//     /dairy/feedstore/:dairyId
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
//     /dairy/:dairyId/feedstore/:stockId/restock
//
// AFTER SUCCESS:
//
//     REDIRECT TO:
//
//     /dairy/feedstore/:dairyId
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


        const data =
            buildStockData(req);


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

    // PAGES

    getFeedStock,

    getAddStock,

    getUpdateStock,

    getRestock,


    // ACTIONS

    addStock,

    updateStock,

    restockStock,


    // API / MANAGEMENT

    getStock,

    deleteStock

};