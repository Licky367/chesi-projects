// ==========================================================
// controllers/update/feedsController.js
// ==========================================================
//
// FEED STORE CONTROLLER
//
// Responsibilities:
//
//     • Render the dairy feed-store page
//     • Allow ADMIN to add animal feed
//     • Allow ADMIN to add veterinary medicine
//     • Allow DAIRY WORKER to update remaining stock
//     • Pass uploaded images to the service
//     • Keep financial information away from workers
//
// Routes:
//
//     GET  /dairy/feedstore/:id
//     POST /dairy/:id/feedstore/restock
//     POST /dairy/:id/feedstore/update
//
// ==========================================================


const feedsService =
    require("../../services/update/feedsService");



// ==========================================================
// HELPER
// ==========================================================

function getUserRole(req) {

    return (
        req.user &&
        req.user.role
    ) || null;

}



// ==========================================================
// GET FEED STORE
// ==========================================================
//
// GET /dairy/feedstore/:id
//
// ==========================================================

async function viewFeedStore(req, res) {

    try {

        const dairyId =
            req.params.id;

        const user =
            req.user;


        if (!user) {

            return res.status(401).send(
                "Authentication required."
            );

        }



        const data =
            await feedsService.getFeedStorePage({
                dairyId,
                user
            });



        return res.render(
            "updates/feeds-store",
            data
        );


    } catch (error) {

        console.error(
            "viewFeedStore error:",
            error
        );


        return res.status(500).send(
            "Unable to load the feed store."
        );

    }

}



// ==========================================================
// ADMIN: ADD STOCK
// ==========================================================
//
// POST /dairy/:id/feedstore/restock
//
// Only ADMIN.
//
// ==========================================================

async function restockFeedStore(req, res) {

    try {

        const dairyId =
            req.params.id;

        const user =
            req.user;


        if (!user) {

            return res.status(401).send(
                "Authentication required."
            );

        }



        // --------------------------------------------------
        // ROLE PROTECTION
        // --------------------------------------------------

        if (getUserRole(req) !== "admin") {

            return res.status(403).send(
                "Only administrators can add feed or medicine stock."
            );

        }



        // --------------------------------------------------
        // UPLOADED FILES
        // --------------------------------------------------

        const images =
            req.files || [];



        // --------------------------------------------------
        // SERVICE
        // --------------------------------------------------

        await feedsService.addStock({
            dairyId,
            user,
            body: req.body,
            files: images
        });



        // --------------------------------------------------
        // REDIRECT
        // --------------------------------------------------

        return res.redirect(
            `/dairy/feedstore/${dairyId}?success=stock-added`
        );


    } catch (error) {

        console.error(
            "restockFeedStore error:",
            error
        );


        const dairyId =
            req.params.id;


        return res.redirect(
            `/dairy/feedstore/${dairyId}?error=${encodeURIComponent(
                error.message || "Unable to add stock."
            )}`
        );

    }

}



// ==========================================================
// WORKER: UPDATE REMAINING STOCK
// ==========================================================
//
// POST /dairy/:id/feedstore/update
//
// Dairy workers can:
//
//     • Select an existing stock item
//     • Enter remaining quantity
//     • Enter unit
//     • Add information
//     • Upload images
//
// They CANNOT:
//
//     • Change price
//     • Change feedsAmount
//     • Add new stock
//     • Create financial records
//
// ==========================================================

async function updateFeedStore(req, res) {

    try {

        const dairyId =
            req.params.id;

        const user =
            req.user;


        if (!user) {

            return res.status(401).send(
                "Authentication required."
            );

        }



        // --------------------------------------------------
        // ROLE PROTECTION
        // --------------------------------------------------

        const role =
            getUserRole(req);


        if (
            role !== "dairyWorker" &&
            role !== "admin"
        ) {

            return res.status(403).send(
                "You are not authorized to update feed store stock."
            );

        }



        // --------------------------------------------------
        // FILES
        // --------------------------------------------------

        const images =
            req.files || [];



        // --------------------------------------------------
        // SERVICE
        // --------------------------------------------------

        await feedsService.updateRemainingStock({
            dairyId,
            user,
            body: req.body,
            files: images
        });



        // --------------------------------------------------
        // REDIRECT
        // --------------------------------------------------

        return res.redirect(
            `/dairy/feedstore/${dairyId}?success=stock-updated`
        );


    } catch (error) {

        console.error(
            "updateFeedStore error:",
            error
        );


        const dairyId =
            req.params.id;


        return res.redirect(
            `/dairy/feedstore/${dairyId}?error=${encodeURIComponent(
                error.message || "Unable to update remaining stock."
            )}`
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