const mongoose = require("mongoose");

const Stock = require("../models/stock");
const Product = require("../models/products");
const Substation = require("../models/substations");

const text = (value) => String(value ?? "").trim();

const cleanCategory = (value) =>
  text(value).toLowerCase();

const cleanSubcategory = (value) =>
  text(value).toLowerCase();

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

/*
 * /stock is organized exactly like /products:
 *
 * Category
 *   Subcategory
 *     [up to six cards] -> horizontal scroll -> [7th onward]
 */
exports.listStock = async () => {
  const stocks = await Stock.find({ isActive: true })
    .sort({ category: 1, subcategory: 1, name: 1, createdAt: 1 })
    .lean();

  const categoryMap = new Map();

  for (const stock of stocks) {
    const category = stock.category || "other";
    const subcategory = stock.subcategory || "uncategorized";

    if (!categoryMap.has(category)) {
      categoryMap.set(category, {
        category,
        label: displayLabel(category),
        subcategories: new Map()
      });
    }

    const group = categoryMap.get(category);

    if (!group.subcategories.has(subcategory)) {
      group.subcategories.set(subcategory, {
        subcategory,
        label: displayLabel(subcategory),
        stocks: []
      });
    }

    group.subcategories.get(subcategory).stocks.push(stock);
  }

  return Array.from(categoryMap.values()).map((category) => {
    const subcategories = Array.from(category.subcategories.values());

    return {
      category: category.category,
      label: category.label,
      subcategories: subcategories.map((group) => {
        const rows = [];

        for (let i = 0; i < group.stocks.length; i += 6) {
          rows.push({
            products: group.stocks.slice(i, i + 6)
          });
        }

        return {
          subcategory: group.subcategory,
          label: group.label,
          rows
        };
      })
    };
  });
};

exports.getStock = (id) => {
  if (!mongoose.isValidObjectId(id)) return null;

  return Stock.findOne({
    _id: id,
    isActive: true
  }).lean();
};

/*
 * Existing Stock records are the subcategory catalogue.
 */
exports.getStockCategories = () =>
  Stock.find({ isActive: true })
    .select(
      "name category subcategory days image units buyPrice description"
    )
    .sort({ category: 1, subcategory: 1, name: 1 })
    .lean();

exports.getSubstations = () =>
  Substation.find({ isActive: true })
    .select("name location description")
    .sort({ name: 1 })
    .lean();

exports.createStock = async (body) => {
  const name = text(body.name);
  const category = cleanCategory(body.category);
  const subcategory = cleanSubcategory(body.subcategory);
  const units = wholeNumber(body.units, "Warehouse units", true);
  const buyPrice = number(body.buyPrice, "Buy price");
  const days = wholeNumber(body.days, "Delivery days", true);

  if (!name || !category || !subcategory) {
    throw new Error(
      "Stock name, category and subcategory are required."
    );
  }

  const existing = await Stock.findOne({
    category,
    subcategory,
    isActive: true
  });

  if (existing) {
    throw new Error(
      `The subcategory "${subcategory}" already exists under "${category}". Select it from the existing subcategory list to update it.`
    );
  }

  return Stock.create({
    name,
    category,
    subcategory,
    days,
    image: text(body.image),
    units,
    buyPrice,
    description: text(body.description)
  });
};

exports.updateStockEntry = async (stockId, body) => {
  if (!mongoose.isValidObjectId(stockId)) {
    throw new Error("Invalid stock subcategory.");
  }

  const name = text(body.name);
  const category = cleanCategory(body.category);
  const subcategory = cleanSubcategory(body.subcategory);
  const additionalUnits = wholeNumber(
    body.additionalUnits,
    "Additional units"
  );
  const buyPrice = number(body.buyPrice, "Buy price");
  const days = wholeNumber(
    body.days,
    "Delivery days",
    true
  );

  if (!name || !category || !subcategory) {
    throw new Error(
      "Stock name, category and subcategory are required."
    );
  }

  const stock = await Stock.findOne({
    _id: stockId,
    isActive: true
  });

  if (!stock) {
    throw new Error("Stock subcategory not found.");
  }

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

  stock.name = name;
  stock.category = category;
  stock.subcategory = subcategory;
  stock.days = days;
  stock.buyPrice = buyPrice;
  stock.description = text(body.description);

  const image = text(body.image);

  if (image) {
    stock.image = image;
  }

  stock.units += additionalUnits;

  await stock.save();

  /*
   * Product metadata is inherited from its Stock subcategory.
   * Never alter Product.units here.
   */
  await Product.updateMany(
    {
      stock: stock._id,
      isActive: true
    },
    {
      $set: {
        name: stock.name,
        category: stock.category,
        subcategory: stock.subcategory,
        days: Number(stock.days || 0),
        image: stock.image || "",
        buyPrice: Number(stock.buyPrice || 0),
        description: stock.description || ""
      }
    }
  );

  /*
   * Keep existing substation inventory labels synchronized too.
   */
  await Substation.updateMany(
    { "productInventory.productId": { $in: await Product.find({ stock: stock._id }).distinct("_id") } },
    {
      $set: {
        "productInventory.$[item].productName": stock.name,
        "productInventory.$[item].category": stock.category,
        "productInventory.$[item].subcategory": stock.subcategory,
        "productInventory.$[item].days": Number(stock.days || 0),
        "productInventory.$[item].updatedAt": new Date()
      }
    },
    {
      arrayFilters: [{ "item.productId": { $in: await Product.find({ stock: stock._id }).distinct("_id") } }]
    }
  );

  return stock;
};

/*
 * Allocate warehouse stock into ONE marketplace Product while distributing
 * the allocated quantity across ANY number of active substations.
 *
 * Request format:
 *
 *   units = total quantity to allocate
 *   unitSellPrice = marketplace selling price
 *   allocations[SUBSTATION_ID] = quantity for that substation
 *
 * The sum of all allocation quantities becomes Product.units.
 * Stock.units is reduced by exactly that same total.
 *
 * Product.units is NOT divided among Product documents. There is one Product
 * per Stock/subcategory, and each Substation stores its own physical balance.
 */
exports.createProductFromStock = async (stockId, body) => {
  if (!mongoose.isValidObjectId(stockId)) {
    throw new Error("Invalid stock.");
  }

  const requestedTotal = wholeNumber(
    body.units,
    "Total product units",
    true
  );

  const unitSellPrice = number(
    body.unitSellPrice,
    "Selling price",
    true
  );

  if (requestedTotal <= 0) {
    throw new Error("Total product units must be greater than zero.");
  }

  let allocationInput = body.allocations || {};

  if (typeof allocationInput !== "object" || Array.isArray(allocationInput)) {
    allocationInput = {};
  }

  const allocations = Object.entries(allocationInput)
    .map(([substationId, value]) => ({
      substationId: text(substationId),
      units: wholeNumber(
        value,
        `Units for substation ${substationId}`
      )
    }))
    .filter((entry) => entry.units > 0);

  if (!allocations.length) {
    throw new Error(
      "Allocate at least one unit to at least one substation."
    );
  }

  const allocationTotal = allocations.reduce(
    (sum, entry) => sum + entry.units,
    0
  );

  if (allocationTotal !== requestedTotal) {
    throw new Error(
      `Allocation total (${allocationTotal}) must equal Total product units (${requestedTotal}).`
    );
  }

  const substationIds = allocations.map(
    (entry) => entry.substationId
  );

  if (
    substationIds.some(
      (id) => !mongoose.isValidObjectId(id)
    )
  ) {
    throw new Error("One or more selected substations are invalid.");
  }

  if (
    new Set(substationIds).size !== substationIds.length
  ) {
    throw new Error(
      "Each substation can appear only once in the allocation."
    );
  }

  const session = await mongoose.startSession();

  try {
    let product;

    await session.withTransaction(async () => {
      const stock = await Stock.findOne({
        _id: stockId,
        isActive: true
      }).session(session);

      if (!stock) {
        throw new Error("Stock subcategory not found.");
      }

      if (requestedTotal > stock.units) {
        throw new Error(
          `Only ${stock.units} units are available in this stock subcategory.`
        );
      }

      const substations = await Substation.find({
        _id: { $in: substationIds },
        isActive: true
      }).session(session);

      const substationMap = new Map(
        substations.map((s) => [
          String(s._id),
          s
        ])
      );

      for (const allocation of allocations) {
        if (!substationMap.has(allocation.substationId)) {
          throw new Error(
            "One or more selected substations were not found or are inactive."
          );
        }
      }

      let existingProduct = await Product.findOne({
        stock: stock._id,
        isActive: true
      }).session(session);

      if (existingProduct) {
        existingProduct.units += requestedTotal;
        existingProduct.unitSellPrice = unitSellPrice;

        existingProduct.name = stock.name;
        existingProduct.category = stock.category;
        existingProduct.subcategory = stock.subcategory;
        existingProduct.days = Number(stock.days || 0);
        existingProduct.image = stock.image || "";
        existingProduct.buyPrice = Number(stock.buyPrice || 0);
        existingProduct.description = stock.description || "";

        await existingProduct.save({ session });

        product = existingProduct;
      } else {
        [product] = await Product.create(
          [
            {
              stock: stock._id,
              name: stock.name,
              category: stock.category,
              subcategory: stock.subcategory,
              days: Number(stock.days || 0),
              image: stock.image || "",
              units: requestedTotal,
              buyPrice: Number(stock.buyPrice || 0),
              unitSellPrice,
              description: stock.description || ""
            }
          ],
          { session }
        );
      }

      /*
       * Stock is the warehouse source. Consume the total allocated quantity
       * exactly once.
       */
      stock.units -= requestedTotal;
      await stock.save({ session });

      /*
       * Update each substation's physical inventory independently.
       */
      for (const allocation of allocations) {
        const substation =
          substationMap.get(allocation.substationId);

        const existingInventory =
          substation.productInventory.find(
            (entry) =>
              String(entry.productId) ===
              String(product._id)
          );

        if (existingInventory) {
          existingInventory.units =
            Number(existingInventory.units || 0) +
            allocation.units;

          existingInventory.productName =
            product.name;

          existingInventory.category =
            product.category;

          existingInventory.subcategory =
            product.subcategory;

          existingInventory.days =
            Number(product.days || 0);

          existingInventory.updatedAt =
            new Date();
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
    });

    return product;
  } finally {
    await session.endSession();
  }
};
