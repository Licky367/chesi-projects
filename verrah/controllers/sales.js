// ==========================================================
// verrah/controllers/sales.js
//
// VERRAH COSMETICS
// SALES / ANALYTICS CONTROLLER
// ==========================================================

const salesService =
    require("../services/salesService");


// ==========================================================
// SALES PAGE
// ==========================================================

exports.index = async (req, res) => {

    try {

        const data =
            await salesService.getSalesPageData(
                req.query || {}
            );


        return res.render("sales", {

            title:
                "Sales | Verrah Cosmetics",

            ...data,

            error:
                null

        });

    } catch (err) {

        console.error(
            "Sales page error:",
            err
        );


        // --------------------------------------------------
        // SAFE ACTIVE TAB
        // --------------------------------------------------

        const activeTab =
            [
                "summary",
                "products",
                "arrears"
            ].includes(
                req.query?.tab
            )
                ? req.query.tab
                : "summary";


        // --------------------------------------------------
        // ERROR FALLBACK
        //
        // Every value expected by the sales view is
        // explicitly supplied so EJS does not encounter
        // undefined variables.
        // --------------------------------------------------

        return res.status(500).render(
            "sales",
            {

                title:
                    "Sales | Verrah Cosmetics",


                activeTab,


                // ==================================================
                // REVENUE
                // ==================================================

                totalRevenue:
                    0,

                packageRevenue:
                    0,

                staffSalesRevenue:
                    0,


                // ==================================================
                // ARREARS
                // ==================================================

                customerArrears:
                    0,


                // ==================================================
                // PROFIT
                // ==================================================

                profit:
                    0,

                packageProfit:
                    0,

                staffSalesProfit:
                    0,


                // ==================================================
                // STAFF SALES
                //
                // IMPORTANT:
                // This is what allows the frontend to safely use:
                //
                //     staffSales
                //
                // even when loading the page fails.
                // ==================================================

                staffSales:
                    [],


                // ==================================================
                // OTHER SALES DATA
                // ==================================================

                productAnalytics:
                    [],

                arrearsPackages:
                    [],


                // ==================================================
                // FILTER
                // ==================================================

                activeFilterDate:
                    salesService.getCurrentNairobiDate(),

                activeFilterPeriod:
                    "month",

                filterLabel:
                    "Unable to load sales data.",

                salesQuerySuffix:
                    "",


                // ==================================================
                // ERROR
                // ==================================================

                error:
                    "Unable to load sales analytics."

            }
        );

    }

};