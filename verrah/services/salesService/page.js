// ==========================================================
// verrah/services/salesService/page.js
//
// VERRAH COSMETICS
// SALES / ANALYTICS PAGE SERVICE
// ==========================================================

const mongoose =
    require("mongoose");


// ==========================================================
// SERVICES
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

const dailyCashSalesService =
    require("./dailyCashSales");

const substationService =
    require("../substationService");


// ==========================================================
// MODELS
// ==========================================================

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

    if (!value) {

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
//     user.assignedSubstation
//
// ADMIN:
//
//     productsFilter.substation
//
// ADMIN WITHOUT SUBSTATION:
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


    // ======================================================
    // STAFF
    // ======================================================

    if (
        role === "staff"
    ) {

        return getIdValue(
            user.assignedSubstation
        );

    }


    // ======================================================
    // ADMIN + SELECTED SUBSTATION
    // ======================================================

    if (
        role === "admin" &&
        productsFilter &&
        productsFilter.substation
    ) {

        return getIdValue(
            productsFilter.substation
        );

    }


    // ======================================================
    // ADMIN WITHOUT SUBSTATION
    // ======================================================

    return null;

}


// ==========================================================
// GET SALES PAGE DATA
// ==========================================================

async function getSalesPageData(
    query = {},
    user = {}
) {

    // ======================================================
    // ALLOWED TABS
    // ======================================================

    const allowedTabs = [

        "summary",

        "staff-sales",

        "products",

        "arrears",

        "daily-cash-sales"

    ];


    // ======================================================
    // ACTIVE TAB
    // ======================================================

    const activeTab =
        allowedTabs.includes(
            query.tab
        )
            ? query.tab
            : "products";


    // ======================================================
    // SUBSTATIONS
    //
    // KEEP THIS VARIABLE NAME.
    //
    // sales.ejs and sales-partials/filter.ejs expect:
    //
    //     substations
    //
    // ======================================================

    const substations =
        await substationService.list();


    // ======================================================
    // FILTER STATES
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
    // PRODUCT CATEGORY FILTER
    // ======================================================

    if (
        query.category &&
        mongoose.Types.ObjectId.isValid(
            query.category
        )
    ) {

        productsFilter.category =
            query.category;

    }


    // ======================================================
    // LOAD PAGE DATA
    // ======================================================
    //
    // IMPORTANT:
    //
    // productsService MUST receive user.
    //
    // This allows it to determine:
    //
    // STAFF
    //     -> assignedSubstation
    //
    // ADMIN + SUBSTATION
    //     -> selected substation
    //
    // ADMIN WITHOUT SUBSTATION
    //     -> global
    //
    // ======================================================

    const [
        summary,
        staffSales,
        productAnalytics,
        arrears,
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

        arrearsService.getArrears(
            arrearsFilter,
            user
        ),

        dailyCashSalesService.getDailyCashSales(
            dailyCashSalesFilter,
            user
        )

    ]);


    // ======================================================
    // EFFECTIVE SUBSTATION
    //
    // Used only to make the category dropdown match the
    // same business type being used by product analytics.
    // ======================================================

    const effectiveSubstationId =
        getEffectiveSubstationId(
            productsFilter,
            user
        );


    let effectiveSubstation =
        null;


    if (
        effectiveSubstationId
    ) {

        effectiveSubstation =
            substations.find(
                substation =>
                    getIdValue(
                        substation._id
                    ) ===
                    effectiveSubstationId
            ) || null;

    }


    // ======================================================
    // LOAD ACTIVE CATEGORIES
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
    // EFFECTIVE BUSINESS TYPE
    // ======================================================
    //
    // STAFF:
    //     assigned substation business type
    //
    // ADMIN + SUBSTATION:
    //     selected substation business type
    //
    // ADMIN WITHOUT SUBSTATION:
    //     no business type restriction
    //
    // ======================================================

    let businessTypeId =
        null;


    if (
        effectiveSubstation &&
        effectiveSubstation.businessType &&
        effectiveSubstation.businessType.id
    ) {

        businessTypeId =
            String(
                effectiveSubstation.businessType.id
            );

    }


    // ======================================================
    // FILTER CATEGORY DROPDOWN
    // ======================================================
    //
    // Do the comparison in JavaScript rather than relying
    // on MongoDB's nested businessType.id query.
    //
    // This handles ObjectId/string representation safely.
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

    }


    // ======================================================
    // PRODUCT SELLING PRICE
    // ======================================================
    //
    // Keep unitSellPrice attached to the analytics result.
    // ======================================================

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


    const productsWithPrices =
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


    // ======================================================
    // STAFF SALES TOTALS
    // ======================================================

    const staffSalesTotals = {

        totalSales:
            staffSales.reduce(

                (
                    total,
                    sale
                ) =>

                    total +
                    Number(
                        sale.totalAmount ||
                        sale.amount ||
                        0
                    ),

                0

            ),

        totalQuantity:
            staffSales.reduce(

                (
                    total,
                    sale
                ) =>

                    total +
                    Number(
                        sale.quantity ||
                        sale.qty ||
                        0
                    ),

                0

            )

    };


    // ======================================================
    // ACTIVE FILTER
    // ======================================================

    let activeFilter;


    switch (
        activeTab
    ) {

        case "summary":

            activeFilter =
                summaryFilter;

            break;


        case "staff-sales":

            activeFilter =
                staffSalesFilter;

            break;


        case "products":

            activeFilter =
                productsFilter;

            break;


        case "arrears":

            activeFilter =
                arrearsFilter;

            break;


        case "daily-cash-sales":

            activeFilter =
                dailyCashSalesFilter;

            break;


        default:

            activeFilter =
                productsFilter;

            break;

    }


    // ======================================================
    // SALES QUERY SUFFIX
    // ======================================================
    //
    // Preserve the filters for each sales tab when moving
    // between tabs.
    // ======================================================

    const params =
        new URLSearchParams();


    // ------------------------------------------------------
    // SUMMARY
    // ------------------------------------------------------

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


    // ------------------------------------------------------
    // STAFF SALES
    // ------------------------------------------------------

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


    // ------------------------------------------------------
    // PRODUCTS
    // ------------------------------------------------------

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
            productsFilter.category
        );

    }


    // ------------------------------------------------------
    // ARREARS
    // ------------------------------------------------------

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


    // ------------------------------------------------------
    // DAILY CASH SALES
    // ------------------------------------------------------

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


    // ------------------------------------------------------
    // SUBSTATION
    // ------------------------------------------------------
    //
    // Keep the selected substation in the query string.
    //
    // For staff, the filter service may already populate
    // the effective substation.
    //
    // ======================================================

    if (
        activeFilter &&
        activeFilter.substation
    ) {

        params.set(
            "substation",
            activeFilter.substation
        );

    }


    const salesQuerySuffix =
        params.toString();


    // ======================================================
    // RETURN PAGE DATA
    //
    // IMPORTANT:
    //
    // Keep these property names because the existing
    // sales.ejs and sales-partials expect them.
    // ======================================================

    return {

        activeTab,

        // --------------------------------------------------
        // REQUIRED BY sales.ejs / filter.ejs
        // --------------------------------------------------

        substations,

        categories,

        // --------------------------------------------------
        // SALES DATA
        // --------------------------------------------------

        summary,

        staffSales,

        staffSalesTotals,

        productAnalytics:
            productsWithPrices,

        arrears,

        dailyCashSales,

        // --------------------------------------------------
        // FILTERS
        // --------------------------------------------------

        summaryFilter,

        staffSalesFilter,

        productsFilter,

        arrearsFilter,

        dailyCashSalesFilter,

        activeFilter,

        // --------------------------------------------------
        // QUERY
        // --------------------------------------------------

        salesQuerySuffix

    };

}


// ==========================================================
// EXPORT
// ==========================================================

module.exports = {

    getSalesPageData

};