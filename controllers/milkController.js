// ==========================================================
// controllers/milkController.js
// ==========================================================

const milkService = require("../services/milkService");


// ==========================================================
// GET MILK COLLECTION PAGE
// ==========================================================

exports.getMilkPage = async (req, res) => {

    try {

        const user =
            req.session && req.session.user
                ? req.session.user
                : null;


        if (!user) {

            return res.redirect("/login");

        }


        const pageData =
            await milkService.getMilkCollectionPageData(
                user
            );


        return res.render(
            "milk",
            {
                ...pageData,

                user,

                session:
                    pageData.session,

                currentSession:
                    pageData.session,

                currentFarm:
                    pageData.currentFarm,

                currentDairy:
                    pageData.currentFarm,

                milkDairyTables:
                    pageData.milkDairyTables,

                dairies:
                    pageData.dairies,

                success:
                    req.query.success === "1",

                error:
                    req.query.error || ""
            }
        );

    }

    catch (error) {

        console.error(
            "GET /milk error:",
            error
        );


        return res.status(500).render(
            "milk",
            {
                user:
                    req.session &&
                    req.session.user
                        ? req.session.user
                        : null,

                session: "closed",

                currentSession: "closed",

                currentFarm: null,

                currentDairy: null,

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
// ==========================================================

exports.submitMilk = async (req, res) => {

    try {

        const user =
            req.session && req.session.user
                ? req.session.user
                : null;


        if (!user) {

            return res.redirect("/login");

        }


        const {
            dairy,
            farm,
            session,
            liters,
            remarks
        } = req.body;


        const result =
            await milkService.saveMilkRecord({
                dairyId: dairy,
                farmId: farm,
                session,
                liters,
                remarks,
                user
            });


        return res.redirect(
            "/milk?success=1"
        );

    }

    catch (error) {

        console.error(
            "POST /milk error:",
            error
        );


        const message =
            error && error.message
                ? error.message
                : "Unable to save milk record.";


        return res.redirect(
            "/milk?error=" +
            encodeURIComponent(message)
        );

    }

};


// ==========================================================
// EDIT MILK RECORD
// ADMIN ONLY
// ==========================================================

exports.updateMilkRecord = async (req, res) => {

    try {

        const user =
            req.session && req.session.user
                ? req.session.user
                : null;


        if (!user) {

            return res.redirect("/login");

        }


        if (user.role !== "admin") {

            return res.status(403).send(
                "Only administrators can edit milk records."
            );

        }


        const recordId =
            req.params.recordId;


        const {
            liters,
            remarks
        } = req.body;


        await milkService.updateMilkRecord(
            recordId,
            {
                liters,
                remarks
            },
            user
        );


        return res.redirect(
            "/milk?success=1"
        );

    }

    catch (error) {

        console.error(
            "POST /milk/:recordId error:",
            error
        );


        const message =
            error && error.message
                ? error.message
                : "Unable to update milk record.";


        return res.redirect(
            "/milk?error=" +
            encodeURIComponent(message)
        );

    }

};