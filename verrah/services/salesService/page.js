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

const products =
    require("../../models/products");


// ==========================================================
// GET SALES PAGE DATA
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
    // ======================================================

    const substations =
        await substationService.list();


    // ======================================================
    // INDEPENDENT FILTERS
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
    // LOAD PAGE DATA
    // ======================================================

    const [
        summary,
        staffSales,
        productAnalytics,
        arrearsPackages,
        productRecords
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
        ),

        products.find({}).lean()

    ]);


    // ======================================================
    // STAFF SALES TOTALS
    // ======================================================

    const staffSalesTotals =
        staffSales &&
        staffSales.totals
            ? staffSales.totals
            : {
                day: 0,
                month: 0,
                year: 0,
                bySubstation: []
            };


    // ======================================================
    // ACTIVE FILTER
    // ======================================================

    let activeFilter;


    if (
        activeTab === "summary"
    ) {

        activeFilter =
            summaryFilter;

    } else if (
        activeTab === "staff-sales"
    ) {

        activeFilter =
            staffSalesFilter;

    } else if (
        activeTab === "products"
    ) {

        activeFilter =
            productsFilter;

    } else {

        activeFilter =
            arrearsFilter;

    }


    // ======================================================
    // PRESERVE ALL TAB FILTERS
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


    // ======================================================
    // GLOBAL SUBSTATION FILTER
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
    // RETURN SALES PAGE DATA
    // ======================================================

    return {

        activeTab,


        // ==================================================
        // SUBSTATIONS
        // ==================================================

        substations,


        // ==================================================
        // FULL PRODUCT RECORDS
        //
        // Available in EJS as:
        //
        //     products
        //
        // Includes:
        //
        //     product.name
        //     product.unitSellPrice
        //
        // and all other fields defined in models/products.js.
        // ==================================================

        products:
            productRecords,


        activeFilter,


        activeFilterDate:
            activeFilter.date,


        activeFilterPeriod:
            activeFilter.period,


        // ==================================================
        // GLOBAL SUBSTATION FILTER
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
        // STAFF SALES
        // ==================================================

        staffSales,


        staffSalesTotals,


        // ==================================================
        // PRODUCT ANALYTICS
        // ==================================================

        productAnalytics,


        // ==================================================
        // ARREARS
        // ==================================================

        arrearsPackages,


        // ==================================================
        // FILTER STATES
        // ==================================================

        summaryFilter,


        staffSalesFilter,


        productsFilter,


        arrearsFilter,


        // ==================================================
        // FILTER LABELS
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