const EggCollectionLog = require("../models/EggCollectionLog");
const PoultryFinance = require("../models/PoultryFinance");

const TYPES = ["chicken", "duck", "turkey", "goose", "quail", "other"];

const getRanges = (date) => {
  const d = date ? new Date(date) : new Date();

  const dayStart = new Date(d);
  dayStart.setHours(0, 0, 0, 0);

  const dayEnd = new Date(d);
  dayEnd.setHours(23, 59, 59, 999);

  const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
  const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  monthEnd.setHours(23, 59, 59, 999);

  const yearStart = new Date(d.getFullYear(), 0, 1);
  const yearEnd = new Date(d.getFullYear(), 11, 31);
  yearEnd.setHours(23, 59, 59, 999);

  return { dayStart, dayEnd, monthStart, monthEnd, yearStart, yearEnd };
};

const sumAmount = (records) => records.reduce((a, b) => a + (b.amount || 0), 0);
const sumQuantity = (records) =>
  records.reduce((a, b) => a + (b.quantity || 0), 0);

exports.getStats = async ({ date, type }) => {
  const ranges = getRanges(date);

  const rows = [];

  let grandDay = 0;
  let grandMonth = 0;
  let grandYear = 0;

  for (const poultryType of TYPES) {
    let day = 0;
    let month = 0;
    let year = 0;

    // =========================
    // EGGS COLLECTED
    // =========================
    if (type === "eggs") {
      const [dayData, monthData, yearData] = await Promise.all([
        EggCollectionLog.find({
          poultryType,
          createdAt: { $gte: ranges.dayStart, $lte: ranges.dayEnd }
        }),
        EggCollectionLog.find({
          poultryType,
          createdAt: { $gte: ranges.monthStart, $lte: ranges.monthEnd }
        }),
        EggCollectionLog.find({
          poultryType,
          createdAt: { $gte: ranges.yearStart, $lte: ranges.yearEnd }
        })
      ]);

      day = sumQuantity(dayData);
      month = sumQuantity(monthData);
      year = sumQuantity(yearData);
    }

    // =========================
    // EGG SALES REVENUE
    // =========================
    if (type === "egg_sales") {
      const base = {
        category: "egg_sale",
        poultryType
      };

      const [dayData, monthData, yearData] = await Promise.all([
        PoultryFinance.find({
          ...base,
          createdAt: { $gte: ranges.dayStart, $lte: ranges.dayEnd }
        }),
        PoultryFinance.find({
          ...base,
          createdAt: { $gte: ranges.monthStart, $lte: ranges.monthEnd }
        }),
        PoultryFinance.find({
          ...base,
          createdAt: { $gte: ranges.yearStart, $lte: ranges.yearEnd }
        })
      ]);

      day = sumAmount(dayData);
      month = sumAmount(monthData);
      year = sumAmount(yearData);
    }

    // =========================
    // POULTRY SALES REVENUE
    // =========================
    if (type === "poultry_sales") {
      const base = {
        category: "poultry_sale",
        poultryType
      };

      const [dayData, monthData, yearData] = await Promise.all([
        PoultryFinance.find({
          ...base,
          createdAt: { $gte: ranges.dayStart, $lte: ranges.dayEnd }
        }),
        PoultryFinance.find({
          ...base,
          createdAt: { $gte: ranges.monthStart, $lte: ranges.monthEnd }
        }),
        PoultryFinance.find({
          ...base,
          createdAt: { $gte: ranges.yearStart, $lte: ranges.yearEnd }
        })
      ]);

      day = sumAmount(dayData);
      month = sumAmount(monthData);
      year = sumAmount(yearData);
    }

    // =========================
    // TOTAL REVENUE = EGG + POULTRY SALES
    // =========================
    if (type === "total_revenue") {
      const eggBase = {
        category: "egg_sale",
        poultryType
      };

      const poultryBase = {
        category: "poultry_sale",
        poultryType
      };

      const [
        eggDay,
        eggMonth,
        eggYear,
        poultryDay,
        poultryMonth,
        poultryYear
      ] = await Promise.all([
        PoultryFinance.find({
          ...eggBase,
          createdAt: { $gte: ranges.dayStart, $lte: ranges.dayEnd }
        }),
        PoultryFinance.find({
          ...eggBase,
          createdAt: { $gte: ranges.monthStart, $lte: ranges.monthEnd }
        }),
        PoultryFinance.find({
          ...eggBase,
          createdAt: { $gte: ranges.yearStart, $lte: ranges.yearEnd }
        }),

        PoultryFinance.find({
          ...poultryBase,
          createdAt: { $gte: ranges.dayStart, $lte: ranges.dayEnd }
        }),
        PoultryFinance.find({
          ...poultryBase,
          createdAt: { $gte: ranges.monthStart, $lte: ranges.monthEnd }
        }),
        PoultryFinance.find({
          ...poultryBase,
          createdAt: { $gte: ranges.yearStart, $lte: ranges.yearEnd }
        })
      ]);

      day = sumAmount(eggDay) + sumAmount(poultryDay);
      month = sumAmount(eggMonth) + sumAmount(poultryMonth);
      year = sumAmount(eggYear) + sumAmount(poultryYear);
    }

    // =========================
    // PROFIT = TOTAL REVENUE - INVESTMENT
    // =========================
    if (type === "profit") {
      const eggBase = {
        category: "egg_sale",
        poultryType
      };

      const poultryBase = {
        category: "poultry_sale",
        poultryType
      };

      const investmentBase = {
        category: "investment",
        poultryType
      };

      const [
        eggDay,
        eggMonth,
        eggYear,
        poultryDay,
        poultryMonth,
        poultryYear,
        invDay,
        invMonth,
        invYear
      ] = await Promise.all([
        PoultryFinance.find({
          ...eggBase,
          createdAt: { $gte: ranges.dayStart, $lte: ranges.dayEnd }
        }),
        PoultryFinance.find({
          ...eggBase,
          createdAt: { $gte: ranges.monthStart, $lte: ranges.monthEnd }
        }),
        PoultryFinance.find({
          ...eggBase,
          createdAt: { $gte: ranges.yearStart, $lte: ranges.yearEnd }
        }),

        PoultryFinance.find({
          ...poultryBase,
          createdAt: { $gte: ranges.dayStart, $lte: ranges.dayEnd }
        }),
        PoultryFinance.find({
          ...poultryBase,
          createdAt: { $gte: ranges.monthStart, $lte: ranges.monthEnd }
        }),
        PoultryFinance.find({
          ...poultryBase,
          createdAt: { $gte: ranges.yearStart, $lte: ranges.yearEnd }
        }),

        PoultryFinance.find({
          ...investmentBase,
          createdAt: { $gte: ranges.dayStart, $lte: ranges.dayEnd }
        }),
        PoultryFinance.find({
          ...investmentBase,
          createdAt: { $gte: ranges.monthStart, $lte: ranges.monthEnd }
        }),
        PoultryFinance.find({
          ...investmentBase,
          createdAt: { $gte: ranges.yearStart, $lte: ranges.yearEnd }
        })
      ]);

      const revenueDay = sumAmount(eggDay) + sumAmount(poultryDay);
      const revenueMonth = sumAmount(eggMonth) + sumAmount(poultryMonth);
      const revenueYear = sumAmount(eggYear) + sumAmount(poultryYear);

      day = revenueDay - sumAmount(invDay);
      month = revenueMonth - sumAmount(invMonth);
      year = revenueYear - sumAmount(invYear);
    }

    grandDay += day;
    grandMonth += month;
    grandYear += year;

    rows.push({
      poultryType,
      day,
      month,
      year
    });
  }

  return {
    rows,
    grandTotal: {
      day: grandDay,
      month: grandMonth,
      year: grandYear
    }
  };
};