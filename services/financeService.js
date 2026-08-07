const PoultryFinance = require("../models/PoultryFinance");

const VALID_POULTRY_TYPES = [
  "chicken",
  "duck",
  "turkey",
  "goose",
  "quail",
  "other"
];

// =========================
// RECORD INVESTMENT
// =========================
exports.recordInvestment = async ({ amount, poultryType, description, userId }) => {
  if (!VALID_POULTRY_TYPES.includes(poultryType)) {
    throw new Error("Invalid poultry type");
  }

  amount = Number(amount);
  if (!amount || amount <= 0) throw new Error("Invalid amount");

  return await PoultryFinance.create({
    category: "investment",
    metaType: "investment",
    poultryType,
    amount,
    description,
    recordedBy: userId
  });
};

// =========================
// REINVEST PROFIT
// =========================
exports.reinvestProfit = async ({ amount, poultryType, description, userId }) => {
  amount = Number(amount);
  if (!amount || amount <= 0) throw new Error("Invalid amount");

  const stats = await exports.getLifetimeStats();

  if (amount > stats.profit) {
    throw new Error("Reinvestment exceeds available profit");
  }

  return await PoultryFinance.create({
    category: "investment",
    metaType: "reinvest",
    poultryType,
    amount,
    description: description || "Reinvestment",
    recordedBy: userId
  });
};

// =========================
// PAY WORKERS
// =========================
exports.payWorkers = async ({ amount, poultryType, description, userId }) => {
  amount = Number(amount);
  if (!amount || amount <= 0) throw new Error("Invalid amount");

  const stats = await exports.getLifetimeStats();

  if (amount > stats.profit) {
    throw new Error("Insufficient profit for payroll");
  }

  return await PoultryFinance.create({
    category: "investment",
    metaType: "pay_workers",
    poultryType,
    amount,
    description,
    recordedBy: userId
  });
};

// =========================
// CONSUMPTION
// =========================
exports.addConsumption = async ({ amount, poultryType, description, userId }) => {
  amount = Number(amount);
  if (!amount || amount <= 0) throw new Error("Invalid amount");

  const stats = await exports.getLifetimeStats();

  if (amount > stats.profit) {
    throw new Error("Insufficient profit for consumption");
  }

  return await PoultryFinance.create({
    category: "investment",
    metaType: "consumption",
    poultryType,
    amount,
    description,
    recordedBy: userId
  });
};

// =========================
// RECORD POULTRY SALE
// =========================
exports.recordPoultrySale = async ({ amount, quantity, poultryType, batchId, userId }) => {
  if (!VALID_POULTRY_TYPES.includes(poultryType)) {
    throw new Error("Invalid poultry type");
  }

  amount = Number(amount);
  quantity = Number(quantity);

  if (amount < 0) throw new Error("Invalid amount");
  if (!quantity || quantity <= 0) throw new Error("Invalid quantity");

  return await PoultryFinance.create({
    category: "poultry_sale",
    poultryType,
    amount,
    quantity,
    relatedBatch: batchId || null,
    recordedBy: userId
  });
};

// =========================
// RECORD EGG SALE
// =========================
exports.recordEggSale = async ({ amount, quantity, poultryType, userId }) => {
  if (!VALID_POULTRY_TYPES.includes(poultryType)) {
    throw new Error("Invalid poultry type");
  }

  amount = Number(amount);
  quantity = Number(quantity);

  if (amount < 0) throw new Error("Invalid amount");
  if (!quantity || quantity <= 0) throw new Error("Invalid quantity");

  return await PoultryFinance.create({
    category: "egg_sale",
    poultryType,
    amount,
    quantity,
    recordedBy: userId
  });
};

// =========================
// LIFETIME STATS
// =========================
exports.getLifetimeStats = async () => {
  const data = await PoultryFinance.aggregate([
    {
      $group: {
        _id: "$category",
        total: { $sum: "$amount" }
      }
    }
  ]);

  let investment = 0;
  let poultry = 0;
  let eggs = 0;

  data.forEach((d) => {
    if (d._id === "investment") investment = d.total;
    if (d._id === "poultry_sale") poultry = d.total;
    if (d._id === "egg_sale") eggs = d.total;
  });

  const revenue = poultry + eggs;
  const profit = revenue - investment;

  return { investment, poultry, eggs, revenue, profit };
};

// =========================
// MONTHLY STATS
// =========================
exports.getMonthlyStats = async (year, month) => {
  const start = new Date(year, month, 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(year, month + 1, 0);
  end.setHours(23, 59, 59, 999);

  return await PoultryFinance.find({
    createdAt: { $gte: start, $lte: end }
  });
};
// =========================
// PROFIT BY POULTRY TYPE
// =========================
exports.getProfitByType = async () => {

  const data = await PoultryFinance.aggregate([
    {
      $group: {
        _id: {
          poultryType: "$poultryType",
          category: "$category"
        },
        total: {
          $sum: "$amount"
        }
      }
    }
  ]);

  const profitByType = {};

  VALID_POULTRY_TYPES.forEach(type => {
    profitByType[type] = 0;
  });


  data.forEach(item => {

    const type = item._id.poultryType;

    if (!type) return;

    if (!profitByType[type]) {
      profitByType[type] = 0;
    }


    // Sales increase profit
    if (
      item._id.category === "poultry_sale" ||
      item._id.category === "egg_sale"
    ) {
      profitByType[type] += item.total;
    }


    // Investments and expenses reduce profit
    if (
      item._id.category === "investment"
    ) {
      profitByType[type] -= item.total;
    }

  });


  return profitByType;
};