// ==========================================================
// controllers/update/pageController.js
// DAIRY UPDATE PAGE CONTROLLER
// ==========================================================

const updateService =
    require("../../services/update");

const Dairy =
    require("../../models/dairy");


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


        if (!id) {

            return res
                .status(400)
                .send(
                    "Dairy ID is required."
                );

        }


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


        if (
            !data ||
            !data.dairy
        ) {

            return res
                .status(404)
                .send(
                    "Dairy Farm not found."
                );

        }


        // ==================================================
        // GET ITEM LINKS
        // ==================================================

        const resolvedItemLinks =
            await updateService.getItemLinks(
                id
            );


        const itemLinks =
            Array.isArray(
                resolvedItemLinks
            )
                ? resolvedItemLinks
                : [];


        // ==================================================
        // BOOLEAN DATA
        // ==================================================

        let booleanAnimals = [];

        let booleanFields = [];


        if (
            typeof updateService.getBooleanData ===
            "function"
        ) {

            const booleanData =
                await updateService.getBooleanData();


            booleanAnimals =
                Array.isArray(
                    booleanData &&
                    booleanData.animals
                )
                    ? booleanData.animals
                    : [];


            booleanFields =
                Array.isArray(
                    booleanData &&
                    booleanData.fields
                )
                    ? booleanData.fields
                    : [];

        }


        // ==================================================
        // CURRENT PAGE MUST BE A DAIRY FARM
        // ==================================================

        const isDairyFarm =
            data.dairy.code !== null &&

            data.dairy.code !== undefined &&

            Number(
                data.dairy.code
            ) < 0;


        // ==================================================
        // MEDICAL ANIMALS
        // ==================================================
        //
        // Animals:
        //
        //     code > 0
        //
        // AND:
        //
        //     medicalAttention.isMarked === false
        //
        // AND:
        //
        //     animal belongs to THIS Dairy Farm.
        //
        // IMPORTANT:
        //
        // We do NOT simply retrieve every positive-code
        // Dairy record. Ownership is restricted to the
        // current Dairy Farm.
        //
        // ==================================================

        let medicalAnimals = [];


        if (isDairyFarm) {

            medicalAnimals =
                await Dairy.find({

                    // --------------------------------------
                    // ANIMAL
                    // --------------------------------------

                    code: {
                        $gt: 0
                    },


                    // --------------------------------------
                    // MEDICAL ATTENTION NOT MARKED
                    // --------------------------------------

                    "medicalAttention.isMarked": false,


                    // --------------------------------------
                    // FARM OWNERSHIP
                    // --------------------------------------
                    //
                    // Adjust this field ONLY if your Dairy
                    // schema uses a different ownership field.
                    //
                    // The current farm must be the owner.
                    //
                    dairyFarm: data.dairy._id

                })

                .lean();

        }


        // ==================================================
        // SAFETY NORMALIZATION
        // ==================================================

        medicalAnimals =
            Array.isArray(
                medicalAnimals
            )
                ? medicalAnimals
                : [];


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

                title:
                    "Dairy Profile",


                dairy:
                    data.dairy,


                feed:
                    data.feed || [],


                weeklyFeed:
                    data.weeklyFeeds || null,


                commentCount:
                    data.commentCount || 0,


                assetDairies:
                    data.assetDairies || [],


                assignedFarms:
                    data.assignedFarms || [],


                animalFeeds:
                    data.animalFeeds || [],


                itemLinks:
                    itemLinks,


                booleanAnimals:
                    booleanAnimals,


                booleanFields:
                    booleanFields,


                // ==========================================
                // MEDICAL ANIMAL COMPOSER DATA
                // ==========================================

                medicalAnimals:
                    medicalAnimals,


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
// VIEW GENERAL FEED
// ==========================================================

exports.viewGeneral =
async (req, res) => {

    try {

        const {
            id
        } = req.params;


        if (!id) {

            return res
                .status(400)
                .send(
                    "Dairy ID is required."
                );

        }


        const sessionUser =
            req.session.user || null;


        const userId =
            sessionUser
                ? sessionUser._id
                : null;


        const data =
            await updateService.getDairyPage(
                id,
                userId
            );


        if (
            !data ||
            !data.dairy
        ) {

            return res
                .status(404)
                .send(
                    "Dairy Farm not found."
                );

        }


        const isDairyFarm =
            data.dairy.code !== null &&

            data.dairy.code !== undefined &&

            Number(
                data.dairy.code
            ) < 0;


        if (!isDairyFarm) {

            return res
                .status(400)
                .send(
                    "General feed is only available for a Dairy Farm."
                );

        }


        return res.render(
            "updateGeneral",
            {

                title:
                    "General Updates",

                dairy:
                    data.dairy,

                feed:
                    Array.isArray(
                        data.feed
                    )
                        ? data.feed
                        : [],

                user:
                    sessionUser

            }
        );

    } catch (err) {

        console.error(
            "VIEW GENERAL FEED ERROR:",
            err
        );


        return res
            .status(500)
            .send(
                "Failed to load general dairy feed."
            );

    }

};


// ==========================================================
// TOGGLE MILKING STATUS
// ==========================================================

exports.toggleMilking =
async (req, res) => {

    try {

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


        const dairy =
            await updateService.toggleMilking(
                dairyId
            );


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
// ==========================================================

exports.switchDairy =
async (req, res) => {

    try {

        if (
            !req.session.user
        ) {

            return res
                .status(401)
                .send(
                    "Unauthorized"
                );

        }


        const user =
            req.session.user;


        if (
            user.role !== "dairyWorker"
        ) {

            return res
                .status(403)
                .send(
                    "Only dairy workers can switch Dairy Farms."
                );

        }


        const farmId =
            req.params.id;


        if (!farmId) {

            return res
                .status(400)
                .send(
                    "Dairy Farm ID is required."
                );

        }


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