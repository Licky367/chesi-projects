const service = require("../../services/stockService");
const { resolveCategoryId } = require("./helpers");
const { renderForm } = require("./forms");

async function createOrUpdateStock(req, res) {

    try {

        const stockId =
            String(
                req.body.stockId || ""
            ).trim();

        const categoryId =
            await resolveCategoryId(
                req.body.category
            );

        const body = {
            ...req.body,
            category: categoryId
        };

        // ----------------------------------------------------
        // UPDATE EXISTING STOCK
        // ----------------------------------------------------

        if (stockId) {

            await service.updateStockEntry(
                stockId,
                body,
                req.user
            );

        }

        // ----------------------------------------------------
        // CREATE NEW STOCK
        // ----------------------------------------------------

        else {

            await service.createStock(
                body,
                req.user
            );

        }

        // ----------------------------------------------------
        // STAFF -> ASSIGNED SUBSTATION BRANCH
        // ----------------------------------------------------

        if (
            req.user &&
            req.user.role === "staff" &&
            req.user.assignedSubstation
        ) {

            return res.redirect(
                `/branch/${req.user.assignedSubstation}?saved=1`
            );
        }

        // ----------------------------------------------------
        // OTHER ROLES -> EXISTING REDIRECT
        // ----------------------------------------------------

        return res.redirect(
            "/stock?saved=1"
        );

    } catch (error) {

        console.error(
            "Create/update stock error:",
            error
        );

        return renderForm(
            res,
            {
                title: req.body.stockId
                    ? "Update Stock Subcategory"
                    : "Add Stock Subcategory",

                error: error.message,

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