const mongoose = require("mongoose");

const Substation = require("../models/substations");
const Product = require("../models/products");
const Stock = require("../models/stock");

const text = (value) => String(value ?? "").trim();

exports.list = () =>
  Substation.find({ isActive: true }).sort({ name: 1 }).lean();

exports.create = async (body) => {
  const name = text(body.name);
  if (!name) throw Error("Substation name is required.");
  if (await Substation.findOne({ name })) {
    throw Error("A substation with that name already exists.");
  }
  return Substation.create({
    name,
    location: text(body.location),
    description: text(body.description)
  });
};

exports.getWithProducts = async (id) => {
  if (!mongoose.isValidObjectId(id)) return null;

  const substation = await Substation.findById(id).lean();
  if (!substation) return null;

  const inventory = Array.isArray(substation.productInventory)
    ? substation.productInventory
    : [];
  const productIds = inventory.map((item) => item.productId).filter(Boolean);

  const products = await Product.find({
    _id: { $in: productIds },
    isActive: true
  }).sort({ name: 1 }).lean();

  const productMap = new Map(products.map((p) => [String(p._id), p]));

  const physicalProducts = inventory
    .map((item) => {
      const product = productMap.get(String(item.productId));
      if (!product) return null;
      return {
        ...product,
        substationUnits: Number(item.units || 0),
        substationInventoryId: item.productId
      };
    })
    .filter(Boolean);

  return { ...substation, products: physicalProducts };
};

exports.getProduct = async (id) => {
  if (!mongoose.isValidObjectId(id)) return null;

  const product = await Product.findOne({ _id: id, isActive: true })
    .populate("stock", "name category subcategory days units buyPrice")
    .lean();
  if (!product) return null;

  const substations = await Substation.find({
    isActive: true,
    "productInventory.productId": product._id
  }).select("name location productInventory").lean();

  const substationStocks = substations.map((substation) => {
    const inventory = (substation.productInventory || []).find(
      (entry) => String(entry.productId) === String(product._id)
    );
    return {
      _id: substation._id,
      name: substation.name,
      location: substation.location,
      units: Number(inventory?.units || 0)
    };
  });

  return { ...product, substationStocks };
};

exports.updateProductUnits = async (productId, body) => {
  if (!mongoose.isValidObjectId(productId)) throw new Error("Invalid product.");
  if (!mongoose.isValidObjectId(body.substationId)) throw new Error("Invalid substation.");

  const newUnits = Number(body.units);
  if (!Number.isInteger(newUnits) || newUnits < 0) {
    throw new Error("Units must be a whole number greater than or equal to zero.");
  }

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const product = await Product.findOne({ _id: productId, isActive: true }).session(session);
      if (!product) throw new Error("Product not found.");

      const stock = await Stock.findOne({ _id: product.stock, isActive: true }).session(session);
      if (!stock) throw new Error("The source stock subcategory was not found.");

      const substation = await Substation.findOne({
        _id: body.substationId,
        isActive: true
      }).session(session);
      if (!substation) throw new Error("Substation not found or inactive.");

      const inventory = substation.productInventory.find(
        (entry) => String(entry.productId) === String(product._id)
      );
      if (!inventory) {
        throw new Error("This product is not allocated to the selected substation.");
      }

      const oldUnits = Number(inventory.units || 0);
      const delta = newUnits - oldUnits;

      // Increasing a substation balance consumes only the additional units
      // from the source stock. Reducing it returns the difference to stock.
      if (delta > 0 && Number(stock.units || 0) < delta) {
        throw new Error(
          `Only ${Number(stock.units || 0)} units remain in the source stock. You need ${delta} additional units.`
        );
      }

      inventory.units = newUnits;
      inventory.updatedAt = new Date();
      inventory.productName = product.name;
      inventory.category = product.category;
      inventory.subcategory = product.subcategory;
      inventory.days = Number(product.days || 0);
      await substation.save({ session });

      product.units = Math.max(0, Number(product.units || 0) + delta);
      product.updatedAt = new Date();
      await product.save({ session });

      stock.units = Math.max(0, Number(stock.units || 0) - delta);
      stock.totalsUpdatedAt = new Date();
      await stock.save({ session });

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

      result = {
        productId: product._id,
        substationId: substation._id,
        units: newUnits,
        delta
      };
    });
    return result;
  } finally {
    await session.endSession();
  }
};
