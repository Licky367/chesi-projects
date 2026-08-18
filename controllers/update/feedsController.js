// ==========================================================
// controllers/update/feedsController.js
// ==========================================================
//
// FEED STORE CONTROLLER
//
// Responsibilities:
//
//     • Render feed-store page
//     • Allow ADMIN to add animal feed
//     • Allow ADMIN to add veterinary medicine
//     • Allow ADMIN to restock existing stock
//     • Allow ADMIN to edit stock quantity
//     • Allow ADMIN to edit stock unit
//     • Allow ADMIN to add price/value
//     • Allow ADMIN to add instructions
//     • Allow ADMIN to add expected duration
//     • Allow ADMIN to add additional information
//     • Allow ADMIN to upload images
//
//     • Allow ANY authenticated user to update
//       the remaining quantity of existing stock
//
//     • Prevent non-admin users from changing stock unit
//     • Prevent non-admin users from changing price
//     • Prevent non-admin users from adding instructions
//     • Prevent non-admin users from adding expected duration
//
//     • Pass uploaded images to the service
//     • Keep financial information away from workers/users
//     • Return consistent success/error redirects
//     • Provide ONE unified foodstock history containing
//       BOTH stock additions AND remaining-stock updates
//
// ROUTES:
//
//     GET  /dairy/feedstore/:id
//
//     POST /dairy/:id/feedstore/restock
//
//     POST /dairy/:id/feedstore/update
//
// ==========================================================


const feedsService =
    require("../../services/update/feedsService");


// ==========================================================
// HELPERS
// ==========================================================


/* ==========================================================
   GET USER
========================================================== */

function getUser(req) {

    return (
        req &&
        req.user
    ) || null;

}


/* ==========================================================
   GET USER ROLE
========================================================== */

function getUserRole(req) {

    const user =
        getUser(req);

    return (
        user &&
        user.role
    ) || null;

}


/* ==========================================================
   GET DAIRY ID
========================================================== */

function getDairyId(req) {

    return (
        req &&
        req.params &&
        req.params.id
    ) || null;

}


/* ==========================================================
   GET UPLOADED FILES
========================================================== */

function getFiles(req) {

    if (
        req &&
        Array.isArray(req.files)
    ) {

        return req.files;

    }

    return [];

}


/* ==========================================================
   GET REQUIRED TEXT
========================================================== */

function getRequiredText(value) {

    if (
        value === undefined ||
        value === null
    ) {

        return null;

    }

    const text =
        String(value).trim();

    return text || null;

}


/* ==========================================================
   PARSE NUMBER SAFELY
==========================================================
//
// IMPORTANT:
//
// Never allow:
//
//     Number("")
//     Number(undefined)
//     Number(null)
//     Number("abc")
//
// to silently become an invalid stock value.
//
// This helper returns:
//
//     valid number
//     OR null
//
// It NEVER returns NaN.
//

function parseNumber(value) {

    if (
        value === undefined ||
        value === null
    ) {

        return null;

    }


    if (
        typeof value === "string" &&
        value.trim() === ""
    ) {

        return null;

    }


    const number =
        Number(value);


    if (
        !Number.isFinite(number)
    ) {

        return null;

    }


    return number;

}


/* ==========================================================
   ERROR MESSAGE
========================================================== */

function getErrorMessage(
    error,
    fallback
) {

    if (
        error &&
        typeof error.message === "string" &&
        error.message.trim()
    ) {

        return error.message.trim();

    }

    return (
        fallback ||
        "Unable to process feed-store request."
    );

}


// ==========================================================
// ERROR REDIRECT
// ==========================================================

function redirectWithError(
    res,
    dairyId,
    error
) {

    const message =
        typeof error === "string"

            ? error

            : getErrorMessage(
                error,
                "Unable to process feed-store request."
            );


    return res.redirect(

        `/dairy/feedstore/${dairyId}` +
        `?error=${encodeURIComponent(message)}`

    );

}


// ==========================================================
// SUCCESS REDIRECT
// ==========================================================

function redirectWithSuccess(
    res,
    dairyId,
    message
) {

    return res.redirect(

        `/dairy/feedstore/${dairyId}` +
        `?success=${encodeURIComponent(message)}`

    );

}


// ==========================================================
// BUILD UNIFIED FOODSTOCK HISTORY
// ==========================================================
//
// The feed-store page displays:
//
//     • Stock additions
//     • Remaining-stock updates
//
// The service may return:
//
//     data.updates
//     data.feedUpdates
//
// These are combined into ONE history array.
//
// Every Update document remains independent.
//
// stock.ejs receives:
//
//     item: item
//
// ==========================================================

function buildFoodstockUpdates(data) {

    const stockUpdates =
        data &&
        Array.isArray(data.updates)

            ? data.updates

            : [];


    const remainingUpdates =
        data &&
        Array.isArray(data.feedUpdates)

            ? data.feedUpdates

            : [];


    const combined =
        [
            ...stockUpdates,
            ...remainingUpdates
        ];


    // ======================================================
    // REMOVE DUPLICATES
    // ======================================================

    const seen =
        new Set();


    const uniqueUpdates =
        combined.filter(
            function(item) {

                if (!item) {

                    return false;

                }


                const id =
                    item._id
                        ? String(item._id)
                        : null;


                if (id) {

                    if (seen.has(id)) {

                        return false;

                    }


                    seen.add(id);

                }


                return true;

            }
        );


    // ======================================================
    // NEWEST FIRST
    // ======================================================

    uniqueUpdates.sort(
        function(a, b) {

            const dateA =
                a &&
                a.createdAt

                    ? new Date(
                        a.createdAt
                    ).getTime()

                    : 0;


            const dateB =
                b &&
                b.createdAt

                    ? new Date(
                        b.createdAt
                    ).getTime()

                    : 0;


            return dateB - dateA;

        }
    );


    return uniqueUpdates;

}


// ==========================================================
// PREPARE STOCK DATA FOR THE PAGE
// ==========================================================
//
// IMPORTANT:
//
// The controller does NOT manufacture stock quantities.
//
// The service loads the actual database inventory.
//
// The EJS receives:
//
//     • _id
//     • name
//     • category
//     • quantityRemaining
//     • unit
//     • price
//     • instructions
//     • expectedDuration
//
// ==========================================================

function prepareFeedStocks(
    dairy
) {

    if (
        !dairy ||
        !Array.isArray(dairy.feedStocks)
    ) {

        return [];

    }


    return dairy.feedStocks.map(
        function(stock) {

            if (!stock) {

                return null;

            }


            return stock;

        }
    ).filter(
        function(stock) {

            return Boolean(stock);

        }
    );

}


// ==========================================================
// VIEW FEED STORE
// ==========================================================
//
// GET /dairy/feedstore/:id
//
// ==========================================================

async function viewFeedStore(
    req,
    res
) {

    const dairyId =
        getDairyId(req);


    try {

        // ==================================================
        // AUTHENTICATION
        // ==================================================

        const user =
            getUser(req);


        if (!user) {

            return res
                .status(401)
                .send(
                    "Authentication required."
                );

        }


        // ==================================================
        // DAIRY ID
        // ==================================================

        if (!dairyId) {

            return res
                .status(400)
                .send(
                    "Dairy ID is required."
                );

        }


        // ==================================================
        // LOAD FEED STORE DATA
        // ==================================================

        const data =
            await feedsService.getFeedStorePage({

                dairyId,

                user

            });


        // ==================================================
        // BUILD UNIFIED HISTORY
        // ==================================================

        const unifiedUpdates =
            buildFoodstockUpdates(
                data
            );


        // ==================================================
        // CURRENT DAIRY
        // ==================================================

        const currentDairy =
            data &&
            data.dairy
                ? data.dairy
                : null;


        // ==================================================
        // DAIRY MUST EXIST
        // ==================================================

        if (!currentDairy) {

            return res
                .status(404)
                .send(
                    "Dairy profile not found."
                );

        }


        // ==================================================
        // CURRENT STOCK
        // ==================================================
        //
        // This is the REAL inventory loaded from MongoDB.
        //
        // It is used by the EJS to display clickable stock
        // records and their current quantities.
        //
        // ==================================================

        const currentFeedStocks =
            prepareFeedStocks(
                currentDairy
            );


        // ==================================================
        // PAGE DATA
        // ==================================================

        const pageData = {

            ...data,


            dairy:
                currentDairy,


            user,


            // ==================================================
            // REAL CURRENT INVENTORY
            // ==================================================

            feedStocks:
                currentFeedStocks,


            // ==================================================
            // UNIFIED FOODSTOCK HISTORY
            // ==================================================

            updates:
                unifiedUpdates,


            // ==================================================
            // ORIGINAL FEED HISTORY
            // ==================================================

            feedUpdates:
                data &&
                Array.isArray(data.feedUpdates)

                    ? data.feedUpdates

                    : [],


            // ==================================================
            // FORM OPTIONS
            // ==================================================

            feedTypes:
                data &&
                Array.isArray(data.feedTypes)

                    ? data.feedTypes

                    : [],


            medicineTypes:
                data &&
                Array.isArray(data.medicineTypes)

                    ? data.medicineTypes

                    : [],


            stockUnits:
                data &&
                Array.isArray(data.stockUnits)

                    ? data.stockUnits

                    : []

        };


        // ==================================================
        // RENDER
        // ==================================================

        return res.render(

            "update/storages/feeds-store",

            {

                ...pageData,

                title:
                    "Feed Store"

            }

        );

    } catch (error) {

        console.error(
            "viewFeedStore error:",
            error
        );


        return res
            .status(500)
            .send(

                getErrorMessage(
                    error,
                    "Unable to load the feed store."
                )

            );

    }

}


// ==========================================================
// ADMIN — ADD / RESTOCK STOCK
// ==========================================================
//
// POST /dairy/:id/feedstore/restock
//
// ADMIN ONLY.
//
// This endpoint handles:
//
//     • Adding a completely new stock item
//     • Adding to an existing stock item
//     • Quantity
//     • Unit
//     • Price/value
//     • Instructions
//     • Expected duration
//     • Additional information
//     • Images
//
// ONLY ADMIN MAY PROVIDE:
//
//     • instructions
//     • expectedDuration
//
// ==========================================================

async function restockFeedStore(
    req,
    res
) {

    const dairyId =
        getDairyId(req);


    try {

        // ==================================================
        // AUTHENTICATION
        // ==================================================

        const user =
            getUser(req);


        if (!user) {

            return res
                .status(401)
                .send(
                    "Authentication required."
                );

        }


        // ==================================================
        // ADMIN ONLY
        // ==================================================

        if (
            getUserRole(req) !==
            "admin"
        ) {

            return res
                .status(403)
                .send(
                    "Only administrators can add or restock feed or medicine."
                );

        }


        // ==================================================
        // DAIRY ID
        // ==================================================

        if (!dairyId) {

            return res
                .status(400)
                .send(
                    "Dairy ID is required."
                );

        }


        // ==================================================
        // REQUEST BODY
        // ==================================================

        const input =
            req.body &&
            typeof req.body === "object"

                ? req.body

                : {};


        const body = {

            ...input

        };


        // ==================================================
        // STOCK CATEGORY
        // ==================================================
        //
        // The form uses:
        //
        //     category
        //
        // Expected values:
        //
        //     feed
        //     medicine
        //
        // ==================================================

        const category =
            getRequiredText(
                body.category
            );


        if (!category) {

            return redirectWithError(

                res,

                dairyId,

                "Stock type is required."

            );

        }


        if (
            category !== "feed" &&
            category !== "medicine"
        ) {

            return redirectWithError(

                res,

                dairyId,

                "Invalid stock type."

            );

        }


        body.category =
            category;


        // ==================================================
        // STOCK NAME
        // ==================================================
        //
        // Feed:
        //
        //     feedName
        //
        // Medicine:
        //
        //     medicineName
        //
        // ==================================================

        let stockName;


        if (
            category === "feed"
        ) {

            stockName =
                getRequiredText(
                    body.feedName
                );


            if (!stockName) {

                return redirectWithError(

                    res,

                    dairyId,

                    "Animal feed must be selected."

                );

            }

        }


        if (
            category === "medicine"
        ) {

            stockName =
                getRequiredText(
                    body.medicineName
                );


            if (!stockName) {

                return redirectWithError(

                    res,

                    dairyId,

                    "Veterinary medicine must be selected."

                );

            }

        }


        // ==================================================
        // QUANTITY
        // ==================================================
        //
        // Admin is adding/restocking stock.
        //
        // Quantity must therefore be a real number greater
        // than zero.
        //
        // ==================================================

        const quantity =
            parseNumber(
                body.quantity
            );


        if (
            quantity === null
        ) {

            return redirectWithError(

                res,

                dairyId,

                "Quantity must be a valid number."

            );

        }


        if (
            quantity <= 0
        ) {

            return redirectWithError(

                res,

                dairyId,

                "Quantity must be greater than zero."

            );

        }


        body.quantity =
            quantity;


        // ==================================================
        // UNIT
        // ==================================================

        const unit =
            getRequiredText(
                body.unit
            );


        if (!unit) {

            return redirectWithError(

                res,

                dairyId,

                "Stock unit is required."

            );

        }


        body.unit =
            unit;


        // ==================================================
        // PRICE / VALUE
        // ==================================================
        //
        // Price is ADMIN ONLY.
        //
        // It may be omitted if the service/model allows
        // optional pricing.
        //
        // ==================================================

        if (
            body.price !== undefined &&
            body.price !== null &&
            body.price !== ""
        ) {

            const price =
                parseNumber(
                    body.price
                );


            if (
                price === null ||
                price < 0
            ) {

                return redirectWithError(

                    res,

                    dairyId,

                    "Price must be a valid non-negative number."

                );

            }


            body.price =
                price;

        }


        // ==================================================
        // INSTRUCTIONS
        // ==================================================
        //
        // ADMIN ONLY.
        //
        // This controller intentionally allows these fields
        // only through the admin add/restock endpoint.
        //
        // ==================================================

        if (
            body.instructions !== undefined &&
            body.instructions !== null
        ) {

            body.instructions =
                String(
                    body.instructions
                ).trim();

        }


        // ==================================================
        // EXPECTED DURATION
        // ==================================================
        //
        // ADMIN ONLY.
        //
        // ==================================================

        if (
            body.expectedDuration !== undefined &&
            body.expectedDuration !== null
        ) {

            body.expectedDuration =
                String(
                    body.expectedDuration
                ).trim();

        }


        // ==================================================
        // ADDITIONAL INFORMATION
        // ==================================================
        //
        // Admin may provide this.
        //
        // ==================================================

        if (
            body.message !== undefined &&
            body.message !== null
        ) {

            body.message =
                String(
                    body.message
                ).trim();

        }


        // ==================================================
        // FILES
        // ==================================================

        const files =
            getFiles(req);


        // ==================================================
        // ADD / RESTOCK
        // ==================================================

        await feedsService.addStock({

            dairyId,

            user,

            body,

            files

        });


        // ==================================================
        // SUCCESS
        // ==================================================

        return redirectWithSuccess(

            res,

            dairyId,

            "Stock added successfully."

        );

    } catch (error) {

        console.error(
            "restockFeedStore error:",
            error
        );


        return redirectWithError(

            res,

            dairyId,

            getErrorMessage(
                error,
                "Unable to add or restock stock."
            )

        );

    }

}


// ==========================================================
// UPDATE REMAINING STOCK
// ==========================================================
//
// POST /dairy/:id/feedstore/update
//
// AVAILABLE TO:
//
//     ANY AUTHENTICATED USER
//
// IMPORTANT:
//
// This operation is ONLY for reporting the quantity that
// remains in an existing stock record.
//
// It does NOT allow the user to change:
//
//     • category
//     • stock name
//     • unit
//     • price
//     • instructions
//     • expected duration
//
// The service MUST load the current stock from MongoDB and
// verify:
//
//     submitted quantity <= current database quantity
//
// ==========================================================

async function updateFeedStore(
    req,
    res
) {

    const dairyId =
        getDairyId(req);


    try {

        // ==================================================
        // AUTHENTICATION
        // ==================================================

        const user =
            getUser(req);


        if (!user) {

            return res
                .status(401)
                .send(
                    "Authentication required."
                );

        }


        // ==================================================
        // DAIRY ID
        // ==================================================

        if (!dairyId) {

            return res
                .status(400)
                .send(
                    "Dairy ID is required."
                );

        }


        // ==================================================
        // REQUEST BODY
        // ==================================================

        const input =
            req.body &&
            typeof req.body === "object"

                ? req.body

                : {};


        // ==================================================
        // STOCK ID
        // ==================================================

        const stockId =
            getRequiredText(
                input.stockId
            );


        if (!stockId) {

            return redirectWithError(

                res,

                dairyId,

                "Stock item is required."

            );

        }


        // ==================================================
        // QUANTITY REMAINING
        // ==================================================
        //
        // IMPORTANT:
        //
        // Do NOT do:
        //
        //     Number(input.quantityRemaining || 0)
        //
        // because an empty/missing field would silently become
        // zero.
        //
        // ==================================================

        const quantityRemaining =
            parseNumber(
                input.quantityRemaining
            );


        if (
            quantityRemaining === null
        ) {

            return redirectWithError(

                res,

                dairyId,

                "Quantity remaining must be a valid number."

            );

        }


        // ==================================================
        // NON-NEGATIVE
        // ==================================================

        if (
            quantityRemaining < 0
        ) {

            return redirectWithError(

                res,

                dairyId,

                "Quantity remaining cannot be negative."

            );

        }


        // ==================================================
        // UPDATE BODY
        // ==================================================
        //
        // VERY IMPORTANT:
        //
        // Only these fields are sent to the update service.
        //
        // The user cannot use this endpoint to modify other
        // stock properties.
        //
        // ==================================================

        const body = {

            stockId,

            quantityRemaining

        };


        // ==================================================
        // ADDITIONAL INFORMATION
        // ==================================================
        //
        // Any authenticated user may provide additional
        // information about the stock update.
        //
        // ==================================================

        if (
            input.message !== undefined &&
            input.message !== null
        ) {

            body.message =
                String(
                    input.message
                ).trim();

        }


        // ==================================================
        // IMPORTANT:
        //
        // DO NOT ACCEPT THESE FROM THIS OPERATION:
        //
        //     category
        //     feedName
        //     medicineName
        //     unit
        //     price
        //     instructions
        //     expectedDuration
        //
        // The stock record already owns those values.
        //
        // ==========================================================


        // ==================================================
        // FILES
        // ==================================================

        const files =
            getFiles(req);


        // ==================================================
        // UPDATE REMAINING STOCK
        // ==================================================
        //
        // The service MUST:
        //
        //     1. Load the dairy.
        //
        //     2. Locate stockId.
        //
        //     3. Read the CURRENT quantityRemaining.
        //
        //     4. Verify:
        //
        //            quantityRemaining <= currentQuantity
        //
        //     5. Save the new quantityRemaining.
        //
        //     6. Preserve the existing unit.
        //
        //     7. Preserve the existing stock name/category.
        //
        //     8. Preserve the existing price.
        //
        //     9. Preserve instructions and duration.
        //
        //    10. Create the history record.
        //
        // ==================================================

        await feedsService.updateRemainingStock({

            dairyId,

            user,

            body,

            files

        });


        // ==================================================
        // SUCCESS
        // ==================================================

        return redirectWithSuccess(

            res,

            dairyId,

            "Remaining stock updated successfully."

        );

    } catch (error) {

        console.error(
            "updateFeedStore error:",
            error
        );


        return redirectWithError(

            res,

            dairyId,

            getErrorMessage(
                error,
                "Unable to update remaining stock."
            )

        );

    }

}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    viewFeedStore,

    restockFeedStore,

    updateFeedStore

};