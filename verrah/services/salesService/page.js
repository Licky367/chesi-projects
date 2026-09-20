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

const substationService =
    require("../substationService");


// ==========================================================
// GET SALES PAGE DATA
//
// GLOBAL SUBSTATION FILTER
//
// ADMIN:
//     query.substation is used.
//     Empty substation = all substations.
//
// STAFF:
//     user.assignedSubstation is always used.
//     The query string cannot override it.
//
// DATE/PERIOD:
//     Remain independent for each tab.
// ==========================================================

async function getSalesPageData(
    query = {},
    user = {}
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
    // LOAD ACTIVE SUBSTATIONS
    //
    // Used by the admin substation selector.
    //
    // Staff also receive the list in the page data, but the
    // filter UI should remain hidden for staff.
    // ======================================================

    const substations =
        await substationService.list();


    // ======================================================
    // INDEPENDENT DATE/PERIOD FILTERS FOR EACH TAB
    //
    // The substation filter is global.
    // It is therefore resolved from the same user/query
    // state for every tab.
    // ======================================================

    const summaryFilter =
        filterService.getFilterState(
            query,
            "summary",
            user
        );


    const staffSalesFilter =
        filterService.getFilterState(
            query,
            "staff-sales",
            user
        );


    const productsFilter =
        filterService.getFilterState(
            query,
            "products",
            user
        );


    const arrearsFilter =
        filterService.getFilterState(
            query,
            "arrears",
            user
        );


    // ======================================================
    // LOAD ALL TAB DATA
    //
    // Each service receives its own date/period filter,
    // while all four filters contain the same global
    // substation restriction.
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
    //
    // Substation is GLOBAL, so it is stored only once.
    // ======================================================

    const params =
        new URLSearchParams();


    // ======================================================
    // SUMMARY FILTER
    // ======================================================

    params.set(
        "summaryDate",
        summaryFilter.date
    );


    params.set(
        "summaryPeriod",
        summaryFilter.period
    );


    // ======================================================
    // STAFF SALES FILTER
    // ======================================================

    params.set(
        "staffSalesDate",
        staffSalesFilter.date
    );


    params.set(
        "staffSalesPeriod",
        staffSalesFilter.period
    );


    // ======================================================
    // PRODUCTS FILTER
    // ======================================================

    params.set(
        "productsDate",
        productsFilter.date
    );


    params.set(
        "productsPeriod",
        productsFilter.period
    );


    // ======================================================
    // ARREARS FILTER
    // ======================================================

    params.set(
        "arrearsDate",
        arrearsFilter.date
    );


    params.set(
        "arrearsPeriod",
        arrearsFilter.period
    );


    // ======================================================
    // GLOBAL SUBSTATION FILTER
    //
    // For admin:
    //     selected substation is preserved.
    //
    // For staff:
    //     assignedSubstation is preserved.
    // ======================================================

    if (
        activeFilter.substation
    ) {

        params.set(
            "substation",
            String(
                activeFilter.substation
            )
        );

    }


    const salesQuerySuffix =
        `&${params.toString()}`;


    // ======================================================
    // RETURN DATA FOR SALES.EJS
    // ======================================================

    return {

        activeTab,


        // ==================================================
        // SUBSTATIONS
        // ==================================================

        substations,


        activeFilter,


        activeFilterDate:
            activeFilter.date,


        activeFilterPeriod:
            activeFilter.period,


        // ==================================================
        // GLOBAL SUBSTATION FILTER STATE
        // ==================================================

        activeSubstationId:
            activeFilter.substation,


        isSubstationRestricted:
            activeFilter.isSubstationRestricted,


        isAdmin:
            activeFilter.isAdmin,


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