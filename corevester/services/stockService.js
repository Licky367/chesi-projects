const mongoose = require("mongoose");

const Stock = require("../models/stock");
const Product = require("../models/products");
const Substation = require("../models/substations");

const t = (value) => String(value ?? "").trim();

function n(value, label, required = false) {
  if (value === "" || value == null) {
    if (!required) return 0;
    throw new Error(`${label} is required.`);
  }

  const x = Number(value);

  if (!Number.isFinite(x) || x < 0) {
    throw new Error(`${label} must be zero or greater.`);
  }

  return x;
}

function whole(value, label, required = false) {
  const x = n(value, label, required);

  if (!Number.isInteger(x)) {
    throw new Error(`${label} must be a whole number.`);
  }

  return x;
}

function normalizeCategory(value) {
  return t(value).toLowerCase();
}

function normalizeSubcategory(value) {
  return t(value);
}

exports.listStock = () => {
  return Stock.find({ isActive: true })
    .sort({
      category: 1,
      subcategory: 1,
      name: 1
    })
    .lean();
};

exports.getStock = (id) => {
  if (!mongoose.isValidObjectId(id)) {
    return null;
  }

  return Stock.findById(id).lean();
};

exports.getStockCatalog = () => {
  return Stock.find({ isActive: true })
    .select("name category subcategory image units buyPrice description")
    .sort({
      category: 1,
      subcategory: 1,
      name: 1
    })
    .lean();
};

exports.getSubstations = () => {
  return Substation.find({ isActive: true })
    .sort({ name: 1 })
    .lean();
};

/*
 * Stock entry:
 *
 * - No stockId => create a new Stock record.
 * - stockId  => update the existing Stock record.
 *
 * Existing stock may have its name, category, subcategory, buy price,
 * image and description changed at any time.
 *
 * For an existing stock record, additionalUnits are ADDED to Stock.units.
 * A blank image keeps the existing image.
 *
 * Product metadata inherited from this Stock record is synchronized
 * for active Products linked to the stock.
 */
exports.createOrUpdateStock = async (body) => {
  const stockId = t(body.stockId);
  const name = t(body.name);
  const category = normalizeCategory(body.category);
  const subcategory = normalizeSubcategory(body.subcategory);
  const buyPrice = n(body.buyPrice, "Buy price");
  const description = t(body.description);
  const imageInput = t(body.image);

  if (!name || !category) {
    throw new Error("Stock name and category are required.");
  }

  const session = await mongoose.startSession();

  try {
    let stock;

    await session.withTransaction(async () => {
      if (stockId) {
        if (!mongoose.isValidObjectId(stockId)) {
          throw new Error("Invalid stock.");
        }

        stock = await Stock.findById(stockId).session(session);

        if (!stock) {
          throw new Error("Stock not found.");
        }

        const additionalUnits = whole(
          body.additionalUnits,
          "Additional warehouse units"
        );

        stock.name = name;
        stock.category = category;
        stock.subcategory = subcategory;
        stock.buyPrice = buyPrice;
        stock.description = description;

        if (imageInput) {
          stock.image = imageInput;
        }

        stock.units += additionalUnits;

        await stock.save({ session });

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
              buyPrice: stock.buyPrice,
              description: stock.description,
              ...(imageInput ? { image: stock.image } : {})
            }
          },
          { session }
        );

        return;
      }

      const units = whole(body.units, "Stock units", true);

      const existing = await Stock.findOne({
        isActive: true,
        category,
        name
      }).session(session);

      if (existing) {
        throw new Error(
          "An active Stock record with this name and category already exists. Select it from the existing category list instead."
        );
      }

      [stock] = await Stock.create(
        [
          {
            name,
            category,
            subcategory,
            image: imageInput,
            units,
            buyPrice,
            description
          }
        ],
        { session }
      );
    });

    return stock;
  } finally {
    await session.endSession();
  }
};

/*
 * Backwards-compatible name used by older callers.
 */
exports.createStock = (body) => {
  return exports.createOrUpdateStock(body);
};

/*
 * Allocate warehouse Stock into a Product.
 *
 * Product metadata is inherited from Stock:
 *   name
 *   category
 *   subcategory
 *   image
 *   buyPrice
 *   description
 *
 * The administrator enters only:
 *   units
 *   selling price
 *   substation
 *
 * If the same Stock record already has a Product at the selected
 * substation, Product.units is increased rather than creating a duplicate.
 *
 * Stock.units is reduced by exactly the allocated quantity.
 */
exports.createProductFromStock = async (stockId, body) => {
  if (!mongoose.isValidObjectId(stockId)) {
    throw new Error("Invalid stock.");
  }

  const units = whole(body.units, "Product units", true);
  const substationId = t(body.substation);
  const unitSellPrice = n(
    body.unitSellPrice,
    "Selling price",
    true
  );

  if (units <= 0) {
    throw new Error("Product units must be greater than zero.");
  }

  if (!substationId) {
    throw new Error("Substation selection is required.");
  }

  if (!mongoose.isValidObjectId(substationId)) {
    throw new Error("Invalid substation.");
  }

  const session = await mongoose.startSession();

  try {
    let product;

    await session.withTransaction(async () => {
      const stock = await Stock.findById(stockId).session(session);

      if (!stock || !stock.isActive) {
        throw new Error("Stock not found.");
      }

      if (units > stock.units) {
        throw new Error(
          `Only ${stock.units} units are available in stock.`
        );
      }

      const substation = await Substation.findOne({
        _id: substationId,
        isActive: true
      }).session(session);

      if (!substation) {
        throw new Error("Selected substation was not found.");
      }

      product = await Product.findOne({
        stock: stock._id,
        substation: substation._id,
        isActive: true
      }).session(session);

      if (product) {
        product.units += units;
        product.unitSellPrice = unitSellPrice;

        /*
         * Re-inherit all catalogue metadata from Stock.
         */
        product.name = stock.name;
        product.category = stock.category;
        product.subcategory = stock.subcategory || "";
        product.image = stock.image || "";
        product.buyPrice = Number(stock.buyPrice || 0);
        product.description = stock.description || "";

        await product.save({ session });
      } else {
        [product] = await Product.create(
          [
            {
              stock: stock._id,
              name: stock.name,
              category: stock.category,
              subcategory: stock.subcategory || "",
              image: stock.image || "",
              units,
              buyPrice: Number(stock.buyPrice || 0),
              unitSellPrice,
              description: stock.description || "",
              substation: substation._id
            }
          ],
          { session }
        );
      }

      stock.units -= units;

      await stock.save({ session });
    });

    return product;
  } finally {
    await session.endSession();
  }
};
