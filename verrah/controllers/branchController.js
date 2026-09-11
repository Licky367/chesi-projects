// ==========================================================
// controllers/branchController.js
// VERRAH COSMETICS
// BRANCH / SUBSTATION CONTROLLER
// ==========================================================

const branchService =
    require("../services/branchService");


// ==========================================================
// GET BRANCH / SUBSTATION DETAILS
// ==========================================================

exports.getBranch = async function (req, res) {

    try {

        const substation =
            await branchService.getBranchById(
                req.params.id
            );


        // ----------------------------------------------------
        // SUBSTATION NOT FOUND
        // ----------------------------------------------------

        if (!substation) {

            return res.status(404).render(
                "branch",
                {
                    title:
                        "Location Not Found | Verrah Cosmetics",

                    // The branch view expects this variable.
                    substation: null,

                    // Explicitly pass the substations collection
                    // variable as well for the view/partials.
                    substations: [],

                    currentUser:
                        req.session?.user || null,

                    error:
                        "The requested Verrah Cosmetics location could not be found."
                }
            );
        }


        // ----------------------------------------------------
        // RENDER BRANCH / SUBSTATION PAGE
        // ----------------------------------------------------

        return res.render(
            "branch",
            {
                title:
                    `${substation.name} | Verrah Cosmetics`,

                // Main selected substation.
                substation,

                // Pass substations to the view.
                // This will be populated properly by the
                // service layer in the next step.
                substations: [substation],

                currentUser:
                    req.session?.user || null,

                error: null
            }
        );


    } catch (error) {

        console.error(
            "GET BRANCH ERROR:",
            error
        );


        // ----------------------------------------------------
        // SERVER ERROR
        // ----------------------------------------------------

        return res.status(500).render(
            "branch",
            {
                title:
                    "Branch | Verrah Cosmetics",

                substation: null,

                substations: [],

                currentUser:
                    req.session?.user || null,

                error:
                    "Unable to load this location."
            }
        );
    }
};