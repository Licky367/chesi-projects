// ==========================================================
// controllers/milkController.js
// ==========================================================

const milkService = require("../services/milkservice");


// ==========================================================
// HELPERS
// ==========================================================

/**
 * Get the logged-in user from the session.
 *
 * The application uses req.session.user.
 */
function getSessionUser(req) {

    if (
        !req ||
        !req.session ||
        !req.session.user
    ) {

        return null;

    }

    return req.session.user;

}


/**
 * Get the user's ID safely.
 *
 * Supports both:
 *
 * req.session.user._id
 *
 * and
 *
 * req.session.user.id
 */
function getUserId(user) {

    if (!user) {
        return null;
    }

    return (
        user._id ||
        user.id ||
        null
    );

}


// ==========================================================
// GET MILK COLLECTION PAGE
// ==========================================================

exports.getMilkPage = async (req, res) => {

    try {

        const user =
            getSessionUser(req);


        if (!user) {

            return res.redirect("/login");

        }


        /*
         * The service is responsible for:
         *
         * - finding the farms available to the user
         * - finding the animals currently being milked
         * - grouping animals by farm
         * - finding existing morning/evening records
         * - preparing farm totals
         *
         * The controller does not duplicate any of that logic.
         */

        const milkData =
            await milkService.getMilkPageData({
                user,
                session: req.session.session || req.session.collectionSession
            });


        return res.render(
            "milk",
            {
                ...milkData,

                user,

                session:
                    milkData.session ||
                    req.session.session ||
                    req.session.collectionSession ||
                    "",

                error:
                    null,

                success:
                    false
            }
        );

    } catch (error) {

        console.error(
            "Milk page error:",
            error
        );


        const user =
            getSessionUser(req);


        return res.status(500).render(
            "milk",
            {
                user,

                session:
                    req.session &&
                    (
                        req.session.session ||
                        req.session.collectionSession
                    ) || "",

                milkDairyTables: [],

                error:
                    "Unable to load the milk collection page.",

                success:
                    false
            }
        );

    }

};


// ==========================================================
// SAVE MILK RECORD
// ==========================================================
//
// POST /milk
//
// Expected body:
//
// {
//     dairy: animalId,
//     session: "morning" | "evening",
//     liters: "...",
//     remarks: "..."
// }
//
// IMPORTANT:
// The controller does NOT determine the farm.
//
// The service receives the animal ID and resolves the animal's
// actual farm from the database.
//
// This prevents the browser from being trusted to choose
// another farm.
//

exports.submitMilk = async (req, res) => {

    try {

        const user =
            getSessionUser(req);


        if (!user) {

            return res.redirect("/login");

        }


        const userId =
            getUserId(user);


        if (!userId) {

            return res.status(401).send(
                "User session is invalid."
            );

        }


        const {
            dairy,
            session,
            liters,
            remarks
        } = req.body;


        /*
         * All validation, animal lookup, farm lookup,
         * permission checks, duplicate-record checks,
         * record creation and farm-total calculation
         * belong to the service.
         */

        await milkService.saveMilkRecord({

            dairyId:
                dairy,

            session,

            liters,

            remarks,

            userId,

            user
        });


        /*
         * Keep the normal browser flow simple.
         *
         * The service has already saved the record and
         * updated/recalculated the farm total.
         */

        return res.redirect(
            "/milk?success=1"
        );

    } catch (error) {

        console.error(
            "Save milk record error:",
            error
        );


        /*
         * Redirect back to the milk page with an error.
         *
         * The message is encoded because it is placed
         * inside the query string.
         */

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
// UPDATE MILK RECORD
// ==========================================================
//
// POST /milk/:recordId
//
// Used by the administrator edit modal.
//
// Expected body:
//
// {
//     liters: "...",
//     remarks: "..."
// }
//
// The service is responsible for:
//
// - verifying the record
// - determining its farm
// - determining its animal
// - checking administrator permission
// - updating the record
// - recalculating the affected farm total
//
// The controller only coordinates the request.
//

exports.updateMilkRecord = async (req, res) => {

    try {

        const user =
            getSessionUser(req);


        if (!user) {

            return res.redirect("/login");

        }


        const userId =
            getUserId(user);


        if (!userId) {

            return res.status(401).send(
                "User session is invalid."
            );

        }


        const recordId =
            req.params.recordId;


        const {
            liters,
            remarks
        } = req.body;


        if (!recordId) {

            throw new Error(
                "Milk record ID is required."
            );

        }


        await milkService.updateMilkRecord({

            recordId,

            liters,

            remarks,

            userId,

            user
        });


        return res.redirect(
            "/milk?success=1"
        );

    } catch (error) {

        console.error(
            "Update milk record error:",
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