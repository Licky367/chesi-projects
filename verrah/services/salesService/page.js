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

const Product =
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
    // FILTERS
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
    // ======================================================

    let [
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
    // ADD PRODUCT UNIT SELL PRICE TO ANALYTICS
    //
    // productAnalytics contains the analytics records.
    //
    // The actual product documents contain:
    //
    //     unitSellPrice
    //
    // Match each analytics record to its product using
    // the product _id.
    // ======================================================

    if (
        Array.isArray(productAnalytics) &&
        productAnalytics.length
    ) {

        const productIds =
            productAnalytics
                .map(product => product._id)
                .filter(Boolean);


        const productRecords =
            await Product.find(
                {
                    _id: {
                        $in: productIds
                    }
                },
                {
                    unitSellPrice: 1
                }
            ).lean();


        const productPriceMap =
            new Map(
                productRecords.map(product => [
                    String(product._id),
                    product.unitSellPrice
                ])
            );


        productAnalytics =
            productAnalytics.map(product => ({
                ...product,

                unitSellPrice:
                    productPriceMap.get(
                        String(product._id)
                    ) || 0
            }));

    }


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
    // RETURN DATA
    // ======================================================

    return {

        activeTab,

        substations,

        activeFilter,

        activeFilterDate:
            activeFilter.date,

        activeFilterPeriod:
            activeFilter.period,

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
        //
        // Each product now contains:
        //
        //     product.name
        //     product.unitSellPrice
        //     product.stockAvailable
        //     product.marketAvailable
        //     product.sales
        //
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