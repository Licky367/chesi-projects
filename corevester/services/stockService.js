const mongoose = require("mongoose");

const Stock = require("../models/stock");
const Product = require("../models/products");
const Substation = require("../models/substations");

const text = (value) => String(value?? "").trim();

function canonicalCategory(value) {
  const raw = text(value);
  const categories = Stock.CATEGORIES || [];
  return (
    categories.find(
      (category) => category.toLowerCase() === raw.toLowerCase()
    ) || ""
  );
}

function cleanSubcategory(value) {
  return text(value).replace(/\s+/g, " ");
}

function cleanDirectionsOfUse(input) {
  if (!input || typeof input!== "object") return undefined;

  const title = text(input.title);
  let items = input.items || [];
  if (!Array.isArray(items)) {
    items = Object.values(items);
  }

  const cleanedItems = items
   .map((it) => ({
      subtitle: text(it.subtitle),
      content: text(it.content),
    }))
   .filter((it) => it.subtitle && it.content);

  if (!title && cleanedItems.length === 0) return undefined;

  return {
    title,
    items: cleanedItems,
  };
}

function number(value, label, required = false) {
  if (value === "" || value == null) {
    if (!required) return 0;
    throw new Error(`${label} is required.`);
  }
  const result = Number(value);
  if (!Number.isFinite(result) || result < 0) {
    throw new Error(`${label} must be zero or greater.`);
  }
  return result;
}

function wholeNumber(value, label, required = false) {
  const result = number(value, label, required);
  if (!Number.isInteger(result)) {
    throw new Error(`${label} must be a whole number.`);
  }
  return result;
}

function displayLabel(value) {
  return text(value)
   .replace(/[-_]+/g, " ")
   .replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeStockForView(stock) {
  if (!stock) return stock;
  const category = canonicalCategory(stock.category) || stock.category;
  const subcategory = cleanSubcategory(stock.subcategory || stock.name);
  return {
   ...stock,
    category,
    subcategory,
    name: subcategory
  };
}

async function recalculateStockTotals(session = null) {
  const query = Stock.find({ isActive: true }).select(
    "_id category units buyPrice"
  );
  if (session) query.session(session);
  const stocks = await query.lean();

  const categoryTotals = new Map();
  let overall = 0;

  for (const stock of stocks) {
    const cashOutflow =
      Number(stock.units || 0) * Number(stock.buyPrice || 0);
    categoryTotals.set(
      stock.category,
      (categoryTotals.get(stock.category) || 0) + cashOutflow
    );
    overall += cashOutflow;
  }

  const now = new Date();

  for (const stock of stocks) {
    const cashOutflow =
      Number(stock.units || 0) * Number(stock.buyPrice || 0);
    const categoryOveral = categoryTotals.get(stock.category) || 0;

    const update = {
      cashOutflow,
      categoryOveral,
      overal: overall,
      totalsUpdatedAt: now
    };

    await Stock.updateOne(
      { _id: stock._id },
      { $set: update },
      { session, timestamps: true }
    );
  }

  return { categoryTotals, overal: overall };
}

exports.getCategories = () => [...(Stock.CATEGORIES || [])];

exports.listStock = async () => {
  const stocks = (await Stock.find({ isActive: true })
   .sort({ category: 1, subcategory: 1, createdAt: 1 })
   .lean()).map(normalizeStockForView);

  const categoryMap = new Map();

  for (const stock of stocks) {
    const category = stock.category || "Other";
    if (!categoryMap.has(category)) {
      categoryMap.set(category, {
        category,
        label: displayLabel(category),
        stocks: []
      });
    }
    categoryMap.get(category).stocks.push(stock);
  }

  return Array.from(categoryMap.values()).map((group) => {
    const rows = [];
    for (let i = 0; i < group.stocks.length; i += 6) {
      rows.push({ products: group.stocks.slice(i, i + 6) });
    }
    return {...group, rows };
  });
};

exports.getStock = (id) => {
  if (!mongoose.isValidObjectId(id)) return null;
  return Stock.findOne({ _id: id, isActive: true })
   .lean()
   .then(normalizeStockForView);
};

exports.getStockCategories = () =>
  Stock.find({ isActive: true })
   .select(
      "name category subcategory days image units buyPrice description directionsOfUse cashOutflow categoryOveral overal totalsUpdatedAt"
    )
   .sort({ category: 1, subcategory: 1 })
   .lean();

exports.getSubstations = () =>
  Substation.find({ isActive: true })
   .select("name location description productInventory")
   .sort({ name: 1 })
   .lean();

exports.recalculateStockTotals = recalculateStockTotals;

exports.createStock = async (body) => {
  const category = canonicalCategory(body.category);
  const subcategory = cleanSubcategory(body.subcategory);
  const units = wholeNumber(body.units, "Warehouse units", true);
  const buyPrice = number(body.buyPrice, "Buy price", true);
  const image = text(body.image);
  const description = text(body.description);
  const directionsOfUse = cleanDirectionsOfUse(body.directionsOfUse);

  if (!category) {
    throw new Error("Select a valid stock category.");
  }
  if (!subcategory) {
    throw new Error("Subcategory is required.");
  }

  const existing = await Stock.findOne({
    category,
    subcategory,
    isActive: true
  });

  if (existing) {
    throw new Error(
      `The subcategory "${subcategory}" already exists under "${category}". Select it from the existing list to update it.`
    );
  }

  const stock = await Stock.create({
    name: subcategory,
    category,
    subcategory,
    days: 0,
    image,
    units,
    buyPrice,
    description,
    directionsOfUse: directionsOfUse || { title: "", items: [] }
  });

  await recalculateStockTotals();
  return stock;
};

exports.updateStockEntry = async (stockId, body) => {
  if (!mongoose.isValidObjectId(stockId)) {
    throw new Error("Invalid stock subcategory.");
  }

  const stock = await Stock.findOne({ _id: stockId, isActive: true });
  if (!stock) throw new Error("Stock subcategory not found.");

  const category = canonicalCategory(body.category || stock.category);
  const subcategory = cleanSubcategory(body.subcategory || stock.subcategory);
  const additionalUnits = wholeNumber(body.additionalUnits?? 0, "Additional units");
  const buyPrice = number(body.buyPrice, "Buy price", true);
  const directionsOfUse = cleanDirectionsOfUse(body.directionsOfUse);

  if (!category) throw new Error("Select a valid stock category.");
  if (!subcategory) throw new Error("Subcategory is required.");

  const duplicate = await Stock.findOne({
    _id: { $ne: stock._id },
    category,
    subcategory,
    isActive: true
  });
  if (duplicate) {
    throw new Error(
      `The subcategory "${subcategory}" already belongs to another stock record under "${category}".`
    );
  }

  stock.name = subcategory;
  stock.category = category;
  stock.subcategory = subcategory;
  stock.days = Number(stock.days || 0);
  stock.buyPrice = buyPrice;
  stock.description = text(body.description);

  if (directionsOfUse) {
    stock.directionsOfUse = directionsOfUse;
  }

  const image = text(body.image);
  if (image) stock.image = image;

  stock.units = Number(stock.units || 0) + additionalUnits;
  await stock.save();

  await Product.updateMany(
    { stock: stock._id, isActive: true },
    {
      $set: {
        name: stock.subcategory,
        category: stock.category,
        subcategory: stock.subcategory,
        days: Number(stock.days || 0),
        image: stock.image || "",
        buyPrice: Number(stock.buyPrice || 0),
        description: stock.description || ""
        // directionsOfUse is read from Stock via virtual, no need to copy
      }
    }
  );

  const productIds = await Product.find({ stock: stock._id }).distinct("_id");
  if (productIds.length) {
    await Substation.updateMany(
      { "productInventory.productId": { $in: productIds } },
      {
        $set: {
          "productInventory.$[item].productName": stock.subcategory,
          "productInventory.$[item].category": stock.category,
          "productInventory.$[item].subcategory": stock.subcategory,
          "productInventory.$[item].days": Number(stock.days || 0),
          "productInventory.$[item].updatedAt": new Date()
        }
      },
      { arrayFilters: [{ "item.productId": { $in: productIds } }] }
    );
  }

  await recalculateStockTotals();
  return Stock.findById(stock._id).lean();
};

function normalizeAllocations(input) {
  if (!input || typeof input!== "object" || Array.isArray(input)) return [];

  return Object.entries(input)
   .map(([substationId, rawValue]) => ({
      substationId: text(substationId),
      units: wholeNumber(rawValue, `Units for substation ${substationId}`)
    }))
   .filter((entry) => entry.substationId && entry.units > 0);
}

exports.createProductFromStock = async (stockId, body) => {
  if (!mongoose.isValidObjectId(stockId)) throw new Error("Invalid stock.");

  const unitSellPrice = number(body.unitSellPrice, "Selling price", true);
  const allocations = normalizeAllocations(body.allocations);

  if (!allocations.length) {
    throw new Error("Allocate at least one unit to at least one substation.");
  }

  const allocationTotal = allocations.reduce((sum, item) => sum + item.units, 0);
  if (allocationTotal <= 0) {
    throw new Error("Total product units must be greater than zero.");
  }

  const ids = allocations.map((item) => item.substationId);
  if (ids.some((id) =>!mongoose.isValidObjectId(id))) {
    throw new Error("One or more selected substations are invalid.");
  }
  if (new Set(ids).size!== ids.length) {
    throw new Error("Each substation can appear only once in the allocation.");
  }

  const session = await mongoose.startSession();
  let product;

  try {
    await session.withTransaction(async () => {
      const stock = await Stock.findOne({ _id: stockId, isActive: true }).session(session);
      if (!stock) throw new Error("Stock subcategory not found.");

      const warehouseUnits = Number(stock.units || 0);
      if (allocationTotal > warehouseUnits) {
        throw new Error(
          `Only ${warehouseUnits} units are available in this stock subcategory.`
        );
      }

      const substations = await Substation.find({
        _id: { $in: ids },
        isActive: true
      }).session(session);

      const substationMap = new Map(
        substations.map((s) => [String(s._id), s])
      );
      for (const allocation of allocations) {
        if (!substationMap.has(allocation.substationId)) {
          throw new Error("One or more selected substations were not found or are inactive.");
        }
      }

      let existingProduct = await Product.findOne({
        stock: stock._id,
        isActive: true
      }).session(session);

      const inherited = {
        name: stock.subcategory,
        category: stock.category,
        subcategory: stock.subcategory,
        days: Number(stock.days || 0),
        image: stock.image || "",
        buyPrice: Number(stock.buyPrice || 0),
        description: stock.description || ""
      };

      if (existingProduct) {
        existingProduct.units = Number(existingProduct.units || 0) + allocationTotal;
        existingProduct.unitSellPrice = unitSellPrice;
        Object.assign(existingProduct, inherited);
        await existingProduct.save({ session });
        product = existingProduct;
      } else {
        const created = await Product.create(
          [{
            stock: stock._id,
           ...inherited,
            units: allocationTotal,
            unitSellPrice
          }],
          { session }
        );
        product = created[0];
      }

      stock.units = warehouseUnits - allocationTotal;
      await stock.save({ session });

      for (const allocation of allocations) {
        const substation = substationMap.get(allocation.substationId);
        const inventory = substation.productInventory.find(
          (entry) => String(entry.productId) === String(product._id)
        );

        if (inventory) {
          inventory.units = Number(inventory.units || 0) + allocation.units;
          inventory.productName = product.name;
          inventory.category = product.category;
          inventory.subcategory = product.subcategory;
          inventory.days = Number(product.days || 0);
          inventory.updatedAt = new Date();
        } else {
          substation.productInventory.push({
            productId: product._id,
            productName: product.name,
            category: product.category,
            subcategory: product.subcategory,
            days: Number(product.days || 0),
            units: allocation.units,
            updatedAt: new Date()
          });
        }

        await substation.save({ session });
      }

      const allStocks = await Stock.find({ isActive: true })
       .select("_id category units buyPrice")
       .session(session)
       .lean();
      const categoryTotals = new Map();
      let overall = 0;
      for (const item of allStocks) {
        const value = Number(item.units || 0) * Number(item.buyPrice || 0);
        categoryTotals.set(item.category, (categoryTotals.get(item.category) || 0) + value);
        overall += value;
      }
      const now = new Date();
      for (const item of allStocks) {
        const value = Number(item.units || 0) * Number(item.buyPrice || 0);
        await Stock.updateOne(
          { _id: item._id },
          {
            $set: {
              cashOutflow: value,
              categoryOveral: categoryTotals.get(item.category) || 0,
              overal: overall,
              totalsUpdatedAt: now
            }
          },
          { session, timestamps: true }
        );
      }
    });

    return product;
  } finally {
    await session.endSession();
  }
};