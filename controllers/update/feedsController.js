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
//     • Allow ADMIN to update/restock existing stock
//     • Allow DAIRY WORKER to update remaining stock
//     • Prevent workers from changing stock units
//     • Pass uploaded images to the service
//     • Keep financial information away from workers
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

function getUser(req) {

    return (
        req &&
        req.user
    ) || null;

}


function getUserRole(req) {

    const user =
        getUser(req);

    return (
        user &&
        user.role
    ) || null;

}


function getDairyId(req) {

    return (
        req &&
        req.params &&
        req.params.id
    ) || null;

}


function getFiles(req) {

    if (
        req &&
        Array.isArray(req.files)
    ) {

        return req.files;

    }

    return [];

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
        error &&
        error.message

            ? error.message

            : "Unable to process feed-store request.";


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
// This is important for the new clickable-stock workflow.
//
// The EJS needs the actual current stock values from the DB:
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
// The controller does not manufacture stock quantities.
//
// It simply passes through what the service loaded from
// MongoDB.
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

                return stock;

            }


            return stock;

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
        // CURRENT STOCK
        //
        // This is the REAL DB inventory.
        //
        // The EJS uses this to:
        //
        //     • display current remainder
        //     • prefill the update form
        //     • identify the selected stock
        //     • enforce the correct unit display
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
            // KEEP ORIGINAL HISTORY AVAILABLE
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
        // DAIRY MUST EXIST
        // ==================================================

        if (!pageData.dairy) {

            return res
                .status(404)
                .send(
                    "Dairy profile not found."
                );

        }


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

                error &&
                error.message

                    ? error.message

                    : "Unable to load the feed store."

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
//     • Changing quantity
//     • Changing unit
//     • Price/value
//     • Instructions
//     • Expected duration
//     • Images
//
// The service decides whether this is:
//
//     NEW STOCK
//
// or:
//
//     EXISTING STOCK
//
// based on the supplied stockId.
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

        const body =
            {
                ...(req.body || {})
            };


        // ==================================================
        // FILES
        // ==================================================

        const files =
            getFiles(req);


        // ==================================================
        // ADMIN CAN EDIT UNIT
        // ==================================================
        //
        // Therefore unit is deliberately retained.
        //
        // The service must validate that the unit is valid.
        //
        // ==================================================


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
            "stock-added"
        );

    } catch (error) {

        console.error(
            "restockFeedStore error:",
            error
        );


        return redirectWithError(
            res,
            dairyId,
            error
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
//     dairyWorker
//     admin
//
// NEW WORKFLOW:
//
//     User clicks an available stock item.
//
//     The EJS opens the update section and pre-fills:
//
//         stockId
//         current quantity
//         current unit
//
//     Then the user submits the update.
//
// ADMIN:
//
//     • Can change quantity
//     • Can change unit
//     • Can add information
//     • Can upload images
//
// DAIRY WORKER:
//
//     • Can change remaining quantity
//     • Cannot change unit
//     • Cannot increase quantity above the DB quantity
//     • Can add information
//     • Can upload images
//
// IMPORTANT:
//
// The worker restriction is enforced here AND must also be
// enforced inside the service.
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
        // ROLE
        // ==================================================

        const role =
            getUserRole(req);


        if (
            role !== "dairyWorker" &&
            role !== "admin"
        ) {

            return res
                .status(403)
                .send(
                    "You are not authorized to update feed-store stock."
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

        const body =
            {
                ...(req.body || {})
            };


        // ==================================================
        // STOCK ID REQUIRED
        // ==================================================

        if (
            !body.stockId
        ) {

            return res
                .status(400)
                .send(
                    "Stock item is required."
                );

        }


        // ==================================================
        // QUANTITY REQUIRED
        // ==================================================

        if (
            body.quantityRemaining === undefined ||
            body.quantityRemaining === null ||
            body.quantityRemaining === ""
        ) {

            return res
                .status(400)
                .send(
                    "Quantity remaining is required."
                );

        }


        // ==================================================
        // NORMALIZE QUANTITY
        // ==================================================

        const submittedQuantity =
            Number(
                body.quantityRemaining
            );


        if (
            !Number.isFinite(
                submittedQuantity
            ) ||
            submittedQuantity < 0
        ) {

            return res
                .status(400)
                .send(
                    "Quantity remaining must be a valid non-negative number."
                );

        }


        body.quantityRemaining =
            submittedQuantity;


        // ==================================================
        // WORKER RESTRICTION
        // ==================================================
        //
        // A worker must NOT be allowed to submit a new unit.
        //
        // The current unit belongs to the stock record in the
        // database and is therefore controlled by the admin.
        //
        // ==================================================

        if (
            role === "dairyWorker"
        ) {

            delete body.unit;

        }


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
        //     1. Load the stock from MongoDB.
        //     2. Read its current quantityRemaining.
        //     3. If worker:
        //            submitted <= current
        //     4. Preserve existing unit.
        //     5. If admin:
        //            permit unit change.
        //     6. Save the stock.
        //     7. Create the history Update document.
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
            "stock-updated"
        );

    } catch (error) {

        console.error(
            "updateFeedStore error:",
            error
        );


        return redirectWithError(
            res,
            dairyId,
            error
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