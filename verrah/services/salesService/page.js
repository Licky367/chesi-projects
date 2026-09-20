// ==========================================================
// verrah/services/salesService/page.js
// SALES PAGE SERVICE
// ==========================================================


const filterService =
    require("./filter");

const summaryService =
    require("./summary");

const staffSalesService =
    require("./staffSales");

const productsService =
    require("./products");

const arrearsService =
    require("./arrears");


// ==========================================================
// GET SALES PAGE DATA
// ==========================================================

async function getSalesPageData(
    query = {}
) {

    const allowedTabs = [
        "summary",
        "staff-sales",
        "products",
        "arrears"
    ];


    const activeTab =
        allowedTabs.includes(
            query.tab
        )
            ? query.tab
            : "summary";


    // ======================================================
    // INDEPENDENT FILTERS FOR EACH TAB
    // ======================================================

    const summaryFilter =
        filterService.getFilterState(
            query,
            "summary"
        );


    const staffSalesFilter =
        filterService.getFilterState(
            query,
            "staff-sales"
        );


    const productsFilter =
        filterService.getFilterState(
            query,
            "products"
        );


    const arrearsFilter =
        filterService.getFilterState(
            query,
            "arrears"
        );


    // ======================================================
    // LOAD ALL TAB DATA
    // ======================================================

    const [
        summary,
        staffSales,
        productAnalytics,
        arrearsPackages
    ] = await Promise.all([

        summaryService.getSummary(
            summaryFilter
        ),

        staffSalesService.getStaffSales(
            staffSalesFilter
        ),

        productsService.getProductAnalytics(
            productsFilter
        ),

        arrearsService.getCustomerArrears(
            arrearsFilter
        )

    ]);


    // ======================================================
    // ACTIVE TAB FILTER
    // ======================================================

    let activeFilter;


    if (
        activeTab ===
        "summary"
    ) {

        activeFilter =
            summaryFilter;

    } else if (
        activeTab ===
        "staff-sales"
    ) {

        activeFilter =
            staffSalesFilter;

    } else if (
        activeTab ===
        "products"
    ) {

        activeFilter =
            productsFilter;

    } else {

        activeFilter =
            arrearsFilter;

    }


    // ======================================================
    // PRESERVE ALL TAB FILTERS IN NAVIGATION
    // ======================================================

    const params =
        new URLSearchParams();


    params.set(
        "summaryDate",
        summaryFilter.date
    );


    params.set(
        "summaryPeriod",
        summaryFilter.period
    );


    params.set(
        "staffSalesDate",
        staffSalesFilter.date
    );


    params.set(
        "staffSalesPeriod",
        staffSalesFilter.period
    );


    params.set(
        "productsDate",
        productsFilter.date
    );


    params.set(
        "productsPeriod",
        productsFilter.period
    );


    params.set(
        "arrearsDate",
        arrearsFilter.date
    );


    params.set(
        "arrearsPeriod",
        arrearsFilter.period
    );


    const salesQuerySuffix =
        `&${params.toString()}`;


    // ======================================================
    // RETURN DATA FOR SALES.EJS
    // ======================================================

    return {

        activeTab,


        activeFilter,


        activeFilterDate:
            activeFilter.date,


        activeFilterPeriod:
            activeFilter.period,


        filterLabel:
            filterService.getFilterLabel(
                activeFilter
            ),


        // ==================================================
        // SUMMARY
        // ==================================================

        totalRevenue:
            summary.totalRevenue,


        packageRevenue:
            summary.packageRevenue,


        staffSalesRevenue:
            summary.staffSalesRevenue,


        packageBuyingCost:
            summary.packageBuyingCost,


        staffSalesBuyingCost:
            summary.staffSalesBuyingCost,


        profit:
            summary.profit,


        // ==================================================
        // EXPENSES
        // ==================================================

        expenses:
            summary.expenses,


        // ==================================================
        // NET PROFIT
        // ==================================================

        netProfit:
            summary.netProfit,


        packageProfit:
            summary.packageProfit,


        staffSalesProfit:
            summary.staffSalesProfit,


        customerArrears:
            summary.customerArrears,


        assetCost:
            summary.assetCost,


        productAssetCost:
            summary.productAssetCost,


        stockAssetCost:
            summary.stockAssetCost,


        // ==================================================
        // OTHER TABS
        // ==================================================

        staffSales,


        productAnalytics,


        arrearsPackages,


        // ==================================================
        // INDIVIDUAL FILTER STATES
        // ==================================================

        summaryFilter,


        staffSalesFilter,


        productsFilter,


        arrearsFilter,


        // ==================================================
        // INDIVIDUAL FILTER LABELS
        // ==================================================

        summaryFilterLabel:
            filterService.getFilterLabel(
                summaryFilter
            ),


        staffSalesFilterLabel:
            filterService.getFilterLabel(
                staffSalesFilter
            ),


        productsFilterLabel:
            filterService.getFilterLabel(
                productsFilter
            ),


        arrearsFilterLabel:
            filterService.getFilterLabel(
                arrearsFilter
            ),


        // ==================================================
        // NAVIGATION QUERY STRING
        // ==================================================

        salesQuerySuffix

    };

}


// ==========================================================
// EXPORT
// ==========================================================

module.exports = {
    getSalesPageData
};