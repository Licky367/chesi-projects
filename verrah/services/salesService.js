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
// Date filtering is based on Package.createdAt because the
// Package model uses Mongoose timestamps.
// ==========================================================

const Package = require("../models/package");
const Product = require("../models/products");
const Stock = require("../models/stock");
const User = require("../models/user");

const TIME_ZONE = "Africa/Nairobi";

const TAB_CONFIG = {
    summary: {
        dateKey: "summaryDate",
        periodKey: "summaryPeriod"
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


// ==========================================================
// CURRENT DATE IN KENYA
// ==========================================================

function getCurrentNairobiDate() {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).format(new Date());
}


// ==========================================================
// DATE VALIDATION
// ==========================================================

function isValidDateString(value) {
    return (
        typeof value === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(value) &&
        !Number.isNaN(Date.parse(`${value}T00:00:00+03:00`))
    );
}

function normalizePeriod(value) {
    return ["day", "month", "year"].includes(value)
        ? value
        : "month";
}

function normalizeDate(value) {
    return isValidDateString(value)
        ? value
        : getCurrentNairobiDate();
}


// ==========================================================
// CONVERT A KENYA LOCAL DATE TO A UTC DATE
// ==========================================================

function kenyaDateToUtc(dateString, endOfDay = false) {
    return new Date(
        `${dateString}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}+03:00`
    );
}


// ==========================================================
// DATE RANGE
// ==========================================================

function getDateRange(dateString, period) {

    const date = normalizeDate(dateString);
    const mode = normalizePeriod(period);

    const [year, month, day] = date.split("-").map(Number);

    let startDate;
    let endDate;

    if (mode === "day") {

        startDate = kenyaDateToUtc(date);

        const nextDay = new Date(
            Date.UTC(year, month - 1, day + 1)
        );

        const nextDate =
            nextDay.toISOString().slice(0, 10);

        endDate = kenyaDateToUtc(nextDate);

    } else if (mode === "month") {

        const monthStart =
            `${year}-${String(month).padStart(2, "0")}-01`;

        let nextYear = year;
        let nextMonth = month + 1;

        if (nextMonth === 13) {
            nextMonth = 1;
            nextYear += 1;
        }

        const nextMonthStart =
            `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

        startDate = kenyaDateToUtc(monthStart);
        endDate = kenyaDateToUtc(nextMonthStart);

    } else {

        const yearStart = `${year}-01-01`;
        const nextYearStart = `${year + 1}-01-01`;

        startDate = kenyaDateToUtc(yearStart);
        endDate = kenyaDateToUtc(nextYearStart);
    }

    return {
        startDate,
        endDate,
        date,
        period: mode
    };
}


// ==========================================================
// FILTER STATE
// ==========================================================

function getFilterState(query, tab) {

    const config = TAB_CONFIG[tab];

    const date = normalizeDate(
        query[config.dateKey]
    );

    const period = normalizePeriod(
        query[config.periodKey]
    );

    const range = getDateRange(date, period);

    return {
        date: range.date,
        period: range.period,
        startDate: range.startDate,
        endDate: range.endDate
    };
}


// ==========================================================
// FILTER LABEL
// ==========================================================

function getFilterLabel(filter) {

    const periodName = {
        day: "Day",
        month: "Month",
        year: "Year"
    }[filter.period];

    return `${periodName}: ${filter.date}`;
}


// ==========================================================
// SUMMARY
// ==========================================================

async function getSummary(filter) {

    const packages = await Package.find({
        createdAt: {
            $gte: filter.startDate,
            $lt: filter.endDate
        }
    })
        .select(
            "items totalAmount paidAmount status"
        )
        .lean();

    let totalRevenue = 0;
    let customerArrears = 0;
    let totalBuyingCost = 0;

    const productIds = new Set();

    for (const pkg of packages) {

        const paidAmount =
            Number(pkg.paidAmount || 0);

        const totalAmount =
            Number(pkg.totalAmount || 0);

        totalRevenue += paidAmount;

        if (pkg.status === "delivered") {

            customerArrears += Math.max(
                0,
                totalAmount - paidAmount
            );
        }

        for (const item of pkg.items || []) {

            if (item.productId) {
                productIds.add(
                    String(item.productId)
                );
            }
        }
    }


    // ------------------------------------------------------
    // BUYING COST
    //
    // Package stores productId + qty.
    // Product stores the current buyPrice.
    // ------------------------------------------------------

    if (productIds.size) {

        const products = await Product.find({
            _id: {
                $in: Array.from(productIds)
            }
        })
            .select("_id buyPrice")
            .lean();

        const productMap = new Map(
            products.map(product => [
                String(product._id),
                Number(product.buyPrice || 0)
            ])
        );

        for (const pkg of packages) {

            for (const item of pkg.items || []) {

                const buyPrice =
                    productMap.get(
                        String(item.productId)
                    ) || 0;

                const qty =
                    Number(item.qty || 0);

                totalBuyingCost +=
                    buyPrice * qty;
            }
        }
    }


    return {
        totalRevenue,
        customerArrears,
        profit: totalRevenue - totalBuyingCost
    };
}


// ==========================================================
// PRODUCT ANALYTICS
// ==========================================================

async function getProductAnalytics(filter) {

    const products = await Product.find({
        isActive: true
    })
        .select(
            "_id name subcategory units buyPrice stock"
        )
        .lean();

    const stockRecords = await Stock.find({
        isActive: true
    })
        .select("subcategory units")
        .lean();


    // ------------------------------------------------------
    // STOCK IS MATCHED BY SUBCATEGORY
    // ------------------------------------------------------

    const stockBySubcategory = new Map();

    for (const stock of stockRecords) {

        const key =
            String(stock.subcategory || "")
                .trim()
                .toLowerCase();

        if (!key) continue;

        const existing =
            stockBySubcategory.get(key) || 0;

        stockBySubcategory.set(
            key,
            existing + Number(stock.units || 0)
        );
    }


    // ------------------------------------------------------
    // DELIVERED PACKAGE SALES
    // ------------------------------------------------------

    const deliveredPackages = await Package.find({
        status: "delivered",
        createdAt: {
            $gte: filter.startDate,
            $lt: filter.endDate
        }
    })
        .select("items")
        .lean();

    const salesByProduct = new Map();

    for (const pkg of deliveredPackages) {

        for (const item of pkg.items || []) {

            if (!item.productId) continue;

            const key =
                String(item.productId);

            salesByProduct.set(
                key,
                (salesByProduct.get(key) || 0) +
                Number(item.qty || 0)
            );
        }
    }


    return products.map(product => {

        const subcategory =
            String(product.subcategory || "")
                .trim()
                .toLowerCase();

        return {
            _id: product._id,
            name: product.name,
            stockAvailable:
                stockBySubcategory.get(subcategory) || 0,
            marketAvailable:
                Number(product.units || 0),
            sales:
                salesByProduct.get(
                    String(product._id)
                ) || 0
        };

    }).sort((a, b) =>
        String(a.name).localeCompare(
            String(b.name)
        )
    );
}


// ==========================================================
// CUSTOMER ARREARS
// ==========================================================

async function getCustomerArrears(filter) {

    const packages = await Package.find({
        status: "delivered",
        createdAt: {
            $gte: filter.startDate,
            $lt: filter.endDate
        }
    })
        .select(
            "_id clientId phoneNumber totalAmount paidAmount"
        )
        .lean();

    const arrearsPackages = packages
        .map(pkg => ({
            ...pkg,
            arrears:
                Math.max(
                    0,
                    Number(pkg.totalAmount || 0) -
                    Number(pkg.paidAmount || 0)
                )
        }))
        .filter(pkg => pkg.arrears > 0);


    if (!arrearsPackages.length) {
        return [];
    }


    // ------------------------------------------------------
    // Resolve client names.
    //
    // Package.clientId is a String.
    // User._id is MongoDB ObjectId.
    // ------------------------------------------------------

    const clientIds = [
        ...new Set(
            arrearsPackages
                .map(pkg => String(pkg.clientId || ""))
                .filter(Boolean)
        )
    ];

    const users = clientIds.length
        ? await User.find({
            _id: {
                $in: clientIds
            }
        })
            .select("_id name")
            .lean()
        : [];

    const userMap = new Map(
        users.map(user => [
            String(user._id),
            user.name
        ])
    );


    return arrearsPackages
        .map(pkg => ({
            _id: pkg._id,
            clientName:
                userMap.get(
                    String(pkg.clientId)
                ) || "Unknown Client",
            phoneNumber:
                pkg.phoneNumber || "",
            packageName:
                String(pkg._id),
            arrears:
                pkg.arrears
        }))
        .sort(
            (a, b) => b.arrears - a.arrears
        );
}


// ==========================================================
// FULL PAGE DATA
// ==========================================================

async function getSalesPageData(query = {}) {

    const allowedTabs = [
        "summary",
        "products",
        "arrears"
    ];

    const activeTab =
        allowedTabs.includes(query.tab)
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
        getFilterState(query, "summary");

    const productsFilter =
        getFilterState(query, "products");

    const arrearsFilter =
        getFilterState(query, "arrears");


    const [
        summary,
        productAnalytics,
        arrearsPackages
    ] = await Promise.all([
        getSummary(summaryFilter),
        getProductAnalytics(productsFilter),
        getCustomerArrears(arrearsFilter)
    ]);


    const activeFilter = {
        summary: summaryFilter,
        products: productsFilter,
        arrears: arrearsFilter
    }[activeTab];


    /*
     * Preserve all existing tab-specific filters when
     * switching tabs.
     */

    const params = new URLSearchParams();

    if (query.summaryDate) {
        params.set(
            "summaryDate",
            summaryFilter.date
        );
    }

    if (query.summaryPeriod) {
        params.set(
            "summaryPeriod",
            summaryFilter.period
        );
    }

    if (query.productsDate) {
        params.set(
            "productsDate",
            productsFilter.date
        );
    }

    if (query.productsPeriod) {
        params.set(
            "productsPeriod",
            productsFilter.period
        );
    }

    if (query.arrearsDate) {
        params.set(
            "arrearsDate",
            arrearsFilter.date
        );
    }

    if (query.arrearsPeriod) {
        params.set(
            "arrearsPeriod",
            arrearsFilter.period
        );
    }


    return {
        activeTab,

        totalRevenue:
            summary.totalRevenue,

        customerArrears:
            summary.customerArrears,

        profit:
            summary.profit,

        productAnalytics,

        arrearsPackages,

        activeFilterDate:
            activeFilter.date,

        activeFilterPeriod:
            activeFilter.period,

        filterLabel:
            getFilterLabel(activeFilter),

        salesQuerySuffix:
            params.toString()
                ? `&${params.toString()}`
                : ""
    };
}


module.exports = {
    getSalesPageData,
    getDateRange,
    getCurrentNairobiDate
};
