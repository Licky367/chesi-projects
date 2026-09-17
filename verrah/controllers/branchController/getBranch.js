// ==========================================================
// controllers/branchController/getBranch.js
// VERRAH COSMETICS
// GET BRANCH / SUBSTATION
// ==========================================================

const substationService =
    require("../../services/substationService");

const renderBranch =
    require("./renderBranch");


// ==========================================================
// GET BRANCH / SUBSTATION DETAILS
// ==========================================================

exports.getBranch = async function (req, res) {

    try {

        const substation =
            await substationService.getWithProducts(
                req.params.id
            );


        // ----------------------------------------------------
        // SUBSTATION NOT FOUND
        // ----------------------------------------------------

        if (!substation) {

            return renderBranch.notFound(
                req,
                res
            );
        }


        // ----------------------------------------------------
        // RENDER BRANCH / SUBSTATION
        // ----------------------------------------------------

        return renderBranch.success(
            req,
            res,
            substation
        );


    } catch (error) {

        console.error(
            "GET BRANCH ERROR:",
            error
        );


        // ----------------------------------------------------
        // SERVER ERROR
        // ----------------------------------------------------

        return renderBranch.error(
            req,
            res
        );
    }
};