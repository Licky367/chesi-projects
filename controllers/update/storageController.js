// =========================================================
// controllers/update/storageController.js
// =========================================================
//
// FEED STORE / STORAGE CONTROLLER
//
// View:
//      views/update/storage/feed-store.ejs
//
// Service:
//      services/update/storageService.js
//
// MODEL:
//      models/dairy.js
//
// IMPORTANT:
// ---------------------------------------------------------
// Dropdown options MUST come from the Dairy model's
// master lists, NOT from existing stock.
//
// Therefore:
//
//     feedTypes
//     medicineTypes
//     stockUnits
//
// are always available to the view, even when the dairy
// currently has NO feed-store stock.
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

    if (
        !req.files
    ) {

        return [];

    }


    let files = [];


    // ======================================================
    // multer.array("images")
    // ======================================================

    if (
        Array.isArray(
            req.files
        )
    ) {

        files =
            req.files;

    }


    // ======================================================
    // multer.fields(...)
    // ======================================================

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


// ==========================================================
// GET STOCK OPTIONS
// ==========================================================
//
// IMPORTANT:
//
// DO NOT build these lists from dairy.feedStocks.
//
// The dairy may have:
//
//     feedStocks = []
//
// while the application still needs to display all available
// feed and veterinary-medicine options.
//
// The master lists are defined in:
//
//     models/dairy.js
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
// BUILD VIEW DATA
// ==========================================================
//
// Keeps the variables supplied to feed-store.ejs in one
// place so every render receives the same complete data.
//
// The view expects:
//
//     dairy
//     user
//     feedStoreItems
//     feedTypes
//     medicineTypes
//     stockUnits
//
// ==========================================================

function buildFeedStoreViewData(
    dairy,
    req
) {

    const stocks =

        Array.isArray(
            dairy.feedStocks
        )

            ? dairy.feedStocks

            : [];


    const options =
        getStockOptions();


    return {

        dairy,

        user:
            getUser(req),

        feedStoreItems:
            stocks,

        feedTypes:
            options.feedTypes,

        medicineTypes:
            options.medicineTypes,

        stockUnits:
            options.stockUnits

    };

}


// ==========================================================
// GET FEED STORE
// ==========================================================
//
// Renders:
//
//     views/update/storage/feed-store.ejs
//
// ==========================================================

async function getFeedStore(
    req,
    res
) {

    try {

        // ==================================================
        // DAIRY ID
        // ==================================================

        const dairyId =
            getDairyId(req);


        if (
            !dairyId
        ) {

            return res.status(
                400
            ).json({

                success:
                    false,

                message:
                    "Dairy ID is required."

            });

        }


        // ==================================================
        // GET DAIRY
        // ==================================================

        const dairy =
            await storageService.getDairy(
                dairyId
            );


        // ==================================================
        // VIEW DATA
        // ==================================================

        const viewData =
            buildFeedStoreViewData(
                dairy,
                req
            );


        // ==================================================
        // RENDER
        // ==================================================

        return res.render(

            "update/storage/feed-store",

            viewData

        );

    } catch (error) {

        console.error(
            "STORAGE GET ERROR:",
            error
        );


        return res.status(

            error.statusCode || 500

        ).json({

            success:
                false,

            message:
                error.message ||

                "Unable to load Feed Store."

        });

    }

}


// ==========================================================
// SAVE STOCK
// ==========================================================
//
// Handles:
//
//     NEW STOCK
//
// and:
//
//     EXISTING STOCK / RESTOCK
//
// ==========================================================

async function saveStock(
    req,
    res
) {

    try {

        // ==================================================
        // ADMIN CHECK
        // ==================================================

        if (
            !isAdmin(req)
        ) {

            return res.status(
                403
            ).json({

                success:
                    false,

                message:
                    "Only an administrator can manage stock."

            });

        }


        // ==================================================
        // DAIRY ID
        // ==================================================

        const dairyId =
            getDairyId(req);


        if (
            !dairyId
        ) {

            return res.status(
                400
            ).json({

                success:
                    false,

                message:
                    "Dairy ID is required."

            });

        }


        // ==================================================
        // STOCK ID
        // ==================================================
        //
        // Empty = new stock
        //
        // Existing ID = update/restock
        //
        // ==================================================

        const stockId =
            String(

                req.body.stockId ||

                ""

            ).trim();


        // ==================================================
        // STOCK DATA
        // ==================================================

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


        // ==================================================
        // IMAGES
        // ==================================================

        const images =
            getUploadedImages(req);


        // ==================================================
        // SAVE THROUGH SERVICE
        // ==================================================

        await storageService.saveStock({

            dairyId,

            stockId,

            data,

            images

        });


        // ==================================================
        // SUCCESS REDIRECT
        // ==================================================
        //
        // The feed-store form is a normal HTML form.
        //
        // Therefore redirect after successful save.
        //
        // ==================================================

        return res.redirect(

            `/dairy/${dairyId}`

        );

    } catch (error) {

        console.error(
            "STORAGE SAVE ERROR:",
            error
        );


        const dairyId =
            getDairyId(req);


        const message =
            encodeURIComponent(

                error.message ||

                "Unable to save stock."

            );


        return res.redirect(

            `/dairy/${dairyId}?feedStoreError=${message}`

        );

    }

}


// ==========================================================
// GET ONE STOCK
// ==========================================================

async function getStock(
    req,
    res
) {

    try {

        // ==================================================
        // DAIRY ID
        // ==================================================

        const dairyId =
            getDairyId(req);


        // ==================================================
        // STOCK ID
        // ==================================================

        const stockId =
            req.params.stockId;


        // ==================================================
        // GET STOCK
        // ==================================================

        const stock =
            await storageService.getStock({

                dairyId,

                stockId

            });


        // ==================================================
        // RESPONSE
        // ==================================================

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

async function deleteStock(
    req,
    res
) {

    try {

        // ==================================================
        // ADMIN CHECK
        // ==================================================

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


        // ==================================================
        // DAIRY ID
        // ==================================================

        const dairyId =
            getDairyId(req);


        // ==================================================
        // STOCK ID
        // ==================================================

        const stockId =
            req.params.stockId;


        // ==================================================
        // DELETE
        // ==================================================

        await storageService.deleteStock({

            dairyId,

            stockId

        });


        // ==================================================
        // RESPONSE
        // ==================================================

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

    getFeedStore,

    getStock,

    saveStock,

    deleteStock

};