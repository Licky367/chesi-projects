// ==========================================================
// verrah/controllers/substations/updateMultipleProductUnits.js
// UPDATE MULTIPLE PRODUCT UNITS
//
// Updates several different products belonging to the
// same substation in a single request.
// ==========================================================

const service =
require("../../services/substationService");

const {
getRole
} = require("./helpers");

exports.updateMultipleProductUnits =
async (
req,
res
) => {

try {

    // ==================================================
    // ADMIN ACCESS
    // ==================================================

    if (
        getRole(req) !== "admin"
    ) {

        throw new Error(
            "Admin access required."
        );

    }


    // ==================================================
    // SUBSTATION
    // ==================================================

    const substationId =
        req.body.substationId;


    if (!substationId) {

        throw new Error(
            "Substation is required."
        );

    }


    // ==================================================
    // PRODUCT UPDATES
    // ==================================================

    const products =
        Array.isArray(req.body.products)
            ? req.body.products
            : [];


    if (!products.length) {

        throw new Error(
            "No products were provided."
        );

    }


    // ==================================================
    // UPDATE MULTIPLE PRODUCTS
    // ==================================================

    await service.updateMultipleProductUnits(
        substationId,
        products
    );


    // ==================================================
    // SUCCESS
    // ==================================================

    return res.redirect(
        `/substations/product?substation=${encodeURIComponent(
            substationId
        )}&success=${encodeURIComponent(
            "Product units updated successfully."
        )}`
    );


} catch (e) {

    console.error(
        "UPDATE MULTIPLE PRODUCT UNITS ERROR:",
        e
    );


    // ==================================================
    // ERROR REDIRECT
    // ==================================================

    const substationId =
        req.body.substationId ||
        "";


    return res.redirect(
        `/substations/product?substation=${encodeURIComponent(
            substationId
        )}&error=${encodeURIComponent(
            e.message
        )}`
    );

}

};