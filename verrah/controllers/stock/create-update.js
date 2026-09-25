const service = require("../../services/stockService");
const { resolveCategoryId } = require("./helpers");
const { renderForm } = require("./forms");

async function createOrUpdateStock(req, res) {

try {

    // ====================================================
    // AUTHENTICATED USER
    // ====================================================

    if (!req.user) {

        throw new Error(
            "Authentication is required to create or update stock."
        );
    }

    // ====================================================
    // STOCK ACCESS
    // Only admin and staff may create/update stock.
    // ====================================================

    if (
        req.user.role !== "admin" &&
        req.user.role !== "staff"
    ) {

        throw new Error(
            "You are not authorized to create or update stock."
        );
    }

    // ====================================================
    // STOCK ID
    // ====================================================

    const stockId =
        String(
            req.body.stockId || ""
        ).trim();

    // ====================================================
    // CATEGORY
    //
    // The form may submit either:
    // - Category ObjectId
    // - Category name
    //
    // resolveCategoryId() normalizes it to the
    // Category ObjectId expected by the service.
    // ====================================================

    const categoryId =
        await resolveCategoryId(
            req.body.category
        );

    // ====================================================
    // NORMALIZED BODY
    // ====================================================

    const body = {
        ...req.body,
        category: categoryId
    };

    // ====================================================
    // UPDATE EXISTING STOCK
    // ====================================================

    if (stockId) {

        await service.updateStockEntry(
            stockId,
            body,
            req.user
        );

    }

    // ====================================================
    // CREATE NEW STOCK
    // ====================================================

    else {

        await service.createStock(
            body,
            req.user
        );

    }

    // ====================================================
    // STAFF REDIRECT
    //
    // Staff return to their assigned substation branch.
    // ====================================================

    if (
        req.user.role === "staff" &&
        req.user.assignedSubstation
    ) {

        return res.redirect(
            `/branch/${req.user.assignedSubstation}?saved=1`
        );
    }

    // ====================================================
    // ADMIN REDIRECT
    // ====================================================

    return res.redirect(
        "/stock?saved=1"
    );

} catch (error) {

    console.error(
        "Create/update stock error:",
        error
    );

    // ====================================================
    // PRESERVE FORM DATA
    // ====================================================

    return renderForm(
        res,
        {
            title: req.body.stockId
                ? "Update Stock Subcategory"
                : "Add Stock Subcategory",

            error:
                error &&
                error.message
                    ? error.message
                    : "Unable to create or update stock.",

            old: req.body,

            selectedStockId:
                req.body.stockId || ""
        },
        400
    );
}

}

module.exports = {
createOrUpdateStock
};