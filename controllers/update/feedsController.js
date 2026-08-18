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
//     • Allow DAIRY WORKER to update remaining stock
//     • Allow ADMIN to update remaining stock
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
// BUILD UNIFIED FOODSTOCK HISTORY
// ==========================================================
//
// The feed-store page must display:
//
//     • Add Available Stock updates
//     • Update Remaining Stock updates
//
// The service may return these separately as:
//
//     data.updates
//     data.feedUpdates
//
// They are combined here into ONE array.
//
// IMPORTANT:
//
// The EJS receives:
//
//     updates
//
// Every document remains independent.
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


    // ======================================================
    // COMBINE BOTH SOURCES
    // ======================================================

    const combined =
        [
            ...stockUpdates,
            ...remainingUpdates
        ];


    // ======================================================
    // REMOVE DUPLICATES
    //
    // This protects against the service returning the same
    // Update document in both arrays.
    // ======================================================

    const seen =
        new Set();


    const uniqueUpdates =
        combined.filter(
            function(item) {

                if (!item) {

                    return false;

                }


                // ------------------------------------------
                // Prefer MongoDB _id
                // ------------------------------------------

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
    //
    // If createdAt exists, the newest stock event appears
    // first regardless of whether it was:
    //
    //     Add Stock
    //
    // or:
    //
    //     Update Remaining Stock
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
// VIEW FEED STORE
// ==========================================================
//
// GET /dairy/feedstore/:id
//
// The service may return:
//
//     dairy
//     user
//     updates
//     feedUpdates
//     feedTypes
//     medicineTypes
//     stockUnits
//
// IMPORTANT:
//
//     updates
//
// passed to the EJS is now a UNIFIED history containing:
//
//     1. Add Stock records
//     2. Update Remaining Stock records
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
        // BUILD UNIFIED FOODSTOCK HISTORY
        // ==================================================
        //
        // This is the important change.
        //
        // Both:
        //
        //     data.updates
        //
        // and:
        //
        //     data.feedUpdates
        //
        // are now displayed by the Foodstock Updates tab.
        //
        // The resulting array is passed as:
        //
        //     updates
        //
        // to feeds-store.ejs.
        //
        // ==================================================

        const unifiedUpdates =
            buildFoodstockUpdates(
                data
            );


        // ==================================================
        // SAFETY
        //
        // Ensure the variables expected by feeds-store.ejs
        // always exist.
        // ==================================================

        const pageData = {

            ...data,

            dairy:
                data &&
                data.dairy
                    ? data.dairy
                    : null,

            user,

            // ==================================================
            // UNIFIED FOODSTOCK HISTORY
            //
            // Contains BOTH:
            //
            //     Add Stock
            //     Update Remaining Stock
            //
            // ==================================================

            updates:
                unifiedUpdates,


            // ==================================================
            // KEEP feedUpdates AVAILABLE
            //
            // This does not break anything that may still use
            // feedUpdates elsewhere.
            // ==================================================

            feedUpdates:
                data &&
                Array.isArray(data.feedUpdates)
                    ? data.feedUpdates
                    : [],


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

            "update/feeds-store",

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
// ADMIN — RESTOCK
// ==========================================================
//
// POST /dairy/:id/feedstore/restock
//
// ADMIN ONLY.
//
// Can:
//
//     • Add animal feed
//     • Add veterinary medicine
//     • Increase existing stock
//     • Set financial value
//     • Set instructions
//     • Set expected duration
//     • Upload images
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
                    "Only administrators can add feed or medicine stock."
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
            req.body || {};


        // ==================================================
        // UPLOADED FILES
        // ==================================================

        const files =
            getFiles(req);


        // ==================================================
        // ADD STOCK
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

        return res.redirect(

            `/dairy/feedstore/${dairyId}` +
            "?success=stock-added"

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
// Worker may submit:
//
//     stockId
//     quantityRemaining
//     unit
//     message
//     images
//
// Worker must NOT be allowed to modify:
//
//     price
//     feedsAmount
//     stock name
//     category
//     initial quantity
//     financial records
//
// The service is responsible for enforcing those rules.
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
            req.body || {};


        // ==================================================
        // UPLOADED FILES
        // ==================================================

        const files =
            getFiles(req);


        // ==================================================
        // UPDATE REMAINING STOCK
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

        return res.redirect(

            `/dairy/feedstore/${dairyId}` +
            "?success=stock-updated"

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