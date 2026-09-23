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

        // ----------------------------------------------------
        // GET SUBSTATION USING /branch/:id
        // ----------------------------------------------------

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
        //
        // The complete substation document is passed to the
        // renderer. The renderer exposes:
        //
        //     substation
        //     branch
        //     substationId
        //
        // to the EJS view.
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