const Milk = require("../models/milk");
const Update = require("../models/Update");
const Financial = require("../models/financials");


/* =========================================================
   HELPERS
========================================================= */

/**
 * Extract expense totals
 */
const computeExpenseTotals = (expenseAgg) => {
  let maintenanceCost = 0;
  let medicalCost = 0;

  expenseAgg.forEach(e => {
    if (e._id === "maintenance") maintenanceCost = e.total || 0;
    if (e._id === "medical") medicalCost = e.total || 0;
  });

  return { maintenanceCost, medicalCost };
};


/**
 * MILK CASH
 * Priority:
 * 1. sales.cash
 * 2. dailyStats.cash (legacy fallback)
 */
const getMilkCash = async (match) => {

  const result = await Milk.aggregate([
    { $match: match },

    {
      $unwind: {
        path: "$sales",
        preserveNullAndEmptyArrays: true
      }
    },

    {
      $group: {
        _id: null,
        totalCash: {
          $sum: {
            $ifNull: ["$sales.cash", 0]
          }
        }
      }
    }

  ]);

  const cashFromSales = result[0]?.totalCash || 0;

  if (cashFromSales > 0) {
    return cashFromSales;
  }

  const fallback = await Milk.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalCash: {
          $sum: {
            $ifNull: ["$dailyStats.cash", 0]
          }
        }
      }
    }
  ]);

  return fallback[0]?.totalCash || 0;

};


/**
 * Expense aggregation helper
 */
const getExpenseAgg = async (match) => {

  return Update.aggregate([
    { $match: match },

    {
      $group: {
        _id: "$type",
        total: {
          $sum: {
            $cond: [
              { $eq: ["$type", "maintenance"] },
              "$maintenance.charges",
              "$medical.charges"
            ]
          }
        }
      }
    }

  ]);

};


/* =========================================================
   COMPUTE DAILY FINANCIALS
========================================================= */

exports.computeDailyFinancials = async (day) => {

  const milkCash = await getMilkCash({ day });

  const expenseAgg = await getExpenseAgg({});

  const { maintenanceCost, medicalCost } =
    computeExpenseTotals(expenseAgg);

  return Financial.computeDailyFinancials({
    day,
    milkCash,
    maintenanceCost,
    medicalCost
  });

};


/* =========================================================
   COMPUTE MONTHLY FINANCIALS
========================================================= */

exports.computeMonthlyFinancials = async (month, year) => {

  const milkCash = await getMilkCash({ month });

  const expenseAgg = await Update.aggregate([

    {
      $match: {
        ...(year && {
          $expr: {
            $eq: [
              { $year: "$createdAt" },
              Number(year)
            ]
          }
        })
      }
    },

    {
      $group: {
        _id: "$type",
        total: {
          $sum: {
            $cond: [
              { $eq: ["$type", "maintenance"] },
              "$maintenance.charges",
              "$medical.charges"
            ]
          }
        }
      }
    }

  ]);

  const { maintenanceCost, medicalCost } =
    computeExpenseTotals(expenseAgg);

  return Financial.computeMonthlyFinancials({
    month,
    year,
    milkCash,
    maintenanceCost,
    medicalCost
  });

};


/* =========================================================
   COMPUTE YEARLY FINANCIALS
========================================================= */

exports.computeYearlyFinancials = async (year) => {

  const milkCash = await getMilkCash({
    $expr: {
      $eq: [
        { $year: "$date" },
        Number(year)
      ]
    }
  });

  const expenseAgg = await getExpenseAgg({
    $expr: {
      $eq: [
        { $year: "$createdAt" },
        Number(year)
      ]
    }
  });

  const { maintenanceCost, medicalCost } =
    computeExpenseTotals(expenseAgg);

  return Financial.computeYearlyFinancials({
    year,
    milkCash,
    maintenanceCost,
    medicalCost
  });

};


/* =========================================================
   GET STORED FINANCIAL RECORD
========================================================= */

exports.getFinancials = async ({ day, month, year, type }) => {

  const filter = {
    periodType: type
  };

  if (day) filter.day = day;
  if (month) filter.month = month;
  if (year) filter.year = Number(year);

  return Financial.findOne(filter);

};


/* =========================================================
   DAILY CUSTOMERS
========================================================= */

exports.getDailyCustomers = async (day) => {

  const filter = {};

  if (day) {
    filter.day = day;
  }

  const milkRecords = await Milk.find(filter).lean();

  const sales = [];
  let totalSalesCash = 0;

  milkRecords.forEach(record => {

    if (!Array.isArray(record.sales)) return;

    record.sales.forEach(sale => {

      sales.push({
        customerName: sale.customerName,
        liters: sale.liters,
        cash: sale.cash,
        createdAt: sale.createdAt
      });

      totalSalesCash += sale.cash || 0;

    });

  });

  sales.sort((a, b) =>
    new Date(b.createdAt) - new Date(a.createdAt)
  );

  return {
    sales,
    totalSalesCash
  };

};


/* =========================================================
   FINANCIAL SUMMARY
========================================================= */

exports.getFinancialSummary = async (month, year) => {

  let financial = await exports.getFinancials({
    month,
    year,
    type: "monthly"
  });

  if (!financial) {
    financial = await exports.computeMonthlyFinancials(month, year);
  }

  return financial;

};


/* =========================================================
   MONTHLY EXPENSES
========================================================= */

exports.getMonthlyExpenses = async (month, year) => {

  const filter = {};

  if (month && year) {

    const start = new Date(Number(year), Number(month) - 1, 1);
    const end = new Date(Number(year), Number(month), 1);

    filter.createdAt = {
      $gte: start,
      $lt: end
    };

  }

  const expenses = await Update.find(filter)
    .sort({ createdAt: -1 })
    .lean();

  let totalExpenses = 0;

  expenses.forEach(expense => {

    if (expense.type === "maintenance") {
      totalExpenses += expense.maintenance?.charges || 0;
    }

    if (expense.type === "medical") {
      totalExpenses += expense.medical?.charges || 0;
    }

  });

  return {
    expenses,
    totalExpenses
  };

};


/* =========================================================
   RAW RECORD ACCESS
========================================================= */

exports.getRawRecord = async (query) => {

  return Financial.find(query);

};