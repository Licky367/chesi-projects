// ==========================================================
// verrah/services/salesService.js
//
// VERRAH COSMETICS
// SALES / ANALYTICS SERVICE
//
// TABS:
//   1. summary
//   2. staff-sales
//   3. products
//   4. arrears
//
// EACH TAB HAS ITS OWN DATE + PERIOD FILTER.
//
// Default:
//   Current Nairobi date + month
//
// IMPORTANT:
// Existing EJS partials expect top-level variables such as:
//   totalRevenue
//   packageRevenue
//   staffSalesRevenue
//   profit
//   packageProfit
//   staffSalesProfit
//   customerArrears
//   staffSales
//   productAnalytics
//   arrearsPackages
//   filterLabel
//   activeFilterDate
//   activeFilterPeriod
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


// ==========================================================
// TAB CONFIGURATION
// ==========================================================

const TAB_CONFIG = {

    summary: {

        dateKey:
            "summaryDate",

        periodKey:
            "summaryPeriod"

    },


    "staff-sales": {

        dateKey:
            "staffSalesDate",

        periodKey:
            "staffSalesPeriod"

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


// ==========================================================
// PERIOD NORMALIZATION
// ==========================================================

function normalizePeriod(value) {

    return [

        "day",

        "month",

        "year"

    ].includes(value)

        ? value

        : "month";

}


// ==========================================================
// DATE NORMALIZATION
// ==========================================================

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
    query = {},
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
    //
    // SUMMARY STAFF SALES USE SUMMARY FILTER.
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

            .populate({

                path:
                    "soldBy",

                select:
                    "name"

            })

            .sort({

                createdAt:
                    -1

            })

            .lean();


    // ======================================================
    // VARIABLES
    // ======================================================

    let packageRevenue =
        0;


    let customerArrears =
        0;


    let packageBuyingCost =
        0;


    let staffSalesRevenue =
        0;


    let staffSalesBuyingCost =
        0;


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
        // PACKAGE PRODUCT IDS
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
    // ======================================================

    for (
        const sale
        of staffSales
    ) {

        // --------------------------------------------------
        // REVENUE
        // --------------------------------------------------

        staffSalesRevenue +=
            Number(
                sale.totalAmount || 0
            );


        // --------------------------------------------------
        // PRODUCT IDS
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
    // LOAD BUYING PRICES
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
    // PACKAGE BUYING COST
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
            ) {

                continue;

            }


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
    // STAFF SALES BUYING COST
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
            ) {

                continue;

            }


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
    // PROFITS
    // ======================================================

    const packageProfit =
        packageRevenue -
        packageBuyingCost;


    const staffSalesProfit =
        staffSalesRevenue -
        staffSalesBuyingCost;


    const totalRevenue =
        packageRevenue +
        staffSalesRevenue;


    const profit =
        packageProfit +
        staffSalesProfit;


    // ======================================================
    // RETURN
    // ======================================================

    return {

        packageRevenue,

        packageBuyingCost,

        packageProfit,


        staffSalesRevenue,

        staffSalesBuyingCost,

        staffSalesProfit,


        totalRevenue,

        profit,


        customerArrears,


        staffSales

    };

}


// ==========================================================
// STAFF SALES
//
// THIS IS FOR THE STAFF SALES / SALES REPORT TAB.
//
// IMPORTANT:
//
// It DOES NOT use summaryFilter.
//
// It uses:
//   staffSalesDate
//   staffSalesPeriod
//
// Therefore changing the Staff Sales filter does not
// change Summary, Products or Arrears.
// ==========================================================

async function getStaffSales(
    filter
) {

    return StaffSale.find({

        createdAt: {

            $gte:
                filter.startDate,

            $lt:
                filter.endDate

        }

    })

        .populate({

            path:
                "soldBy",

            select:
                "name"

        })

        .sort({

            createdAt:
                -1

        })

        .lean();

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
    // STOCK BY SUBCATEGORY
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


        if (!key) {

            continue;

        }


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
    // DELIVERED PACKAGES IN PRODUCT FILTER RANGE
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
            ) {

                continue;

            }


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
    // RESULT
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
    // CLIENT IDS
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


    // ------------------------------------------------------
    // CLIENTS
    // ------------------------------------------------------

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


    // ------------------------------------------------------
    // RESULT
    // ------------------------------------------------------

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
// SALES PAGE DATA
//
// FOUR INDEPENDENT FILTERS:
//
// summary:
//   summaryDate
//   summaryPeriod
//
// staff-sales:
//   staffSalesDate
//   staffSalesPeriod
//
// products:
//   productsDate
//   productsPeriod
//
// arrears:
//   arrearsDate
//   arrearsPeriod
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


    // ======================================================
    // ACTIVE TAB
    // ======================================================

    const activeTab =
        allowedTabs.includes(
            query.tab
        )

            ? query.tab

            : "summary";


    // ======================================================
    // FILTERS
    // ======================================================

    const summaryFilter =
        getFilterState(
            query,
            "summary"
        );


    const staffSalesFilter =
        getFilterState(
            query,
            "staff-sales"
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


    // ======================================================
    // LOAD TAB DATA
    // ======================================================

    const [

        summary,

        staffSales,

        productAnalytics,

        arrearsPackages

    ] = await Promise.all([

        // --------------------------------------------------
        // SUMMARY
        // --------------------------------------------------

        getSummary(
            summaryFilter
        ),


        // --------------------------------------------------
        // STAFF SALES
        //
        // USES STAFF SALES FILTER ONLY
        // --------------------------------------------------

        getStaffSales(
            staffSalesFilter
        ),


        // --------------------------------------------------
        // PRODUCTS
        //
        // USES PRODUCTS FILTER ONLY
        // --------------------------------------------------

        getProductAnalytics(
            productsFilter
        ),


        // --------------------------------------------------
        // ARREARS
        //
        // USES ARREARS FILTER ONLY
        // --------------------------------------------------

        getCustomerArrears(
            arrearsFilter
        )

    ]);


    // ======================================================
    // ACTIVE FILTER
    // ======================================================

    let activeFilter;


    if (
        activeTab === "summary"
    ) {

        activeFilter =
            summaryFilter;

    }

    else if (
        activeTab === "staff-sales"
    ) {

        activeFilter =
            staffSalesFilter;

    }

    else if (
        activeTab === "products"
    ) {

        activeFilter =
            productsFilter;

    }

    else {

        activeFilter =
            arrearsFilter;

    }


    // ======================================================
    // QUERY PARAMETERS
    //
    // Every tab retains its own filter.
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
    // RETURN
    //
    // THESE NAMES MUST MATCH THE EXISTING EJS PARTIALS.
    // ======================================================

    return {

        // --------------------------------------------------
        // TAB
        // --------------------------------------------------

        activeTab,


        // --------------------------------------------------
        // ACTIVE FILTER
        // --------------------------------------------------

        activeFilter,

        activeFilterDate:
            activeFilter.date,

        activeFilterPeriod:
            activeFilter.period,

        filterLabel:
            getFilterLabel(
                activeFilter
            ),


        // --------------------------------------------------
        // SUMMARY VALUES
        // --------------------------------------------------

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

        packageProfit:
            summary.packageProfit,

        staffSalesProfit:
            summary.staffSalesProfit,


        customerArrears:
            summary.customerArrears,


        // --------------------------------------------------
        // STAFF SALES
        //
        // IMPORTANT:
        // This is now from staffSalesFilter, NOT
        // summaryFilter.
        // --------------------------------------------------

        staffSales,


        // --------------------------------------------------
        // PRODUCT ANALYTICS
        // --------------------------------------------------

        productAnalytics,


        // --------------------------------------------------
        // ARREARS
        // --------------------------------------------------

        arrearsPackages,


        // --------------------------------------------------
        // FILTER OBJECTS
        //
        // Kept available for any existing partials.
        // --------------------------------------------------

        summaryFilter,

        staffSalesFilter,

        productsFilter,

        arrearsFilter,


        // --------------------------------------------------
        // FILTER LABELS
        // --------------------------------------------------

        summaryFilterLabel:
            getFilterLabel(
                summaryFilter
            ),

        staffSalesFilterLabel:
            getFilterLabel(
                staffSalesFilter
            ),

        productsFilterLabel:
            getFilterLabel(
                productsFilter
            ),

        arrearsFilterLabel:
            getFilterLabel(
                arrearsFilter
            ),


        // --------------------------------------------------
        // NAVIGATION QUERY
        // --------------------------------------------------

        salesQuerySuffix

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