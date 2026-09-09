const branchService =
    require("../services/branchService");


/* =========================================================
   GET BRANCH DETAILS
========================================================= */

exports.getBranch = async function (req, res) {

    try {

        const substation =
            await branchService.getBranchById(
                req.params.id
            );

        if (!substation) {

            return res.status(404).render(
                "branch",
                {
                    title: "Location Not Found | Verrah Cosmetics",

                    substation: null,

                    currentUser:
                        req.session?.user || null,

                    error:
                        "The requested Verrah Cosmetics location could not be found."
                }
            );
        }


        return res.render(
            "branch",
            {
                title:
                    `${substation.name} | Verrah Cosmetics`,

                substation,

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

        return res.status(500).render(
            "branch",
            {
                title:
                    "Branch | Verrah Cosmetics",

                substation: null,

                currentUser:
                    req.session?.user || null,

                error:
                    "Unable to load this location."
            }
        );
    }
};