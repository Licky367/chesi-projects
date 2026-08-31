const mongoose = require("mongoose");

const Substation = require("../models/substations");
const Product = require("../models/products");

const text = (value) =>
  String(value ?? "").trim();

exports.list = () =>
  Substation.find({
    isActive: true
  })
    .sort({ name: 1 })
    .lean();

exports.create = async (body) => {
  const name = text(body.name);

  if (!name) {
    throw Error("Substation name is required.");
  }

  if (await Substation.findOne({ name })) {
    throw Error(
      "A substation with that name already exists."
    );
  }

  return Substation.create({
    name,
    location: text(body.location),
    description: text(body.description)
  });
};

exports.getWithProducts = async (id) => {
  if (!mongoose.isValidObjectId(id)) {
    return null;
  }

  const substation =
    await Substation.findById(id).lean();

  if (!substation) {
    return null;
  }

  const inventory =
    Array.isArray(substation.productInventory)
      ? substation.productInventory
      : [];

  const productIds =
    inventory
      .map((item) => item.productId)
      .filter(Boolean);

  const products =
    await Product.find({
      _id: { $in: productIds },
      isActive: true
    })
      .sort({ name: 1 })
      .lean();

  const productMap =
    new Map(
      products.map((product) => [
        String(product._id),
        product
      ])
    );

  const physicalProducts =
    inventory
      .map((item) => {
        const product =
          productMap.get(
            String(item.productId)
          );

        if (!product) return null;

        return {
          ...product,
          substationUnits:
            Number(item.units || 0),
          substationInventoryId:
            item.productId
        };
      })
      .filter(Boolean);

  return {
    ...substation,
    products: physicalProducts
  };
};

exports.getProduct = async (id) => {
  if (!mongoose.isValidObjectId(id)) {
    return null;
  }

  const product =
    await Product.findOne({
      _id: id,
      isActive: true
    })
      .populate("stock", "name category subcategory days")
      .lean();

  if (!product) {
    return null;
  }

  const substations =
    await Substation.find({
      isActive: true,
      "productInventory.productId": product._id
    })
      .select("name location productInventory")
      .lean();

  const substationStocks =
    substations.map((substation) => {
      const inventory =
        (substation.productInventory || [])
          .find(
            (entry) =>
              String(entry.productId) ===
              String(product._id)
          );

      return {
        _id: substation._id,
        name: substation.name,
        location: substation.location,
        units: Number(inventory?.units || 0)
      };
    });

  return {
    ...product,
    substationStocks
  };
};
