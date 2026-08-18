// =========================================================
// controllers/update/storageController.js
// =========================================================
//
// FEED STORE / STORAGE CONTROLLER
//
// Views:
//
//     views/update/storage/feed-stock.ejs
//     views/update/storage/add-stock.ejs
//     views/update/storage/update-stock.ejs
//     views/update/storage/restock.ejs
//
// Service:
//
//     services/update/storageService.js
//
// Model:
//
//     models/dairy.js
//
// RESPONSIBILITIES:
//
//     • Display feed-store inventory
//     • Display add-stock page
//     • Display update-stock page
//     • Display restock page
//     • Save new stock
//     • Update existing stock
//     • Restock existing stock
//     • Provide master dropdown options
//     • Return individual stock
//     • Delete stock
//
// ROLE RULES:
//
//     ADMIN
//         • View stock
//         • Add stock
//         • Update stock
//         • Restock stock
//         • Delete stock
//
//     DAIRY WORKER
//         • View stock
//         • Update stock
//
// =========================================================


const storageService =
    require("../../services/update/storageService");


const Dairy =
    require("../../models/dairy");


// ==========================================================
// HELPERS
// ==========================================================


// ==========================================================
// GET USER
// ==========================================================

function getUser(req) {

    return (

        req.session &&

        req.session.user

    ) || null;

}


// ==========================================================
// ADMIN CHECK
// ==========================================================

function isAdmin(req) {

    const user =
        getUser(req);


    return Boolean(

        user &&

        user.role === "admin"

    );

}


// ==========================================================
// ALLOWED STORAGE USER
// ==========================================================
//
// Both administrators and dairy workers may access the
// storage area.
//
// ==========================================================

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
// GET DAIRY ID
// ==========================================================
//
// Supports:
//
//     req.params.dairyId
//
// and:
//
//     req.params.id
//
// ==========================================================

function getDairyId(req) {

    return (

        req.params.dairyId ||

        req.params.id

    );

}


// ==========================================================
// GET STOCK ID
// ==========================================================
//
// Supports:
//
//     req.params.stockId
//
// and:
//
//     req.body.stockId
//
// ==========================================================

function getStockId(req) {

    return (

        req.params.stockId ||

        req.body.stockId ||

        ""

    );

}


// ==========================================================
// GET UPLOADED IMAGES
// ==========================================================
//
// Supports:
//
//     multer.array("images")
//
// and:
//
//     multer.fields({
//         images: ...
//     })
//
// ==========================================================

function getUploadedImages(req) {

    if (!req.files) {

        return [];

    }


    let files = [];


    // ======================================================
    // multer.array("images")
    // ======================================================

    if (
        Array.isArray(req.files)
    ) {

        files =
            req.files;

    }


    // ======================================================
    // multer.fields(...)
    // ======================================================

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
// GET STOCK OPTIONS
// ==========================================================
//
// IMPORTANT:
//
// These options come from the Dairy model's master lists.
//
// They MUST NOT be generated from existing feedStocks.
//
// This means the Add Stock page still has all dropdown
// options even when:
//
//     dairy.feedStocks = []
//
// ==========================================================

function getStockOptions() {

    const feedTypes =

        typeof Dairy.getFeedTypes ===
        "function"

            ? Dairy.getFeedTypes()

            : [];


    const medicineTypes =

        typeof Dairy.getVeterinaryMedicines ===
        "function"

            ? Dairy.getVeterinaryMedicines()

            : [];


    const stockUnits =

        typeof Dairy.getStockUnits ===
        "function"

            ? Dairy.getStockUnits()

            : [];


    return {

        feedTypes:
            Array.isArray(feedTypes)

                ? feedTypes

                : [],

        medicineTypes:
            Array.isArray(medicineTypes)

                ? medicineTypes

                : [],

        stockUnits:
            Array.isArray(stockUnits)

                ? stockUnits

                : []

    };

}


// ==========================================================
// GET FEED STORE ITEMS
// ==========================================================

function getFeedStoreItems(dairy) {

    return (

        Array.isArray(
            dairy.feedStocks
        )

            ? dairy.feedStocks

            : []

    );

}


// ==========================================================
// BUILD COMMON VIEW DATA
// ==========================================================
//
// All storage EJS pages receive the same basic data.
//
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
            getFeedStoreItems(dairy),

        feedTypes:
            options.feedTypes,

        medicineTypes:
            options.medicineTypes,

        stockUnits:
            options.stockUnits

    };

}


// ==========================================================
// GET DAIRY
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


    return storageService.getDairy(
        dairyId
    );

}


// ==========================================================
// GET FEED STOCK PAGE
// ==========================================================
//
// VIEW:
//
//     views/update/storage/feed-stock.ejs
//
// This is the inventory/list page.
//
// Clicking a stock item is handled by feed-stock.ejs:
//
//     ADMIN
//         → show Update / Restock choices
//
//     DAIRY WORKER
//         → go directly to Update Stock
//
// ==========================================================

async function getFeedStock(
    req,
    res
) {

    try {

        if (
            !canAccessStorage(req)
        ) {

            return res.status(
                403
            ).send(
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

    } catch (error) {

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
// VIEW:
//
//     views/update/storage/add-stock.ejs
//
// ADMIN ONLY.
//
// ==========================================================

async function getAddStock(
    req,
    res
) {

    try {

        if (
            !isAdmin(req)
        ) {

            return res.status(
                403
            ).send(
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

    } catch (error) {

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
// VIEW:
//
//     views/update/storage/update-stock.ejs
//
// ADMIN + DAIRY WORKER.
//
// ==========================================================

async function getUpdateStock(
    req,
    res
) {

    try {

        if (
            !canAccessStorage(req)
        ) {

            return res.status(
                403
            ).send(
                "Access denied."
            );

        }


        const dairyId =
            getDairyId(req);


        const stockId =
            getStockId(req);


        if (!stockId) {

            return res.status(
                400
            ).send(
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

    } catch (error) {

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
// VIEW:
//
//     views/update/storage/restock.ejs
//
// ADMIN ONLY.
//
// ==========================================================

async function getRestock(
    req,
    res
) {

    try {

        if (
            !isAdmin(req)
        ) {

            return res.status(
                403
            ).send(
                "Only an administrator can restock."
            );

        }


        const dairyId =
            getDairyId(req);


        const stockId =
            getStockId(req);


        if (!stockId) {

            return res.status(
                400
            ).send(
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

    } catch (error) {

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
// ADD NEW STOCK
// ==========================================================
//
// This handles:
//
//     views/update/storage/add-stock.ejs
//
// It creates a completely new stock item.
//
// ADMIN ONLY.
//
// ==========================================================

async function addStock(
    req,
    res
) {

    try {

        if (
            !isAdmin(req)
        ) {

            return res.status(
                403
            ).json({

                success:
                    false,

                message:
                    "Only an administrator can add stock."

            });

        }


        const dairyId =
            getDairyId(req);


        if (!dairyId) {

            return res.status(
                400
            ).json({

                success:
                    false,

                message:
                    "Dairy ID is required."

            });

        }


        const data = {

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


        const images =
            getUploadedImages(req);


        await storageService.addStock({

            dairyId,

            data,

            images

        });


        return res.redirect(

            `/dairy/${dairyId}/feedstore`

        );

    } catch (error) {

        console.error(
            "STORAGE ADD STOCK ERROR:",
            error
        );


        const dairyId =
            getDairyId(req);


        const message =
            encodeURIComponent(

                error.message ||

                "Unable to add stock."

            );


        return res.redirect(

            `/dairy/${dairyId}/feedstore?feedStoreError=${message}`

        );

    }

}


// ==========================================================
// UPDATE EXISTING STOCK
// ==========================================================
//
// This handles:
//
//     views/update/storage/update-stock.ejs
//
// ADMIN + DAIRY WORKER.
//
// IMPORTANT:
//
// This is an UPDATE.
//
// It does NOT represent a new delivery/restock.
//
// ==========================================================

async function updateStock(
    req,
    res
) {

    try {

        if (
            !canAccessStorage(req)
        ) {

            return res.status(
                403
            ).json({

                success:
                    false,

                message:
                    "You are not allowed to update stock."

            });

        }


        const dairyId =
            getDairyId(req);


        const stockId =
            getStockId(req);


        if (!dairyId) {

            return res.status(
                400
            ).json({

                success:
                    false,

                message:
                    "Dairy ID is required."

            });

        }


        if (!stockId) {

            return res.status(
                400
            ).json({

                success:
                    false,

                message:
                    "Stock ID is required."

            });

        }


        const data = {

            quantity:
                req.body.quantity,

            price:
                req.body.price,

            instructions:
                req.body.instructions,

            expectedDuration:
                req.body.expectedDuration,

            message:
                req.body.message

        };


        const images =
            getUploadedImages(req);


        await storageService.updateStock({

            dairyId,

            stockId,

            data,

            images

        });


        return res.redirect(

            `/dairy/${dairyId}/feedstore`

        );

    } catch (error) {

        console.error(
            "STORAGE UPDATE STOCK ERROR:",
            error
        );


        const dairyId =
            getDairyId(req);


        const message =
            encodeURIComponent(

                error.message ||

                "Unable to update stock."

            );


        return res.redirect(

            `/dairy/${dairyId}/feedstore?feedStoreError=${message}`

        );

    }

}


// ==========================================================
// RESTOCK EXISTING STOCK
// ==========================================================
//
// This handles:
//
//     views/update/storage/restock.ejs
//
// ADMIN ONLY.
//
// Restocking should be treated as a separate operation from
// simply editing the stock record.
//
// ==========================================================

async function restockStock(
    req,
    res
) {

    try {

        if (
            !isAdmin(req)
        ) {

            return res.status(
                403
            ).json({

                success:
                    false,

                message:
                    "Only an administrator can restock stock."

            });

        }


        const dairyId =
            getDairyId(req);


        const stockId =
            getStockId(req);


        if (!dairyId) {

            return res.status(
                400
            ).json({

                success:
                    false,

                message:
                    "Dairy ID is required."

            });

        }


        if (!stockId) {

            return res.status(
                400
            ).json({

                success:
                    false,

                message:
                    "Stock ID is required."

            });

        }


        const data = {

            quantity:
                req.body.quantity,

            price:
                req.body.price,

            instructions:
                req.body.instructions,

            expectedDuration:
                req.body.expectedDuration,

            message:
                req.body.message

        };


        const images =
            getUploadedImages(req);


        await storageService.restockStock({

            dairyId,

            stockId,

            data,

            images

        });


        return res.redirect(

            `/dairy/${dairyId}/feedstore`

        );

    } catch (error) {

        console.error(
            "STORAGE RESTOCK ERROR:",
            error
        );


        const dairyId =
            getDairyId(req);


        const message =
            encodeURIComponent(

                error.message ||

                "Unable to restock stock."

            );


        return res.redirect(

            `/dairy/${dairyId}/feedstore?feedStoreError=${message}`

        );

    }

}


// ==========================================================
// GET ONE STOCK
// ==========================================================
//
// Useful for AJAX / API requests.
//
// ==========================================================

async function getStock(
    req,
    res
) {

    try {

        if (
            !canAccessStorage(req)
        ) {

            return res.status(
                403
            ).json({

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

            return res.status(
                400
            ).json({

                success:
                    false,

                message:
                    "Dairy ID is required."

            });

        }


        if (!stockId) {

            return res.status(
                400
            ).json({

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


        return res.json({

            success:
                true,

            stock

        });

    } catch (error) {

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
// ADMIN ONLY.
//
// ==========================================================

async function deleteStock(
    req,
    res
) {

    try {

        if (
            !isAdmin(req)
        ) {

            return res.status(
                403
            ).json({

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

            return res.status(
                400
            ).json({

                success:
                    false,

                message:
                    "Dairy ID is required."

            });

        }


        if (!stockId) {

            return res.status(
                400
            ).json({

                success:
                    false,

                message:
                    "Dairy ID is required."

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

    } catch (error) {

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
// EXPORTS
// ==========================================================

module.exports = {

    // ======================================================
    // PAGES
    // ======================================================

    getFeedStock,

    getAddStock,

    getUpdateStock,

    getRestock,


    // ======================================================
    // ACTIONS
    // ======================================================

    addStock,

    updateStock,

    restockStock,


    // ======================================================
    // API / MANAGEMENT
    // ======================================================

    getStock,

    deleteStock

};