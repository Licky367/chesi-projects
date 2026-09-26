// ==========================================================
// verrah/services/salesService/page.js
//
// SALES PAGE SERVICE
// ==========================================================

const mongoose =
    require("mongoose");

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

const dailyCashSalesService =
    require("./dailyCashSales");

const substationService =
    require("../substationService");

const Product =
    require("../../models/products");

const Category =
    require("../../models/category");


// ==========================================================
// HELPERS
// ==========================================================

function getIdValue(
    value
) {

    if (
        !value
    ) {

        return null;

    }


    if (
        typeof value === "object" &&
        value._id
    ) {

        return String(
            value._id
        );

    }


    return String(
        value
    );

}


function getRole(
    user = {}
) {

    return String(
        user.role || ""
    ).toLowerCase();

}


// ==========================================================
// EFFECTIVE SUBSTATION
// ==========================================================
//
// STAFF:
//
//     assignedSubstation
//
// ADMIN:
//
//     selected products substation
//
// ADMIN WITHOUT SELECTION:
//
//     null
//
// ==========================================================

function getEffectiveSubstationId(
    productsFilter,
    user = {}
) {

    const role =
        getRole(
            user
        );


    if (
        role === "staff"
    ) {

        return getIdValue(
            user.assignedSubstation
        );

    }


    if (
        role === "admin" &&
        productsFilter &&
        productsFilter.substation
    ) {

        return getIdValue(
            productsFilter.substation
        );

    }


    return null;

}


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
        "arrears",
        "daily-cash-sales"

    ];


    const activeTab =
        allowedTabs.includes(
            query.tab
        )
            ? query.tab
            : "products";


    // ======================================================
    // LOAD SUBSTATIONS
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


    const dailyCashSalesFilter =
        filterService.getFilterState(
            query,
            "daily-cash-sales",
            user
        );


    // ======================================================
    // CATEGORY FILTER
    // ======================================================

    const requestedCategory =
        query.category
            ? String(
                query.category
            ).trim()
            : "";


    const categoryId =
        requestedCategory &&
        mongoose.Types.ObjectId.isValid(
            requestedCategory
        )
            ? requestedCategory
            : "";


    if (
        categoryId
    ) {

        productsFilter.category =
            categoryId;

    }


    // ======================================================
    // EFFECTIVE SUBSTATION
    // ======================================================

    const effectiveSubstationId =
        getEffectiveSubstationId(
            productsFilter,
            user
        );


    // ======================================================
    // LOAD TAB DATA
    // ======================================================

    let [
        summary,
        staffSales,
        productAnalytics,
        arrearsPackages,
        dailyCashSales

    ] = await Promise.all([

        summaryService.getSummary(
            summaryFilter,
            user
        ),

        staffSalesService.getStaffSales(
            staffSalesFilter,
            user
        ),

        productsService.getProductAnalytics(
            productsFilter,
            user
        ),

        arrearsService.getArrears
            ? arrearsService.getArrears(
                arrearsFilter,
                user
            )
            : arrearsService.getCustomerArrears(
                arrearsFilter,
                user
            ),

        dailyCashSalesService.getDailyCashSales(
            dailyCashSalesFilter,
            user
        )

    ]);


    // ======================================================
    // EFFECTIVE BUSINESS TYPE
    // ======================================================

    let businessTypeId =
        null;


    if (
        effectiveSubstationId
    ) {

        const effectiveSubstation =
            substations.find(

                substation =>

                    getIdValue(
                        substation._id
                    ) ===
                    effectiveSubstationId

            );


        if (
            effectiveSubstation &&
            effectiveSubstation.businessType &&
            effectiveSubstation.businessType.id
        ) {

            businessTypeId =
                String(
                    effectiveSubstation
                        .businessType
                        .id
                );

        }

    }


    // ======================================================
    // ACTIVE CATEGORIES
    // ======================================================

    let categories =
        await Category.find({

            isActive:
                true

        })
        .select(
            "_id name categoryIcon isActive businessType"
        )
        .sort({
            name: 1
        })
        .lean();


    // ======================================================
    // CATEGORY BUSINESS TYPE RESTRICTION
    // ======================================================

    if (
        businessTypeId
    ) {

        categories =
            categories.filter(

                category => {

                    if (
                        !category.businessType ||
                        !category.businessType.id
                    ) {

                        return false;

                    }


                    return (

                        String(
                            category.businessType.id
                        ) ===
                        businessTypeId

                    );

                }

            );

    } else if (
        getRole(user) === "staff" ||
        (
            getRole(user) === "admin" &&
            effectiveSubstationId
        )
    ) {

        // --------------------------------------------------
        // Restricted request with no business type:
        // do NOT expose global categories.
        // --------------------------------------------------

        categories = [];

    }


    // ======================================================
    // PRODUCT SELLING PRICE
    // ======================================================

    if (
        Array.isArray(
            productAnalytics
        )
    ) {

        const productIds =
            productAnalytics

                .map(
                    product =>
                        product &&
                        product._id
                            ? product._id
                            : null
                )

                .filter(
                    Boolean
                );


        let productPrices =
            new Map();


        if (
            productIds.length
        ) {

            const productsWithPrices =
                await Product.find({

                    _id: {
                        $in:
                            productIds
                    },

                    isActive:
                        true

                })
                .select(
                    "_id unitSellPrice"
                )
                .lean();


            productPrices =
                new Map(

                    productsWithPrices.map(

                        product => [

                            String(
                                product._id
                            ),

                            product.unitSellPrice

                        ]

                    )

                );

        }


        productAnalytics =
            productAnalytics.map(

                product => ({

                    ...product,

                    unitSellPrice:
                        productPrices.get(
                            String(
                                product._id
                            )
                        ) ?? null

                })

            );

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

    } else if (
        activeTab === "arrears"
    ) {

        activeFilter =
            arrearsFilter;

    } else {

        activeFilter =
            dailyCashSalesFilter;

    }


    // ======================================================
    // PRESERVE FILTERS
    // ======================================================

    const params =
        new URLSearchParams();


    if (
        summaryFilter.date
    ) {

        params.set(
            "summaryDate",
            summaryFilter.date
        );

    }


    if (
        summaryFilter.period
    ) {

        params.set(
            "summaryPeriod",
            summaryFilter.period
        );

    }


    if (
        staffSalesFilter.date
    ) {

        params.set(
            "staffSalesDate",
            staffSalesFilter.date
        );

    }


    if (
        staffSalesFilter.period
    ) {

        params.set(
            "staffSalesPeriod",
            staffSalesFilter.period
        );

    }


    if (
        productsFilter.date
    ) {

        params.set(
            "productsDate",
            productsFilter.date
        );

    }


    if (
        productsFilter.period
    ) {

        params.set(
            "productsPeriod",
            productsFilter.period
        );

    }


    if (
        productsFilter.category
    ) {

        params.set(
            "category",
            String(
                productsFilter.category
            )
        );

    }


    if (
        arrearsFilter.date
    ) {

        params.set(
            "arrearsDate",
            arrearsFilter.date
        );

    }


    if (
        arrearsFilter.period
    ) {

        params.set(
            "arrearsPeriod",
            arrearsFilter.period
        );

    }


    if (
        dailyCashSalesFilter.date
    ) {

        params.set(
            "dailyCashSalesDate",
            dailyCashSalesFilter.date
        );

    }


    if (
        dailyCashSalesFilter.period
    ) {

        params.set(
            "dailyCashSalesPeriod",
            dailyCashSalesFilter.period
        );

    }


    // ======================================================
    // PRESERVE EFFECTIVE SUBSTATION
    // ======================================================

    if (
        effectiveSubstationId
    ) {

        params.set(
            "substation",
            effectiveSubstationId
        );

    }


    // ======================================================
    // IMPORTANT:
    //
    // sales.ejs already uses:
    //
    //     ?tab=products<%= salesQuerySuffix %>
    //
    // Therefore the suffix MUST begin with "&".
    // ======================================================

    const queryString =
        params.toString();


    const salesQuerySuffix =
        queryString
            ? `&${queryString}`
            : "";


    // ======================================================
    // RETURN
    // ======================================================

    return {

        activeTab,

        substations,

        categories,

        categoryId,

        activeSubstationId:
            effectiveSubstationId,

        activeFilter,

        activeFilterDate:
            activeFilter.date,

        activeFilterPeriod:
            activeFilter.period,

        isSubstationRestricted:
            Boolean(
                effectiveSubstationId
            ),

        isAdmin:
            getRole(user) === "admin",

        filterLabel:
            filterService.getFilterLabel(
                activeFilter
            ),


        // SUMMARY

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

        expenses:
            summary.expenses,

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


        // STAFF SALES

        staffSales,

        staffSalesTotals,


        // PRODUCT ANALYTICS

        productAnalytics,


        // ARREARS

        arrearsPackages,


        // DAILY CASH SALES

        dailyCashSales,


        // FILTERS

        summaryFilter,

        staffSalesFilter,

        productsFilter,

        arrearsFilter,

        dailyCashSalesFilter,


        // FILTER LABELS

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

        dailyCashSalesFilterLabel:
            filterService.getFilterLabel(
                dailyCashSalesFilter
            ),


        // NAVIGATION

        salesQuerySuffix

    };

}


// ==========================================================
// EXPORT
// ==========================================================

module.exports = {

    getSalesPageData

};