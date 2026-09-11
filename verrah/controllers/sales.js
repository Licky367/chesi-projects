// ==========================================================
// verrah/controllers/sales.js
//
// VERRAH COSMETICS
// SALES / ANALYTICS CONTROLLER
// ==========================================================

const salesService =
    require("../services/salesService");


exports.index = async (req, res) => {

    try {

        const data =
            await salesService.getSalesPageData(
                req.query || {}
            );

        return res.render("sales", {
            title: "Sales | Verrah Cosmetics",
            ...data,
            error: null
        });

    } catch (err) {

        console.error(
            "Sales page error:",
            err
        );

        return res.status(500).render("sales", {

            title: "Sales | Verrah Cosmetics",

            activeTab:
                ["summary", "products", "arrears"]
                    .includes(req.query?.tab)
                    ? req.query.tab
                    : "summary",

            totalRevenue: 0,
            customerArrears: 0,
            profit: 0,

            productAnalytics: [],
            arrearsPackages: [],

            activeFilterDate:
                salesService.getCurrentNairobiDate(),

            activeFilterPeriod: "month",

            filterLabel:
                "Unable to load sales data.",

            salesQuerySuffix: "",

            error:
                "Unable to load sales analytics."
        });
    }
};
