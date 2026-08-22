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

        const {
            id
        } = req.params;


        // ==================================================
        // LOGGED-IN USER
        // ==================================================

        const sessionUser =
            req.session.user || null;


        const userId =
            sessionUser
                ? sessionUser._id
                : null;


        // ==================================================
        // GET COMPLETE DAIRY PAGE DATA
        // ==================================================

        const data =
            await updateService.getDairyPage(
                id,
                userId
            );


        // ==================================================
        // DETERMINE PAGE FROM CODE
        //
        // NEGATIVE CODE:
        //
        //     Dairy Farm
        //     → update.ejs
        //
        // POSITIVE CODE:
        //
        //     Animal
        //     → dairySet.ejs
        //
        // NULL / UNDEFINED:
        //
        //     Structure / Machine / Tool
        //     → dairySet.ejs
        //
        // ==================================================

        const isDairyFarm =
            data.dairy &&

            data.dairy.code !== null &&

            data.dairy.code !== undefined &&

            Number(
                data.dairy.code
            ) < 0;


        // ==================================================
        // SELECT VIEW
        // ==================================================

        const view =
            isDairyFarm
                ? "update"
                : "dairySet";


        // ==================================================
        // RENDER PAGE
        // ==================================================

        return res.render(
            view,
            {

                // ------------------------------------------
                // PAGE TITLE
                // ------------------------------------------

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
                // CURRENT FARM ASSETS
                //
                // These are the animals, structures,
                // machines and tools belonging to the
                // currently viewed farm.
                // ------------------------------------------

                assetDairies:
                    data.assetDairies || [],


                // ------------------------------------------
                // ASSIGNED FARMS
                //
                // These are the Dairy Farms assigned to
                // the logged-in dairyWorker.
                //
                // Used by assetBar.ejs for farm switching.
                // ------------------------------------------

                assignedFarms:
                    data.assignedFarms || [],


                // ------------------------------------------
                // AGROSTORE INVENTORY
                //
                // Only populated when the current Dairy
                // record is an AgroStore.
                //
                // AgroStore:
                //
                //     roomNumber < 0
                //
                // Animal feeds:
                //
                //     Dairy.dwellNumber ===
                //     AgroStore.roomNumber
                //
                // This is INVENTORY, not the normal
                // Update feed.
                // ------------------------------------------

                animalFeeds:
                    data.animalFeeds || [],


                // ------------------------------------------
                // LOGGED-IN USER
                // ------------------------------------------

                user:
                    sessionUser

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
// TOGGLE MILKING STATUS
//
// POST:
//
//     /dairy/:id/toggle-milking
//
// The controller delegates the actual database operation
// to:
//
//     updateService.toggleMilking()
//
// This controller does NOT access the Dairy model directly.
//
// ==========================================================

exports.toggleMilking =
async (req, res) => {

    try {

        // ==================================================
        // AUTHENTICATION
        // ==================================================

        if (
            !req.session.user
        ) {

            return res
                .status(401)
                .json({

                    success: false,

                    message:
                        "Unauthorized"

                });

        }


        // ==================================================
        // DAIRY ID
        // ==================================================

        const dairyId =
            req.params.id;


        if (!dairyId) {

            return res
                .status(400)
                .json({

                    success: false,

                    message:
                        "Dairy ID is required."

                });

        }


        // ==================================================
        // TOGGLE THROUGH SERVICE
        // ==================================================

        const dairy =
            await updateService.toggleMilking(
                dairyId
            );


        // ==================================================
        // SUCCESS RESPONSE
        // ==================================================

        return res
            .status(200)
            .json({

                success: true,

                isMilking:
                    dairy.isMilking

            });

    } catch (err) {

        console.error(
            "TOGGLE MILKING ERROR:",
            err
        );


        // ==================================================
        // NOT FOUND
        // ==================================================

        if (
            err.message ===
            "Dairy asset not found."
        ) {

            return res
                .status(404)
                .json({

                    success: false,

                    message:
                        err.message

                });

        }


        // ==================================================
        // BAD REQUEST
        // ==================================================

        if (
            err.message ===
            "Dairy ID is required."
        ) {

            return res
                .status(400)
                .json({

                    success: false,

                    message:
                        err.message

                });

        }


        // ==================================================
        // SERVER ERROR
        // ==================================================

        return res
            .status(500)
            .json({

                success: false,

                message:
                    "Failed to toggle milking status."

            });

    }

};


// ==========================================================
// SWITCH DAIRY FARM
//
// GET:
//
//     /dairy/:id/switch
//
// The requested farm must belong to the logged-in
// dairyWorker.
//
// ==========================================================

exports.switchDairy =
async (req, res) => {

    try {

        // ==================================================
        // AUTHENTICATION
        // ==================================================

        if (
            !req.session.user
        ) {

            return res
                .status(401)
                .send(
                    "Unauthorized"
                );

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
        // VERIFY ASSIGNED FARM
        // ==================================================

        const farm =
            await updateService
                .getAssignedFarmForUser(
                    user._id,
                    farmId
                );


        // ==================================================
        // FARM NOT ASSIGNED
        // ==================================================

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
        // There is no special farm URL.
        //
        // The selected farm simply becomes the farm
        // currently being viewed:
        //
        //     /dairy/:id
        //
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