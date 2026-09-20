const liabilityService = require("../services/liability");
const Substation = require("../models/substations");


// ==========================================================
// LIABILITY PAGE
// ==========================================================

exports.index = async function (req, res) {

    try {

        const user = req.user;


        if (!user) {

            return res.redirect("/auth/login");

        }


        /*
         * --------------------------------------------------
         * ACTIVE TAB
         * --------------------------------------------------
         */

        const activeTab =
            req.query.tab === "records"
                ? "records"
                : "entry";


        /*
         * --------------------------------------------------
         * DEFAULT FILTER
         * --------------------------------------------------
         */

        const now = new Date();


        const defaultDate =
            now.toLocaleDateString(
                "en-CA",
                {
                    timeZone: "Africa/Nairobi"
                }
            );


        const activeFilterDate =
            req.query.liabilityDate ||
            defaultDate;


        const activeFilterPeriod =
            ["day", "month", "year"].includes(
                req.query.liabilityPeriod
            )
                ? req.query.liabilityPeriod
                : "month";


        /*
         * --------------------------------------------------
         * SUBSTATION FILTER
         * --------------------------------------------------
         *
         * Only admin can choose a substation.
         *
         * Empty string means:
         *
         *     ALL SUBSTATIONS
         * --------------------------------------------------
         */

        const activeFilterSubstation =
            user.role === "admin"
                ? (req.query.liabilitySubstation || "")
                : "";


        /*
         * --------------------------------------------------
         * SUBSTATIONS
         *
         * Admin gets the complete list for:
         *
         * 1. Liability entry
         * 2. Liability filtering
         *
         * Staff do not need the complete list.
         * --------------------------------------------------
         */

        let substations = [];


        if (user.role === "admin") {

            substations =
                await Substation
                    .find({})
                    .sort({
                        name: 1
                    })
                    .lean();

        }


        /*
         * --------------------------------------------------
         * LIABILITY RECORDS
         * --------------------------------------------------
         */

        let liabilities = [];


        if (activeTab === "records") {

            liabilities =
                await liabilityService.getLiabilities({

                    user,

                    date:
                        activeFilterDate,

                    period:
                        activeFilterPeriod,

                    substation:
                        activeFilterSubstation

                });

        }


        /*
         * --------------------------------------------------
         * FILTER LABEL
         * --------------------------------------------------
         */

        let filterLabel = "Month";


        if (activeFilterPeriod === "day") {

            filterLabel = "Day";

        }


        else if (activeFilterPeriod === "year") {

            filterLabel = "Year";

        }


        /*
         * --------------------------------------------------
         * RENDER
         * --------------------------------------------------
         */

        return res.render(
            "liability",
            {

                user,

                activeTab,

                substations,

                liabilities,

                activeFilterDate,

                activeFilterPeriod,

                activeFilterSubstation,

                filterLabel

            }
        );

    }


    catch (error) {

        console.error(
            "Liability page error:",
            error
        );


        return res.status(500).render(
            "liability",
            {

                user: req.user,

                activeTab: "entry",

                substations: [],

                liabilities: [],

                activeFilterDate:
                    new Date()
                        .toLocaleDateString(
                            "en-CA",
                            {
                                timeZone:
                                    "Africa/Nairobi"
                            }
                        ),

                activeFilterPeriod:
                    "month",

                activeFilterSubstation:
                    "",

                filterLabel:
                    "Month",

                error:
                    "Unable to load liabilities."

            }
        );

    }

};


// ==========================================================
// CREATE LIABILITY
// ==========================================================

exports.create = async function (req, res) {

    try {

        const user = req.user;


        if (!user) {

            return res.redirect("/auth/login");

        }


        /*
         * --------------------------------------------------
         * LIABILITY NAME
         * --------------------------------------------------
         */

        const name =
            typeof req.body.name === "string"
                ? req.body.name.trim()
                : "";


        /*
         * --------------------------------------------------
         * AMOUNT
         * --------------------------------------------------
         */

        const amount =
            Number(req.body.amount);


        /*
         * --------------------------------------------------
         * VALIDATE NAME
         * --------------------------------------------------
         */

        if (!name) {

            return res.redirect(
                "/liability?tab=entry&error=" +
                encodeURIComponent(
                    "Please enter the liability name."
                )
            );

        }


        /*
         * --------------------------------------------------
         * VALIDATE AMOUNT
         * --------------------------------------------------
         */

        if (
            !Number.isFinite(amount) ||
            amount < 0
        ) {

            return res.redirect(
                "/liability?tab=entry&error=" +
                encodeURIComponent(
                    "Please enter a valid liability amount."
                )
            );

        }


        /*
         * --------------------------------------------------
         * DETERMINE SUBSTATION
         * --------------------------------------------------
         */

        let substation;


        if (user.role === "staff") {

            substation =
                user.assignedSubstation;

        }


        else if (user.role === "admin") {

            substation =
                req.body.substation;

        }


        /*
         * --------------------------------------------------
         * VALIDATE SUBSTATION
         * --------------------------------------------------
         */

        if (!substation) {

            return res.redirect(
                "/liability?tab=entry&error=" +
                encodeURIComponent(
                    "Please select a substation."
                )
            );

        }


        /*
         * --------------------------------------------------
         * ADMIN SUBSTATION VALIDATION
         * --------------------------------------------------
         */

        if (user.role === "admin") {

            const selectedSubstation =
                await Substation.findById(
                    substation
                );


            if (!selectedSubstation) {

                return res.redirect(
                    "/liability?tab=entry&error=" +
                    encodeURIComponent(
                        "Selected substation was not found."
                    )
                );

            }

        }


        /*
         * --------------------------------------------------
         * CREATE LIABILITY
         * --------------------------------------------------
         */

        await liabilityService.createLiability({

            name,

            amount,

            recordedBy:
                user._id,

            substation

        });


        /*
         * --------------------------------------------------
         * SUCCESS
         * --------------------------------------------------
         */

        return res.redirect(
            "/liability?tab=entry&success=" +
            encodeURIComponent(
                "Liability recorded successfully."
            )
        );

    }


    catch (error) {

        console.error(
            "Create liability error:",
            error
        );


        return res.redirect(
            "/liability?tab=entry&error=" +
            encodeURIComponent(
                "Unable to record liability."
            )
        );

    }

};