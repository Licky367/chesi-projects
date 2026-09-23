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
        // GET SUBSTATION USING :id
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
        // SUBSTATION ID
        //
        // This is the actual MongoDB _id represented by
        // /branch/:id
        // ----------------------------------------------------

        const substationId =
            String(substation._id);


        // ----------------------------------------------------
        // RENDER BRANCH / SUBSTATION
        //
        // Pass BOTH:
        //   1. the complete substation document
        //   2. the substation ID explicitly
        // ----------------------------------------------------

        return renderBranch.success(
            req,
            res,
            substation,
            substationId
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