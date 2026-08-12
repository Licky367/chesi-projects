// ==========================================================
// controllers/milkController.js
// ==========================================================

const milkService = require("../services/milkService");


// ==========================================================
// HELPERS
// ==========================================================

function getSessionUser(req) {

    if (
        req.session &&
        req.session.user
    ) {
        return req.session.user;
    }

    return null;
}


// ----------------------------------------------------------
// GET ACTIVE FARM FROM SESSION
//
// The application has used different names for the currently
// selected farm. Support them without breaking the view.
// ----------------------------------------------------------

function getActiveFarm(req) {

    const session =
        req.session || {};

    const user =
        session.user || {};


    const candidates = [

        session.currentDairy,
        session.currentFarm,

        session.activeDairy,
        session.activeFarm,

        user.currentDairy,
        user.currentFarm,

        session.dairy,
        session.farm,

        user.dairy,
        user.farm

    ];


    for (const candidate of candidates) {

        if (
            candidate &&
            typeof candidate === "object"
        ) {

            return candidate;

        }

    }


    return null;
}


// ----------------------------------------------------------
// GET ACTIVE FARM ID
// ----------------------------------------------------------

function getActiveFarmId(req) {

    const farm =
        getActiveFarm(req);


    if (!farm) {
        return "";
    }


    if (farm._id) {
        return String(farm._id);
    }


    if (farm.id) {
        return String(farm.id);
    }


    return "";
}


// ==========================================================
// GET MILK PAGE
// ==========================================================

exports.getMilkPage = async (req, res) => {

    try {

        const user =
            getSessionUser(req);


        // --------------------------------------------------
        // LOGIN
        // --------------------------------------------------

        if (!user) {

            return res.redirect("/login");

        }


        // --------------------------------------------------
        // ROLE
        // --------------------------------------------------

        if (
            user.role !== "admin" &&
            user.role !== "dairyWorker"
        ) {

            return res.status(403).render(
                "milk",
                {
                    user,
                    session: "closed",
                    currentDairy: null,
                    currentFarm: null,
                    milkDairyTables: [],
                    dairies: [],
                    error: "You are not authorized to access milk collection.",
                    success: false
                }
            );

        }


        // --------------------------------------------------
        // ACTIVE FARM
        // --------------------------------------------------

        const currentFarm =
            getActiveFarm(req);


        const activeFarmId =
            getActiveFarmId(req);


        // --------------------------------------------------
        // QUERY RESULT
        // --------------------------------------------------

        const pageData =
            await milkService.getMilkPageData({

                user,

                activeFarmId,

                currentFarm

            });


        // --------------------------------------------------
        // SUCCESS / ERROR FROM QUERY STRING
        // --------------------------------------------------

        const success =
            req.query.success === "1";


        const error =
            req.query.error
                ? String(req.query.error)
                : "";


        // --------------------------------------------------
        // RENDER
        // --------------------------------------------------

        return res.render(
            "milk",
            {

                // User expected by EJS
                user,

                // Current collection session
                session:
                    pageData.session,

                // Current farm
                currentDairy:
                    pageData.currentFarm,

                currentFarm:
                    pageData.currentFarm,

                // Main EJS structure
                milkDairyTables:
                    pageData.milkDairyTables,

                // Fallback variable used by EJS
                dairies:
                    pageData.dairies,

                // Popup
                success,

                error

            }
        );

    } catch (error) {

        console.error(
            "GET /milk error:",
            error
        );


        return res.status(500).render(
            "milk",
            {

                user:
                    getSessionUser(req),

                session:
                    "closed",

                currentDairy:
                    getActiveFarm(req),

                currentFarm:
                    getActiveFarm(req),

                milkDairyTables: [],

                dairies: [],

                success: false,

                error:
                    "Unable to load the milk collection page."

            }
        );

    }

};


// ==========================================================
// SAVE MILK RECORD
// POST /milk
// ==========================================================

exports.submitMilk = async (req, res) => {

    try {

        const user =
            getSessionUser(req);


        // --------------------------------------------------
        // LOGIN
        // --------------------------------------------------

        if (!user) {

            return res.redirect("/login");

        }


        // --------------------------------------------------
        // ROLE
        // --------------------------------------------------

        if (
            user.role !== "admin" &&
            user.role !== "dairyWorker"
        ) {

            return res.redirect(
                "/milk?error=" +
                encodeURIComponent(
                    "You are not authorized to record milk."
                )
            );

        }


        // --------------------------------------------------
        // REQUEST DATA
        // --------------------------------------------------

        const {

            dairy,
            farm,
            liters,
            remarks,
            session

        } = req.body;


        // --------------------------------------------------
        // ACTIVE FARM
        // --------------------------------------------------

        const currentFarm =
            getActiveFarm(req);


        const activeFarmId =
            getActiveFarmId(req);


        // --------------------------------------------------
        // SAVE
        // --------------------------------------------------

        await milkService.saveMilkRecord({

            dairyId:
                dairy,

            farmId:
                farm,

            liters,

            remarks,

            requestedSession:
                session,

            user,

            activeFarmId,

            currentFarm

        });


        // --------------------------------------------------
        // SUCCESS
        // --------------------------------------------------

        return res.redirect(
            "/milk?success=1"
        );

    } catch (error) {

        console.error(
            "POST /milk error:",
            error
        );


        return res.redirect(
            "/milk?error=" +
            encodeURIComponent(
                error.message ||
                "Unable to save milk record."
            )
        );

    }

};


// ==========================================================
// ADMIN EDIT MILK RECORD
// POST /milk/:recordId
// ==========================================================

exports.updateMilkRecord = async (req, res) => {

    try {

        const user =
            getSessionUser(req);


        // --------------------------------------------------
        // LOGIN
        // --------------------------------------------------

        if (!user) {

            return res.redirect("/login");

        }


        // --------------------------------------------------
        // ADMIN ONLY
        // --------------------------------------------------

        if (
            user.role !== "admin"
        ) {

            return res.redirect(
                "/milk?error=" +
                encodeURIComponent(
                    "Only an administrator can edit milk records."
                )
            );

        }


        // --------------------------------------------------
        // RECORD ID
        // --------------------------------------------------

        const recordId =
            req.params.recordId;


        // --------------------------------------------------
        // DATA
        // --------------------------------------------------

        const {

            liters,
            remarks

        } = req.body;


        // --------------------------------------------------
        // UPDATE
        // --------------------------------------------------

        await milkService.updateMilkRecord({

            recordId,

            liters,

            remarks,

            user

        });


        // --------------------------------------------------
        // SUCCESS
        // --------------------------------------------------

        return res.redirect(
            "/milk?success=1"
        );

    } catch (error) {

        console.error(
            "POST /milk/:recordId error:",
            error
        );


        return res.redirect(
            "/milk?error=" +
            encodeURIComponent(
                error.message ||
                "Unable to update milk record."
            )
        );

    }

};