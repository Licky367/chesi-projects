// ==========================================================
// controllers/update/pageController.js
// ==========================================================

const updateService =
    require("../../services/update");


// ==========================================================
// VIEW DAIRY PROFILE PAGE
// ==========================================================

exports.viewPage = async (req, res) => {

    try {

        const { id } = req.params;


        // ==================================================
        // GET COMPLETE DAIRY PAGE DATA
        // ==================================================

        const data =
            await updateService.getDairyPage(id);


        // ==================================================
        // DETERMINE PAGE FROM CODE
        //
        // NEGATIVE CODE:
        //     Dairy Farm
        //     → update.ejs
        //
        // POSITIVE CODE:
        //     Animal
        //     → dairySet.ejs
        //
        // NULL / UNDEFINED CODE:
        //     Structure / Facility
        //     → dairySet.ejs
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

        return res.render(view, {

            title:
                "Dairy Profile",


            // =================================================
            // CURRENT DAIRY
            // =================================================

            dairy:
                data.dairy,


            // =================================================
            // FEED
            // =================================================

            feed:
                data.feed || [],


            // =================================================
            // WEEKLY MILK FEEDS
            // =================================================

            weeklyFeed:
                data.weeklyFeeds || null,


            // =================================================
            // COMMENT COUNT
            // =================================================

            commentCount:
                data.commentCount || 0,


            // =================================================
            // ASSETS BELONGING TO CURRENT FARM
            //
            // These are supplied to assetBar.ejs through
            // update.ejs.
            // =================================================

            assetDairies:
                data.assetDairies || [],


            // =================================================
            // LOGGED-IN USER
            // =================================================

            user:
                req.session.user || null

        });

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
// GET ASSIGNED FARMS
//
// Used by assetBar.ejs when the dairy worker opens the
// farm-switcher.
//
// GET:
//     /dairy/assigned-farms
//
// Returns only farms assigned to the logged-in dairy worker.
// ==========================================================

exports.getAssignedFarms = async (req, res) => {

    try {

        // ==================================================
        // AUTHENTICATION
        // ==================================================

        if (!req.session.user) {

            return res.status(401).json({

                success: false,

                message:
                    "Unauthorized"

            });

        }


        // ==================================================
        // ONLY DAIRY WORKERS
        // ==================================================

        if (
            req.session.user.role !==
            "dairyWorker"
        ) {

            return res.status(403).json({

                success: false,

                message:
                    "Only dairy workers can access assigned farms."

            });

        }


        // ==================================================
        // GET FARMS FROM SERVICE
        // ==================================================

        const farms =
            await farmService.getAssignedFarms(
                req.session.user._id
            );


        // ==================================================
        // RESPONSE
        // ==================================================

        return res.json({

            success: true,

            farms

        });

    } catch (err) {

        console.error(
            "GET ASSIGNED FARMS ERROR:",
            err
        );

        return res.status(500).json({

            success: false,

            message:
                err.message ||
                "Failed to load assigned farms."

        });

    }

};


// ==========================================================
// SWITCH DAIRY FARM
//
// Used when a dairy worker taps one of their assigned farms.
//
// GET:
//     /dairy/:id/switch
//
// The farm MUST belong to the logged-in dairy worker.
// ==========================================================

exports.switchDairy = async (req, res) => {

    try {

        // ==================================================
        // AUTHENTICATION
        // ==================================================

        if (!req.session.user) {

            return res.status(401).send(
                "Unauthorized"
            );

        }


        // ==================================================
        // ROLE
        // ==================================================

        if (
            req.session.user.role !==
            "dairyWorker"
        ) {

            return res.status(403).send(
                "Only dairy workers can switch Dairy Farms."
            );

        }


        // ==================================================
        // FARM ID
        // ==================================================

        const farmId =
            req.params.id;


        if (!farmId) {

            return res.status(400).send(
                "Farm ID is required."
            );

        }


        // ==================================================
        // VERIFY ASSIGNMENT
        // ==================================================

        const farm =
            await farmService.getAssignedFarm(
                req.session.user._id,
                farmId
            );


        if (!farm) {

            return res.status(403).send(
                "This Dairy Farm is not assigned to your account."
            );

        }


        // ==================================================
        // REDIRECT TO SELECTED FARM
        // ==================================================

        return res.redirect(
            `/dairy/${farm._id}`
        );

    } catch (err) {

        console.error(
            "SWITCH DAIRY ERROR:",
            err
        );

        return res.status(500).send(
            err.message ||
            "Failed to switch Dairy Farm."
        );

    }

};