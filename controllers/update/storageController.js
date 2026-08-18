// =========================================================
// controllers/update/storageController.js
// ==========================================================
//
// FEED STORE / STORAGE CONTROLLER
//
// View:
//      views/update/storage/feed-store.ejs
//
// Service:
//      services/update/storageService.js
//
// ==========================================================

const Dairy =
    require("../../models/dairy");

const storageService =
    require("../../services/update/storageService");


// ==========================================================
// HELPERS
// ==========================================================

function getUser(req) {

    return (
        req.session &&
        req.session.user
    ) || null;

}


function isAdmin(req) {

    const user =
        getUser(req);


    return Boolean(
        user &&
        user.role === "admin"
    );

}


function getDairyId(req) {

    return (
        req.params.dairyId ||
        req.params.id
    );

}


function getUploadedImages(req) {

    if (
        !req.files
    ) {

        return [];

    }


    let files = [];


    /*
     * multer.array("images")
     */

    if (
        Array.isArray(
            req.files
        )
    ) {

        files =
            req.files;

    }


    /*
     * multer.fields(...)
     */

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
// GET FEED STORE
// ==========================================================
//
// Optional endpoint if the storage page is rendered
// independently.
//
// The feed-store.ejs view expects:
//
//     dairy
//     user
//     feedStoreItems
//     feedTypes
//     medicineTypes
//     stockUnits
//
// ==========================================================

async function getFeedStore(
    req,
    res
) {

    try {

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
        // DAIRY
        // ==================================================

        const dairy =
            await Dairy
                .findById(
                    dairyId
                )
                .lean();


        if (
            !dairy
        ) {

            return res.status(
                404
            ).json({

                success:
                    false,

                message:
                    "Dairy not found."

            });

        }



        // ==================================================
        // STOCK
        // ==================================================

        const stocks =
            await storageService.getStocks(
                dairyId
            );



        // ==================================================
        // USER
        // ==================================================

        const user =
            getUser(req);



        // ==================================================
        // STOCK TYPE OPTIONS
        //
        // These are supplied to the view so the EJS
        // template never references an undefined variable.
        //
        // They can be replaced with the application's
        // configured lists when those are defined in the
        // storage service/model.
        // ==================================================

        const feedTypes = [];

        const medicineTypes = [];

        const stockUnits = [];



        // ==================================================
        // RENDER
        // ==================================================

        return res.render(
            "update/storage/feed-store",
            {

                dairy,

                user,

                feedStoreItems:
                    stocks,

                feedTypes,

                medicineTypes,

                stockUnits

            }
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
// Matches:
//
// POST
// /dairy/:dairyId/feedstore/restock
//
// From the view:
//
// stockId
// category
// feedName
// medicineName
// quantity
// unit
// price
// instructions
// expectedDuration
// message
// images
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
        // DAIRY
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

        const stockId =
            String(
                req.body.stockId ||
                ""
            ).trim();



        // ==================================================
        // DATA
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
            getUploadedImages(
                req
            );



        // ==================================================
        // SAVE
        // ==================================================

        await storageService.saveStock({

            dairyId,

            stockId,

            data,

            images

        });



        // ==================================================
        // RESPONSE
        // ==================================================

        /*
         * The supplied view uses a standard HTML form,
         * not fetch().
         *
         * Therefore redirect after successful submission.
         */

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


        /*
         * Preserve the normal form-submission flow.
         */

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

        const dairyId =
            getDairyId(req);


        const stockId =
            req.params.stockId;


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
            req.params.stockId;


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

    getFeedStore,

    getStock,

    saveStock,

    deleteStock

};