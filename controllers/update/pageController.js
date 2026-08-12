// ==========================================================
// controllers/update/pageController.js
// ==========================================================

const updateService =
    require("../../services/update");


// ==========================================================
// VIEW DAIRY PROFILE PAGE
// ==========================================================

exports.viewPage =
async (req, res) => {

    try {

        const { id } =
            req.params;


        // ==================================================
        // GET COMPLETE DAIRY PAGE DATA
        // ==================================================

        const data =
            await updateService.getDairyPage(id);


        // ==================================================
        // DETERMINE WHETHER THIS IS A DAIRY FARM
        //
        // code < 0
        //     = Dairy Farm
        //
        // code > 0
        //     = Animal
        //
        // code === null / undefined
        //     = Structure / Machine / Tool
        // ==================================================

        const isDairyFarm =
            data.dairy &&
            data.dairy.code !== null &&
            data.dairy.code !== undefined &&
            Number(data.dairy.code) < 0;


        // ==================================================
        // SELECT VIEW
        // ==================================================

        const view =
            isDairyFarm
                ? "update"
                : "dairySet";


        // ==================================================
        // RENDER
        // ==================================================

        return res.render(
            view,
            {

                title:
                    "Dairy Profile",


                // ------------------------------------------
                // CURRENT DAIRY / ASSET
                // ------------------------------------------

                dairy:
                    data.dairy,


                // ------------------------------------------
                // FEED
                // ------------------------------------------

                feed:
                    data.feed || [],


                // ------------------------------------------
                // WEEKLY MILK FEED
                // ------------------------------------------

                weeklyFeed:
                    data.weeklyFeeds || null,


                // ------------------------------------------
                // COMMENT COUNT
                // ------------------------------------------

                commentCount:
                    data.commentCount || 0,


                // ------------------------------------------
                // ASSETS BELONGING TO CURRENT FARM
                // ------------------------------------------

                assetDairies:
                    data.assetDairies || [],


                // ------------------------------------------
                // LOGGED-IN USER
                // ------------------------------------------

                user:
                    req.session.user || null

            }
        );

    } catch (err) {

        console.error(
            "VIEW PAGE ERROR:",
            err
        );


        return res
            .status(500)
            .send(
                "Failed to load dairy profile"
            );

    }

};


// ==========================================================
// SWITCH DAIRY FARM
//
// GET:
//
// /dairy/:id/switch
//
// Only a dairyWorker can use this.
// The farm must exist in that worker's assignedFarm array.
//
// Database/assignment verification is delegated to
// pageService.js.
// ==========================================================

exports.switchDairy =
async (req, res) => {

    try {

        // ==================================================
        // AUTHENTICATION
        // ==================================================

        if (!req.session.user) {

            return res
                .status(401)
                .send("Unauthorized");

        }


        // ==================================================
        // USER
        // ==================================================

        const user =
            req.session.user;


        // ==================================================
        // ROLE CHECK
        // ==================================================

        if (
            user.role !== "dairyWorker"
        ) {

            return res
                .status(403)
                .send(
                    "Only dairy workers can switch Dairy Farms."
                );

        }


        // ==================================================
        // FARM ID
        // ==================================================

        const farmId =
            req.params.id;


        if (!farmId) {

            return res
                .status(400)
                .send(
                    "Dairy Farm ID is required."
                );

        }


        // ==================================================
        // VERIFY ASSIGNMENT
        //
        // pageService performs the actual database
        // verification.
        // ==================================================

        const farm =
            await updateService
                .getAssignedFarmForUser(
                    user._id,
                    farmId
                );


        if (!farm) {

            return res
                .status(403)
                .send(
                    "This Dairy Farm is not assigned to your account."
                );

        }


        // ==================================================
        // SWITCH
        //
        // The selected farm becomes the page currently
        // being viewed.
        // ==================================================

        return res.redirect(
            `/dairy/${farm._id}`
        );

    } catch (err) {

        console.error(
            "SWITCH DAIRY ERROR:",
            err
        );


        return res
            .status(500)
            .send(
                "Failed to switch Dairy Farm."
            );

    }

};