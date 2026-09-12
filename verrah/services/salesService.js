// ==========================================================
// verrah/services/salesService.js
//
// VERRAH COSMETICS
// SALES / ANALYTICS SERVICE
//
// Each tab has its own date + period.
// Filtering one tab NEVER changes another tab.
//
// Default for every tab:
//   current Nairobi date + month
//
// PACKAGE REVENUE
// ----------------
// Sum of Package.paidAmount
//
// STAFF SALES REVENUE
// -------------------
// Sum of StaffSale.totalAmount
//
// TOTAL REVENUE
// -------------
// Package revenue + StaffSales revenue
//
// PACKAGE PROFIT
// --------------
// Package revenue - package product buying cost
//
// STAFF SALES PROFIT
// ------------------
// StaffSales revenue - StaffSales product buying cost
//
// StaffSales product buying cost is calculated from:
//   Product.buyPrice × StaffSale.products[].qty
//
// StaffSale.products[].price is the SELLING PRICE.
// It must NOT be used as the buying cost.
//
// ==========================================================


const Package =
    require("../models/package");

const StaffSale =
    require("../models/staff-sales");

const Product =
    require("../models/products");

const Stock =
    require("../models/stock");

const User =
    require("../models/user");


const TIME_ZONE =
    "Africa/Nairobi";


const TAB_CONFIG = {

    summary: {
        dateKey:
            "summaryDate",

        periodKey:
            "summaryPeriod"
    },

    products: {
        dateKey:
            "productsDate",

        periodKey:
            "productsPeriod"
    },

    arrears: {
        dateKey:
            "arrearsDate",

        periodKey:
            "arrearsPeriod"
    }

};


// ==========================================================
// CURRENT DATE IN KENYA
// ==========================================================

function getCurrentNairobiDate() {

    return new Intl.DateTimeFormat(
        "en-CA",
        {
            timeZone:
                TIME_ZONE,

            year:
                "numeric",

            month:
                "2-digit",

            day:
                "2-digit"
        }
    ).format(new Date());

}


// ==========================================================
// DATE VALIDATION
// ==========================================================

function isValidDateString(value) {

    return (

        typeof value === "string" &&

        /^\d{4}-\d{2}-\d{2}$/.test(
            value
        ) &&

        !Number.isNaN(
            Date.parse(
                `${value}T00:00:00+03:00`
            )
        )

    );

}


function normalizePeriod(value) {

    return [

        "day",

        "month",

        "year"

    ].includes(value)

        ? value

        : "month";

}


function normalizeDate(value) {

    return isValidDateString(value)

        ? value

        : getCurrentNairobiDate();

}


// ==========================================================
// CONVERT KENYA LOCAL DATE TO UTC
// ==========================================================

function kenyaDateToUtc(
    dateString,
    endOfDay = false
) {

    return new Date(

        `${dateString}T${
            endOfDay
                ? "23:59:59.999"
                : "00:00:00.000"
        }+03:00`

    );

}


// ==========================================================
// DATE RANGE
// ==========================================================

function getDateRange(
    dateString,
    period
) {

    const date =
        normalizeDate(
            dateString
        );

    const mode =
        normalizePeriod(
            period
        );


    const [
        year,
        month,
        day
    ] =
        date
            .split("-")
            .map(Number);


    let startDate;

    let endDate;


    // ------------------------------------------------------
    // DAY
    // ------------------------------------------------------

    if (mode === "day") {

        startDate =
            kenyaDateToUtc(
                date
            );


        const nextDay =
            new Date(
                Date.UTC(
                    year,
                    month - 1,
                    day + 1
                )
            );


        const nextDate =
            nextDay
                .toISOString()
                .slice(0, 10);


        endDate =
            kenyaDateToUtc(
                nextDate
            );

    }


    // ------------------------------------------------------
    // MONTH
    // ------------------------------------------------------

    else if (mode === "month") {

        const monthStart =
            `${year}-${String(month).padStart(2, "0")}-01`;


        let nextYear =
            year;

        let nextMonth =
            month + 1;


        if (nextMonth === 13) {

            nextMonth =
                1;

            nextYear +=
                1;

        }


        const nextMonthStart =
            `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;


        startDate =
            kenyaDateToUtc(
                monthStart
            );

        endDate =
            kenyaDateToUtc(
                nextMonthStart
            );

    }


    // ------------------------------------------------------
    // YEAR
    // ------------------------------------------------------

    else {

        const yearStart =
            `${year}-01-01`;

        const nextYearStart =
            `${year + 1}-01-01`;


        startDate =
            kenyaDateToUtc(
                yearStart
            );

        endDate =
            kenyaDateToUtc(
                nextYearStart
            );

    }


    return {

        startDate,

        endDate,

        date,

        period:
            mode

    };

}


// ==========================================================
// FILTER STATE
// ==========================================================

function getFilterState(
    query,
    tab
) {

    const config =
        TAB_CONFIG[tab];


    const date =
        normalizeDate(
            query[config.dateKey]
        );


    const period =
        normalizePeriod(
            query[config.periodKey]
        );


    const range =
        getDateRange(
            date,
            period
        );


    return {

        date:
            range.date,

        period:
            range.period,

        startDate:
            range.startDate,

        endDate:
            range.endDate

    };

}


// ==========================================================
// FILTER LABEL
// ==========================================================

function getFilterLabel(
    filter
) {

    const periodName = {

        day:
            "Day",

        month:
            "Month",

        year:
            "Year"

    }[filter.period];


    return `${periodName}: ${filter.date}`;

}


// ==========================================================
// SUMMARY
// ==========================================================

async function getSummary(
    filter
) {

    // ======================================================
    // LOAD PACKAGES
    // ======================================================

    const packages =
        await Package.find({

            createdAt: {

                $gte:
                    filter.startDate,

                $lt:
                    filter.endDate

            }

        })
            .select(
                "items totalAmount paidAmount status"
            )
            .lean();


    // ======================================================
    // LOAD STAFF SALES
    // ======================================================

    const staffSales =
        await StaffSale.find({

            createdAt: {

                $gte:
                    filter.startDate,

                $lt:
                    filter.endDate

            }

        })
            .lean();


    // ======================================================
    // PACKAGE VARIABLES
    // ======================================================

    let packageRevenue =
        0;

    let customerArrears =
        0;

    let packageBuyingCost =
        0;


    // ======================================================
    // STAFF SALES VARIABLES
    // ======================================================

    let staffSalesRevenue =
        0;

    let staffSalesBuyingCost =
        0;


    // ======================================================
    // PRODUCT IDS
    //
    // We need Product.buyPrice for BOTH:
    //
    // 1. Package products
    // 2. Staff-sale products
    // ======================================================

    const productIds =
        new Set();


    // ======================================================
    // PROCESS PACKAGES
    // ======================================================

    for (
        const pkg
        of packages
    ) {

        const paidAmount =
            Number(
                pkg.paidAmount || 0
            );


        const totalAmount =
            Number(
                pkg.totalAmount || 0
            );


        // --------------------------------------------------
        // PACKAGE REVENUE
        // --------------------------------------------------

        packageRevenue +=
            paidAmount;


        // --------------------------------------------------
        // CUSTOMER ARREARS
        // --------------------------------------------------

        if (
            pkg.status ===
            "delivered"
        ) {

            customerArrears +=
                Math.max(

                    0,

                    totalAmount -
                    paidAmount

                );

        }


        // --------------------------------------------------
        // COLLECT PACKAGE PRODUCT IDS
        // --------------------------------------------------

        for (
            const item
            of pkg.items || []
        ) {

            if (
                item.productId
            ) {

                productIds.add(
                    String(
                        item.productId
                    )
                );

            }

        }

    }


    // ======================================================
    // PROCESS STAFF SALES
    //
    // Revenue comes from:
    //
    //     StaffSale.totalAmount
    //
    // Cost DOES NOT come from:
    //
    //     StaffSale.products[].price
    //
    // because price is the SELLING PRICE.
    //
    // The actual cost is retrieved from Product.buyPrice.
    // ======================================================

    for (
        const sale
        of staffSales
    ) {

        const totalAmount =
            Number(
                sale.totalAmount || 0
            );


        // --------------------------------------------------
        // STAFF SALES REVENUE
        // --------------------------------------------------

        staffSalesRevenue +=
            totalAmount;


        // --------------------------------------------------
        // COLLECT STAFF-SALE PRODUCT IDS
        // --------------------------------------------------

        for (
            const item
            of sale.products || []
        ) {

            if (
                item.productId
            ) {

                productIds.add(
                    String(
                        item.productId
                    )
                );

            }

        }

    }


    // ======================================================
    // LOAD PRODUCT BUYING PRICES
    //
    // Product.buyPrice is the cost of acquiring the product.
    // ======================================================

    const productMap =
        new Map();


    if (
        productIds.size
    ) {

        const products =
            await Product.find({

                _id: {

                    $in:
                        Array.from(
                            productIds
                        )

                }

            })
                .select(
                    "_id buyPrice"
                )
                .lean();


        for (
            const product
            of products
        ) {

            productMap.set(

                String(
                    product._id
                ),

                Number(
                    product.buyPrice || 0
                )

            );

        }

    }


    // ======================================================
    // CALCULATE PACKAGE BUYING COST
    // ======================================================

    for (
        const pkg
        of packages
    ) {

        for (
            const item
            of pkg.items || []
        ) {

            if (
                !item.productId
            ) continue;


            const buyPrice =
                productMap.get(
                    String(
                        item.productId
                    )
                ) || 0;


            const qty =
                Number(
                    item.qty || 0
                );


            packageBuyingCost +=
                buyPrice * qty;

        }

    }


    // ======================================================
    // CALCULATE STAFF SALES BUYING COST
    //
    // IMPORTANT:
    //
    // StaffSale.products[].price
    // = SELLING PRICE
    //
    // Product.buyPrice
    // = BUYING/COST PRICE
    //
    // Therefore:
    //
    // Staff Sales Cost
    // =
    // Σ(Product.buyPrice × StaffSale.products[].qty)
    // ======================================================

    for (
        const sale
        of staffSales
    ) {

        for (
            const item
            of sale.products || []
        ) {

            if (
                !item.productId
            ) continue;


            const buyPrice =
                productMap.get(
                    String(
                        item.productId
                    )
                ) || 0;


            const qty =
                Number(
                    item.qty || 0
                );


            staffSalesBuyingCost +=
                buyPrice * qty;

        }

    }


    // ======================================================
    // PACKAGE PROFIT
    // ======================================================

    const packageProfit =
        packageRevenue -
        packageBuyingCost;


    // ======================================================
    // STAFF SALES PROFIT
    //
    // CORRECT:
    //
    // StaffSales revenue
    // -
    // Product buying cost
    // ======================================================

    const staffSalesProfit =
        staffSalesRevenue -
        staffSalesBuyingCost;


    // ======================================================
    // TOTAL REVENUE
    // ======================================================

    const totalRevenue =
        packageRevenue +
        staffSalesRevenue;


    // ======================================================
    // TOTAL PROFIT
    // ======================================================

    const profit =
        packageProfit +
        staffSalesProfit;


    // ======================================================
    // RETURN SUMMARY
    // ======================================================

    return {

        // --------------------------------------------------
        // PACKAGE
        // --------------------------------------------------

        packageRevenue,

        packageBuyingCost,

        packageProfit,


        // --------------------------------------------------
        // STAFF SALES
        // --------------------------------------------------

        staffSalesRevenue,

        staffSalesBuyingCost,

        staffSalesProfit,

        staffSales,


        // --------------------------------------------------
        // COMBINED
        // --------------------------------------------------

        totalRevenue,

        profit,


        // --------------------------------------------------
        // ARREARS
        // --------------------------------------------------

        customerArrears

    };

}


// ==========================================================
// PRODUCT ANALYTICS
// ==========================================================

async function getProductAnalytics(
    filter
) {

    const products =
        await Product.find({

            isActive:
                true

        })
            .select(
                "_id name subcategory units buyPrice stock"
            )
            .lean();


    const stockRecords =
        await Stock.find({

            isActive:
                true

        })
            .select(
                "subcategory units"
            )
            .lean();


    // ------------------------------------------------------
    // STOCK IS MATCHED BY SUBCATEGORY
    // ------------------------------------------------------

    const stockBySubcategory =
        new Map();


    for (
        const stock
        of stockRecords
    ) {

        const key =
            String(
                stock.subcategory || ""
            )
                .trim()
                .toLowerCase();


        if (!key) continue;


        const existing =
            stockBySubcategory.get(
                key
            ) || 0;


        stockBySubcategory.set(

            key,

            existing +
            Number(
                stock.units || 0
            )

        );

    }


    // ------------------------------------------------------
    // DELIVERED PACKAGE SALES
    // ------------------------------------------------------

    const deliveredPackages =
        await Package.find({

            status:
                "delivered",

            createdAt: {

                $gte:
                    filter.startDate,

                $lt:
                    filter.endDate

            }

        })
            .select(
                "items"
            )
            .lean();


    const salesByProduct =
        new Map();


    for (
        const pkg
        of deliveredPackages
    ) {

        for (
            const item
            of pkg.items || []
        ) {

            if (
                !item.productId
            ) continue;


            const key =
                String(
                    item.productId
                );


            salesByProduct.set(

                key,

                (
                    salesByProduct.get(
                        key
                    ) || 0
                ) +

                Number(
                    item.qty || 0
                )

            );

        }

    }


    // ------------------------------------------------------
    // RETURN PRODUCT ANALYTICS
    // ------------------------------------------------------

    return products

        .map(
            product => {

                const subcategory =
                    String(
                        product.subcategory || ""
                    )
                        .trim()
                        .toLowerCase();


                return {

                    _id:
                        product._id,

                    name:
                        product.name,

                    stockAvailable:
                        stockBySubcategory.get(
                            subcategory
                        ) || 0,

                    marketAvailable:
                        Number(
                            product.units || 0
                        ),

                    sales:
                        salesByProduct.get(
                            String(
                                product._id
                            )
                        ) || 0

                };

            }
        )

        .sort(
            (a, b) =>
                String(
                    a.name
                ).localeCompare(
                    String(
                        b.name
                    )
                )
        );

}


// ==========================================================
// CUSTOMER ARREARS
// ==========================================================

async function getCustomerArrears(
    filter
) {

    const packages =
        await Package.find({

            status:
                "delivered",

            createdAt: {

                $gte:
                    filter.startDate,

                $lt:
                    filter.endDate

            }

        })
            .select(
                "_id clientId phoneNumber totalAmount paidAmount"
            )
            .lean();


    const arrearsPackages =
        packages

            .map(
                pkg => ({

                    ...pkg,

                    arrears:
                        Math.max(

                            0,

                            Number(
                                pkg.totalAmount || 0
                            ) -

                            Number(
                                pkg.paidAmount || 0
                            )

                        )

                })
            )

            .filter(
                pkg =>
                    pkg.arrears > 0
            );


    if (
        !arrearsPackages.length
    ) {

        return [];

    }


    // ------------------------------------------------------
    // RESOLVE CLIENT NAMES
    // ------------------------------------------------------

    const clientIds = [

        ...new Set(

            arrearsPackages

                .map(
                    pkg =>
                        String(
                            pkg.clientId || ""
                        )
                )

                .filter(Boolean)

        )

    ];


    const users =
        clientIds.length

            ? await User.find({

                _id: {

                    $in:
                        clientIds

                }

            })
                .select(
                    "_id name"
                )
                .lean()

            : [];


    const userMap =
        new Map(

            users.map(
                user => [

                    String(
                        user._id
                    ),

                    user.name

                ]
            )

        );


    return arrearsPackages

        .map(
            pkg => ({

                _id:
                    pkg._id,

                clientName:
                    userMap.get(
                        String(
                            pkg.clientId
                        )
                    ) ||
                    "Unknown Client",

                phoneNumber:
                    pkg.phoneNumber ||
                    "",

                packageName:
                    String(
                        pkg._id
                    ),

                arrears:
                    pkg.arrears

            })
        )

        .sort(
            (a, b) =>
                b.arrears -
                a.arrears
        );

}


// ==========================================================
// FULL PAGE DATA
// ==========================================================

async function getSalesPageData(
    query = {}
) {

    const allowedTabs = [

        "summary",

        "products",

        "arrears"

    ];


    const activeTab =
        allowedTabs.includes(
            query.tab
        )

            ? query.tab

            : "summary";


    /*
     * IMPORTANT:
     *
     * Every tab gets its OWN filter state.
     *
     * We deliberately do NOT reuse one date/period
     * across all three tabs.
     */

    const summaryFilter =
        getFilterState(
            query,
            "summary"
        );


    const productsFilter =
        getFilterState(
            query,
            "products"
        );


    const arrearsFilter =
        getFilterState(
            query,
            "arrears"
        );


    const [

        summary,

        productAnalytics,

        arrearsPackages

    ] = await Promise.all([

        getSummary(
            summaryFilter
        ),

        getProductAnalytics(
            productsFilter
        ),

        getCustomerArrears(
            arrearsFilter
        )

    ]);


    const activeFilter = {

        summary:
            summaryFilter,

        products:
            productsFilter,

        arrears:
            arrearsFilter

    }[activeTab];


    // ======================================================
    // PRESERVE TAB-SPECIFIC FILTERS
    // ======================================================

    const params =
        new URLSearchParams();


    if (
        query.summaryDate
    ) {

        params.set(

            "summaryDate",

            summaryFilter.date

        );

    }


    if (
        query.summaryPeriod
    ) {

        params.set(

            "summaryPeriod",

            summaryFilter.period

        );

    }


    if (
        query.productsDate
    ) {

        params.set(

            "productsDate",

            productsFilter.date

        );

    }


    if (
        query.productsPeriod
    ) {

        params.set(

            "productsPeriod",

            productsFilter.period

        );

    }


    if (
        query.arrearsDate
    ) {

        params.set(

            "arrearsDate",

            arrearsFilter.date

        );

    }


    if (
        query.arrearsPeriod
    ) {

        params.set(

            "arrearsPeriod",

            arrearsFilter.period

        );

    }


    // ======================================================
    // RETURN DATA TO CONTROLLER / VIEW
    // ======================================================

    return {

        activeTab,


        // --------------------------------------------------
        // TOTAL REVENUE
        // --------------------------------------------------

        totalRevenue:
            summary.totalRevenue,


        // --------------------------------------------------
        // REVENUE BREAKDOWN
        // --------------------------------------------------

        packageRevenue:
            summary.packageRevenue,

        staffSalesRevenue:
            summary.staffSalesRevenue,


        // --------------------------------------------------
        // BUYING COST BREAKDOWN
        // --------------------------------------------------

        packageBuyingCost:
            summary.packageBuyingCost,

        staffSalesBuyingCost:
            summary.staffSalesBuyingCost,


        // --------------------------------------------------
        // PROFIT
        // --------------------------------------------------

        profit:
            summary.profit,

        packageProfit:
            summary.packageProfit,

        staffSalesProfit:
            summary.staffSalesProfit,


        // --------------------------------------------------
        // STAFF SALES DOCUMENTS
        //
        // Full StaffSale documents are passed to the view.
        // --------------------------------------------------

        staffSales:
            summary.staffSales,


        // --------------------------------------------------
        // CUSTOMER ARREARS
        // --------------------------------------------------

        customerArrears:
            summary.customerArrears,


        // --------------------------------------------------
        // PRODUCT ANALYTICS
        // --------------------------------------------------

        productAnalytics,


        // --------------------------------------------------
        // ARREARS PACKAGES
        // --------------------------------------------------

        arrearsPackages,


        // --------------------------------------------------
        // ACTIVE FILTER
        // --------------------------------------------------

        activeFilterDate:
            activeFilter.date,

        activeFilterPeriod:
            activeFilter.period,

        filterLabel:
            getFilterLabel(
                activeFilter
            ),


        // --------------------------------------------------
        // QUERY SUFFIX
        // --------------------------------------------------

        salesQuerySuffix:

            params.toString()

                ? `&${params.toString()}`

                : ""

    };

}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    getSalesPageData,

    getDateRange,

    getCurrentNairobiDate

};