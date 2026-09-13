const Package = require("../models/package");
const StaffSale = require("../models/staff-sales");
const Product = require("../models/products");
const Stock = require("../models/stock");
const User = require("../models/user");


/* ==========================================================
   SALES SERVICE
   VERRAH COSMETICS

   Tabs:
   1. summary
   2. staff-sales
   3. products
   4. arrears

   IMPORTANT:
   Every tab has its OWN date + period filter.
========================================================== */


/* ==========================================================
   TIME ZONE
========================================================== */

const TIME_ZONE = "Africa/Nairobi";


/* ==========================================================
   TAB CONFIGURATION
========================================================== */

const TAB_CONFIG = {
    summary: {
        dateKey: "summaryDate",
        periodKey: "summaryPeriod"
    },

    "staff-sales": {
        dateKey: "staffSalesDate",
        periodKey: "staffSalesPeriod"
    },

    products: {
        dateKey: "productsDate",
        periodKey: "productsPeriod"
    },

    arrears: {
        dateKey: "arrearsDate",
        periodKey: "arrearsPeriod"
    }
};


/* ==========================================================
   CURRENT NAIROBI DATE
========================================================== */

function getCurrentNairobiDate() {
    const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    });

    return formatter.format(new Date());
}


/* ==========================================================
   DATE VALIDATION
========================================================== */

function isValidDateString(value) {
    if (typeof value !== "string") {
        return false;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const date = new Date(`${value}T00:00:00Z`);

    return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
    );
}


/* ==========================================================
   PERIOD NORMALIZATION
========================================================== */

function normalizePeriod(period) {
    const allowedPeriods = [
        "day",
        "week",
        "month",
        "year"
    ];

    return allowedPeriods.includes(period)
        ? period
        : "month";
}


/* ==========================================================
   DATE NORMALIZATION
========================================================== */

function normalizeDate(date) {
    if (isValidDateString(date)) {
        return date;
    }

    return getCurrentNairobiDate();
}


/* ==========================================================
   NAIROBI DATE -> UTC
========================================================== */

function kenyaDateToUtc(dateString) {
    return new Date(`${dateString}T00:00:00+03:00`);
}


/* ==========================================================
   GET DATE RANGE
========================================================== */

function getDateRange(dateString, period) {
    const date = normalizeDate(dateString);
    const normalizedPeriod = normalizePeriod(period);

    const start = kenyaDateToUtc(date);

    let end;

    if (normalizedPeriod === "day") {
        end = new Date(start);
        end.setUTCDate(end.getUTCDate() + 1);
    }

    else if (normalizedPeriod === "week") {
        end = new Date(start);
        end.setUTCDate(end.getUTCDate() + 7);
    }

    else if (normalizedPeriod === "year") {
        end = new Date(start);
        end.setUTCFullYear(end.getUTCFullYear() + 1);
    }

    else {
        // month
        end = new Date(start);
        end.setUTCMonth(end.getUTCMonth() + 1);
    }

    return {
        startDate: start,
        endDate: end
    };
}


/* ==========================================================
   GET FILTER STATE
========================================================== */

function getFilterState(query = {}, tab) {
    const config = TAB_CONFIG[tab] || TAB_CONFIG.summary;

    const date = normalizeDate(query[config.dateKey]);
    const period = normalizePeriod(query[config.periodKey]);

    const range = getDateRange(date, period);

    return {
        tab,
        date,
        period,
        startDate: range.startDate,
        endDate: range.endDate
    };
}


/* ==========================================================
   FILTER LABEL
========================================================== */

function getFilterLabel(filter) {
    if (!filter) {
        return "";
    }

    const date = filter.date;
    const period = filter.period;

    if (period === "day") {
        return `Day: ${date}`;
    }

    if (period === "week") {
        return `Week starting: ${date}`;
    }

    if (period === "year") {
        return `Year starting: ${date}`;
    }

    return `Month: ${date}`;
}


/* ==========================================================
   SAFE NUMBER
========================================================== */

function numberValue(value) {
    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : 0;
}


/* ==========================================================
   PRODUCT MAP
========================================================== */

async function getProductMap(productIds) {
    if (!productIds || productIds.length === 0) {
        return new Map();
    }

    const uniqueIds = [
        ...new Set(
            productIds
                .filter(Boolean)
                .map(id => id.toString())
        )
    ];

    if (uniqueIds.length === 0) {
        return new Map();
    }

    const products = await Product.find({
        _id: {
            $in: uniqueIds
        }
    })
        .select("_id name buyPrice sellingPrice")
        .lean();

    return new Map(
        products.map(product => [
            product._id.toString(),
            product
        ])
    );
}


/* ==========================================================
   GET STAFF SALES
   ----------------------------------------------------------
   THIS IS THE IMPORTANT PART FOR THE STAFF SALES TAB.

   It uses staffSalesFilter only.
========================================================== */

async function getStaffSales(filter) {
    const sales = await StaffSale.find({
        createdAt: {
            $gte: filter.startDate,
            $lt: filter.endDate
        }
    })
        .populate({
            path: "soldBy",
            select: "name"
        })
        .sort({
            createdAt: -1
        })
        .lean();

    return sales;
}


/* ==========================================================
   GET SUMMARY
   ----------------------------------------------------------
   Summary uses summaryFilter.

   Staff sales here are included in OVERALL revenue/profit,
   because they are sales made during the summary period.
========================================================== */

async function getSummary(filter) {
    const packageFilter = {
        createdAt: {
            $gte: filter.startDate,
            $lt: filter.endDate
        }
    };

    const staffSaleFilter = {
        createdAt: {
            $gte: filter.startDate,
            $lt: filter.endDate
        }
    };


    /* --------------------------------------------------------
       PACKAGES
    -------------------------------------------------------- */

    const packages = await Package.find(packageFilter)
        .select(
            "items totalAmount paidAmount status"
        )
        .lean();


    /* --------------------------------------------------------
       STAFF SALES
    -------------------------------------------------------- */

    const staffSales = await StaffSale.find(staffSaleFilter)
        .populate({
            path: "soldBy",
            select: "name"
        })
        .sort({
            createdAt: -1
        })
        .lean();


    /* --------------------------------------------------------
       PACKAGE REVENUE
    -------------------------------------------------------- */

    let packageRevenue = 0;
    let customerArrears = 0;

    for (const packageItem of packages) {
        packageRevenue += numberValue(
            packageItem.paidAmount
        );

        if (
            String(packageItem.status || "").toLowerCase() ===
            "delivered"
        ) {
            const totalAmount = numberValue(
                packageItem.totalAmount
            );

            const paidAmount = numberValue(
                packageItem.paidAmount
            );

            const arrears = Math.max(
                totalAmount - paidAmount,
                0
            );

            customerArrears += arrears;
        }
    }


    /* --------------------------------------------------------
       COLLECT PRODUCT IDS
    -------------------------------------------------------- */

    const productIds = [];


    for (const packageItem of packages) {
        if (!Array.isArray(packageItem.items)) {
            continue;
        }

        for (const item of packageItem.items) {
            if (item.productId) {
                productIds.push(item.productId);
            }

            else if (item.product) {
                productIds.push(item.product);
            }
        }
    }


    for (const sale of staffSales) {
        if (!Array.isArray(sale.products)) {
            continue;
        }

        for (const item of sale.products) {
            if (item.productId) {
                productIds.push(item.productId);
            }
        }
    }


    /* --------------------------------------------------------
       PRODUCTS
    -------------------------------------------------------- */

    const productMap = await getProductMap(productIds);


    /* --------------------------------------------------------
       PACKAGE BUYING COST
    -------------------------------------------------------- */

    let packageBuyingCost = 0;


    for (const packageItem of packages) {
        if (!Array.isArray(packageItem.items)) {
            continue;
        }

        for (const item of packageItem.items) {
            const productId =
                item.productId ||
                item.product;

            if (!productId) {
                continue;
            }

            const product =
                productMap.get(productId.toString());

            const quantity =
                numberValue(
                    item.qty ??
                    item.quantity ??
                    item.units ??
                    0
                );

            if (product) {
                packageBuyingCost +=
                    numberValue(product.buyPrice) *
                    quantity;
            }
        }
    }


    /* --------------------------------------------------------
       STAFF SALES REVENUE + BUYING COST
    -------------------------------------------------------- */

    let staffSalesRevenue = 0;
    let staffSalesBuyingCost = 0;


    for (const sale of staffSales) {
        staffSalesRevenue += numberValue(
            sale.totalAmount
        );


        if (!Array.isArray(sale.products)) {
            continue;
        }


        for (const item of sale.products) {
            const productId = item.productId;

            if (!productId) {
                continue;
            }

            const product =
                productMap.get(productId.toString());

            const quantity =
                numberValue(item.qty);


            if (product) {
                staffSalesBuyingCost +=
                    numberValue(product.buyPrice) *
                    quantity;
            }
        }
    }


    /* --------------------------------------------------------
       PROFITS
    -------------------------------------------------------- */

    const packageProfit =
        packageRevenue -
        packageBuyingCost;

    const staffSalesProfit =
        staffSalesRevenue -
        staffSalesBuyingCost;

    const totalRevenue =
        packageRevenue +
        staffSalesRevenue;

    const totalBuyingCost =
        packageBuyingCost +
        staffSalesBuyingCost;

    const profit =
        totalRevenue -
        totalBuyingCost;


    /* --------------------------------------------------------
       RETURN
    -------------------------------------------------------- */

    return {
        packages,

        staffSales,

        packageRevenue,

        staffSalesRevenue,

        totalRevenue,

        packageBuyingCost,

        staffSalesBuyingCost,

        totalBuyingCost,

        packageProfit,

        staffSalesProfit,

        profit,

        customerArrears
    };
}


/* ==========================================================
   PRODUCT ANALYTICS
========================================================== */

async function getProductAnalytics(filter) {
    const packageFilter = {
        createdAt: {
            $gte: filter.startDate,
            $lt: filter.endDate
        },

        status: "delivered"
    };


    const packages = await Package.find(packageFilter)
        .select(
            "items totalAmount paidAmount status"
        )
        .lean();


    const products = await Product.find({})
        .select(
            "_id name image category subcategory buyPrice sellingPrice units"
        )
        .lean();


    const salesByProduct = new Map();


    for (const packageItem of packages) {
        if (!Array.isArray(packageItem.items)) {
            continue;
        }


        for (const item of packageItem.items) {
            const productId =
                item.productId ||
                item.product;

            if (!productId) {
                continue;
            }


            const key = productId.toString();


            if (!salesByProduct.has(key)) {
                salesByProduct.set(key, {
                    quantity: 0,
                    revenue: 0
                });
            }


            const record =
                salesByProduct.get(key);


            const quantity =
                numberValue(
                    item.qty ??
                    item.quantity ??
                    item.units ??
                    0
                );


            const itemTotal =
                numberValue(
                    item.total ??
                    item.amount ??
                    (
                        numberValue(item.price) *
                        quantity
                    )
                );


            record.quantity += quantity;
            record.revenue += itemTotal;
        }
    }


    const analytics = products.map(product => {
        const record =
            salesByProduct.get(
                product._id.toString()
            ) || {
                quantity: 0,
                revenue: 0
            };


        const buyPrice =
            numberValue(product.buyPrice);


        const buyingCost =
            buyPrice *
            record.quantity;


        const profit =
            record.revenue -
            buyingCost;


        return {
            ...product,

            quantitySold: record.quantity,

            revenue: record.revenue,

            buyingCost,

            profit
        };
    });


    return analytics;
}


/* ==========================================================
   CUSTOMER ARREARS
========================================================== */

async function getCustomerArrears(filter) {
    const packages = await Package.find({
        createdAt: {
            $gte: filter.startDate,
            $lt: filter.endDate
        },

        status: "delivered"
    })
        .lean();


    return packages.filter(packageItem => {
        const totalAmount =
            numberValue(
                packageItem.totalAmount
            );

        const paidAmount =
            numberValue(
                packageItem.paidAmount
            );

        return (
            totalAmount -
            paidAmount
        ) > 0;
    });
}


/* ==========================================================
   SALES PAGE DATA
   ----------------------------------------------------------
   FOUR COMPLETELY INDEPENDENT FILTERS.
========================================================== */

async function getSalesPageData(query = {}) {

    const allowedTabs = [
        "summary",
        "staff-sales",
        "products",
        "arrears"
    ];


    /* --------------------------------------------------------
       ACTIVE TAB
    -------------------------------------------------------- */

    const activeTab =
        allowedTabs.includes(query.tab)
            ? query.tab
            : "summary";


    /* --------------------------------------------------------
       FOUR INDEPENDENT FILTER STATES
    -------------------------------------------------------- */

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


    /* --------------------------------------------------------
       LOAD DATA

       IMPORTANT:

       - Summary -> summaryFilter
       - Staff Sales -> staffSalesFilter
       - Products -> productsFilter
       - Arrears -> arrearsFilter
    -------------------------------------------------------- */

    const [
        summary,
        staffSales,
        productAnalytics,
        arrearsPackages
    ] = await Promise.all([
        getSummary(summaryFilter),

        getStaffSales(staffSalesFilter),

        getProductAnalytics(productsFilter),

        getCustomerArrears(arrearsFilter)
    ]);


    /* --------------------------------------------------------
       ACTIVE FILTER
    -------------------------------------------------------- */

    const activeFilter = {
        summary: summaryFilter,

        "staff-sales": staffSalesFilter,

        products: productsFilter,

        arrears: arrearsFilter
    }[activeTab];


    /* --------------------------------------------------------
       QUERY SUFFIX
       --------------------------------------------------------
       Preserve EACH tab's filters when switching tabs.
    -------------------------------------------------------- */

    const params = new URLSearchParams();


    /* Summary */

    if (summaryFilter.date) {
        params.set(
            "summaryDate",
            summaryFilter.date
        );
    }

    if (summaryFilter.period) {
        params.set(
            "summaryPeriod",
            summaryFilter.period
        );
    }


    /* Staff Sales */

    if (staffSalesFilter.date) {
        params.set(
            "staffSalesDate",
            staffSalesFilter.date
        );
    }

    if (staffSalesFilter.period) {
        params.set(
            "staffSalesPeriod",
            staffSalesFilter.period
        );
    }


    /* Products */

    if (productsFilter.date) {
        params.set(
            "productsDate",
            productsFilter.date
        );
    }

    if (productsFilter.period) {
        params.set(
            "productsPeriod",
            productsFilter.period
        );
    }


    /* Arrears */

    if (arrearsFilter.date) {
        params.set(
            "arrearsDate",
            arrearsFilter.date
        );
    }

    if (arrearsFilter.period) {
        params.set(
            "arrearsPeriod",
            arrearsFilter.period
        );
    }


    const salesQuerySuffix =
        params.toString()
            ? `&${params.toString()}`
            : "";


    /* --------------------------------------------------------
       RETURN EVERYTHING REQUIRED BY SALES.EJS
    -------------------------------------------------------- */

    return {
        activeTab,

        activeFilter,

        summaryFilter,

        staffSalesFilter,

        productsFilter,

        arrearsFilter,


        summary,

        staffSales,

        productAnalytics,

        arrearsPackages,


        salesQuerySuffix,


        /* Convenient labels */

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
            )
    };
}


/* ==========================================================
   EXPORTS
========================================================== */

module.exports = {
    getCurrentNairobiDate,

    isValidDateString,

    normalizePeriod,

    normalizeDate,

    kenyaDateToUtc,

    getDateRange,

    getFilterState,

    getFilterLabel,

    getStaffSales,

    getSummary,

    getProductAnalytics,

    getCustomerArrears,

    getSalesPageData
};