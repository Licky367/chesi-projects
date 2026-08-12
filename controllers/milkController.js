// ==========================================================
// controllers/milkController.js
// ==========================================================

const milkService = require("../services/milkService");


// ==========================================================
// GET MILK COLLECTION PAGE
// ==========================================================

exports.getMilkPage = async (req, res) => {

    try {

        const sessionUser =
            req.session && req.session.user
                ? req.session.user
                : null;


        if (!sessionUser) {
            return res.redirect("/login");
        }


        /*
         * The service is responsible for retrieving:
         *
         * - dairy farms
         * - milking animals
         * - existing morning records
         * - existing evening records
         *
         * The view expects:
         *
         * milkDairyTables = [
         *     {
         *         farm,
         *         animals
         *     }
         * ]
         */

        const milkDairyTables =
            await milkService.getMilkCollectionData(
                sessionUser
            );


        /*
         * Determine the active farm.
         *
         * Admin:
         *   sees all farms.
         *
         * Dairy worker:
         *   sees their assigned/current farm.
         */

        let currentDairy = null;


        if (
            sessionUser.currentDairy
        ) {

            currentDairy =
                sessionUser.currentDairy;

        }


        else if (
            sessionUser.dairy
        ) {

            currentDairy =
                sessionUser.dairy;

        }


        else if (
            sessionUser.farm
        ) {

            currentDairy =
                sessionUser.farm;

        }


        /*
         * Some applications store the farm as a populated
         * object while others store only its ID.
         *
         * If the service has already supplied the worker's
         * farm, use that information.
         */

        if (
            !currentDairy &&
            sessionUser.role === "dairyWorker" &&
            Array.isArray(milkDairyTables) &&
            milkDairyTables.length === 1
        ) {

            currentDairy =
                milkDairyTables[0].farm || null;

        }


        /*
         * Session comes from the application/session logic.
         *
         * Expected values:
         *
         * morning
         * evening
         * closed
         */

        const currentSession =
            await milkService.getCurrentCollectionSession();


        return res.render(
            "milk",
            {

                /*
                 * User/session information
                 */

                user: sessionUser,

                session: currentSession,


                /*
                 * Farm information
                 */

                currentDairy: currentDairy,


                /*
                 * Main milk collection data
                 */

                milkDairyTables: milkDairyTables || [],


                /*
                 * Compatibility with older versions
                 */

                dairies: [],


                /*
                 * Page messages
                 */

                error:
                    req.query.error || "",

                success:
                    req.query.success === "1"

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

                session:
                    "closed",

                currentDairy:
                    null,

                milkDairyTables: [],

                dairies: [],

                error:
                    "Unable to load the milk collection page.",

                success:
                    false

            }
        );

    }

};



// ==========================================================
// CREATE MILK RECORD
// ==========================================================

exports.submitMilk = async (req, res) => {

    try {

        const sessionUser =
            req.session && req.session.user
                ? req.session.user
                : null;


        if (!sessionUser) {
            return res.redirect("/login");
        }


        /*
         * Data submitted by the individual row form.
         */

        const {
            dairy,
            farm,
            session,
            liters,
            remarks
        } = req.body;


        /*
         * Basic validation.
         */

        if (!dairy) {

            return res.redirect(
                "/milk?error=" +
                encodeURIComponent(
                    "The animal could not be identified."
                )
            );

        }


        if (
            liters === undefined ||
            liters === null ||
            String(liters).trim() === ""
        ) {

            return res.redirect(
                "/milk?error=" +
                encodeURIComponent(
                    "Please enter the amount of milk collected."
                )
            );

        }


        const numericLiters =
            Number(liters);


        if (
            !Number.isFinite(numericLiters) ||
            numericLiters < 0
        ) {

            return res.redirect(
                "/milk?error=" +
                encodeURIComponent(
                    "Please enter a valid milk quantity."
                )
            );

        }


        /*
         * Determine the collection session.
         *
         * Do not blindly trust the browser.
         * The service will perform the final permission
         * and session validation.
         */

        const collectionSession =
            session === "evening"
                ? "evening"
                : "morning";


        /*
         * Save the record through the service.
         *
         * The service handles:
         *
         * - animal validation
         * - farm validation
         * - worker permissions
         * - session restrictions
         * - duplicate prevention
         * - database creation
         * - recordedBy
         * - dates/day/month
         */

        await milkService.saveMilkRecord({

            dairyId: dairy,

            farmId: farm,

            session: collectionSession,

            liters: numericLiters,

            remarks:
                remarks
                    ? String(remarks).trim()
                    : "",

            userId:
                sessionUser._id,

            userRole:
                sessionUser.role

        });


        /*
         * Return to the milk collection page.
         */

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
// ADMIN EDIT MILK RECORD
// ==========================================================

exports.updateMilkRecord = async (req, res) => {

    try {

        const sessionUser =
            req.session && req.session.user
                ? req.session.user
                : null;


        if (!sessionUser) {
            return res.redirect("/login");
        }


        /*
         * Editing existing milk records is strictly
         * restricted to administrators.
         */

        if (
            sessionUser.role !== "admin"
        ) {

            return res.redirect(
                "/milk?error=" +
                encodeURIComponent(
                    "Only an administrator can edit milk records."
                )
            );

        }


        const recordId =
            req.params.recordId;


        if (!recordId) {

            return res.redirect(
                "/milk?error=" +
                encodeURIComponent(
                    "Milk record ID is missing."
                )
            );

        }


        const {
            liters,
            remarks
        } = req.body;


        /*
         * Validate litres.
         */

        if (
            liters === undefined ||
            liters === null ||
            String(liters).trim() === ""
        ) {

            return res.redirect(
                "/milk?error=" +
                encodeURIComponent(
                    "Please enter the milk quantity."
                )
            );

        }


        const numericLiters =
            Number(liters);


        if (
            !Number.isFinite(numericLiters) ||
            numericLiters < 0
        ) {

            return res.redirect(
                "/milk?error=" +
                encodeURIComponent(
                    "Please enter a valid milk quantity."
                )
            );

        }


        /*
         * Update through the service.
         *
         * The service remains responsible for the actual
         * MongoDB update and record validation.
         */

        await milkService.updateMilkRecord(

            recordId,

            {

                liters:
                    numericLiters,

                remarks:
                    remarks
                        ? String(remarks).trim()
                        : ""

            },

            {

                userId:
                    sessionUser._id,

                userRole:
                    sessionUser.role

            }

        );


        /*
         * Return to the collection page.
         */

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



// ==========================================================
// OPTIONAL: MILK HISTORY
// ==========================================================

exports.getMilkHistory = async (req, res) => {

    try {

        const sessionUser =
            req.session && req.session.user
                ? req.session.user
                : null;


        if (!sessionUser) {
            return res.redirect("/login");
        }


        const dairyId =
            req.params.dairyId;


        if (!dairyId) {

            return res.redirect(
                "/milk?error=" +
                encodeURIComponent(
                    "Animal ID is missing."
                )
            );

        }


        const history =
            await milkService.getMilkHistory(
                dairyId,
                sessionUser
            );


        return res.render(
            "milkingHistory",
            {

                user:
                    sessionUser,

                history:
                    history || [],

                dairyId:
                    dairyId

            }
        );

    }

    catch (error) {

        console.error(
            "GET /milk/history/:dairyId error:",
            error
        );


        return res.redirect(
            "/milk?error=" +
            encodeURIComponent(
                "Unable to load milk history."
            )
        );

    }

};



// ==========================================================
// TOGGLE MILKING STATUS
// ==========================================================

exports.toggleMilking = async (req, res) => {

    try {

        const sessionUser =
            req.session && req.session.user
                ? req.session.user
                : null;


        if (!sessionUser) {
            return res.redirect("/login");
        }


        /*
         * Only administrators can change whether an animal
         * is currently being milked.
         */

        if (
            sessionUser.role !== "admin"
        ) {

            return res.status(403).json({

                success: false,

                message:
                    "Only an administrator can change milking status."

            });

        }


        const dairyId =
            req.params.dairyId;


        if (!dairyId) {

            return res.status(400).json({

                success: false,

                message:
                    "Animal ID is required."

            });

        }


        const result =
            await milkService.toggleMilking(
                dairyId,
                sessionUser._id
            );


        return res.json({

            success: true,

            isMilking:
                result.isMilking,

            message:
                result.isMilking
                    ? "Animal added to milk collection."
                    : "Animal removed from milk collection."

        });

    }

    catch (error) {

        console.error(
            "Toggle milking error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                error.message ||
                "Unable to change milking status."

        });

    }

};