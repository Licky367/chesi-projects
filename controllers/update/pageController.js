// ==========================================================
// controllers/update/pageController.js
// DAIRY UPDATE PAGE CONTROLLER
// ==========================================================
//
// PURPOSE
// ----------------------------------------------------------
//
// Loads the complete Dairy update page and passes all
// required variables to the appropriate EJS view.
//
// VARIABLE CONTRACT
// ----------------------------------------------------------
//
// The animal-feed item-link component uses:
//
//     itemLinks
//
// `itemLinks` is ALWAYS passed to the view as an ARRAY.
//
// This matches:
//
//     views/update/storage/itemLink.ejs
//
// ==========================================================


const updateService =
    require("../../services/update");


// ==========================================================
// VIEW DAIRY PROFILE PAGE
// ==========================================================

exports.viewPage =
async (req, res) => {

    try {

        // ==================================================
        // DAIRY ID
        // ==================================================

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
        // GET ITEM LINKS
        // ==================================================
        //
        // The item-link service resolves the animal-feed
        // items belonging to the current Dairy Farm.
        //
        // The result is passed to the view using the SAME
        // variable name used by itemLink.ejs:
        //
        //     itemLinks
        //
        // ==================================================

        const resolvedItemLinks =
            await updateService.getItemLinks(
                id
            );


        // ==================================================
        // SAFE ITEM-LINK ARRAY
        // ==================================================
        //
        // Never allow itemLinks to become undefined.
        //
        // itemLink.ejs expects an array and performs:
        //
        //     itemLinks.forEach(...)
        //
        // ==================================================

        const itemLinks =
            Array.isArray(resolvedItemLinks)
                ? resolvedItemLinks
                : [];


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
                // currently viewed Dairy Farm.
                // ------------------------------------------

                assetDairies:
                    data.assetDairies || [],


                // ------------------------------------------
                // ASSIGNED FARMS
                //
                // Used by the farm-switching components.
                // ------------------------------------------

                assignedFarms:
                    data.assignedFarms || [],


                // ------------------------------------------
                // AGROSTORE INVENTORY
                //
                // Populated when the current Dairy record
                // is an AgroStore.
                // ------------------------------------------

                animalFeeds:
                    data.animalFeeds || [],


                // ------------------------------------------
                // ANIMAL FEED ITEM LINKS
                //
                // IMPORTANT:
                //
                // The view receives:
                //
                //     itemLinks
                //
                // This is the SAME variable name expected
                // by:
                //
                //     update/storage/itemLink.ejs
                //
                // It is ALWAYS an array.
                // ------------------------------------------

                itemLinks:
                    itemLinks,


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
// The actual database operation is handled by:
//
//     updateService.toggleMilking()
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
        // The selected farm becomes the farm currently
        // being viewed.
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