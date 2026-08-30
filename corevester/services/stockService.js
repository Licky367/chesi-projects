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
    throw new Error(
      `${label} must be zero or greater.`
    );
  }

  return x;
}

function whole(value, label, required = false) {
  const x = n(value, label, required);

  if (!Number.isInteger(x)) {
    throw new Error(
      `${label} must be a whole number.`
    );
  }

  return x;
}

exports.listStock = () => {
  return Stock.find({
    isActive: true
  })
    .sort({
      category: 1,
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

exports.getSubstations = () => {
  return Substation.find({
    isActive: true
  })
    .sort({
      name: 1
    })
    .lean();
};

exports.createStock = (body) => {
  const name = t(body.name);
  const category = t(body.category).toLowerCase();

  if (!name || !category) {
    throw new Error(
      "Stock name and category are required."
    );
  }

  return Stock.create({
    name,
    category,
    image: t(body.image),
    units: whole(
      body.units,
      "Stock units",
      true
    ),
    buyPrice: n(
      body.buyPrice,
      "Buy price"
    ),
    description: t(body.description)
  });
};

exports.createProductFromStock = async (
  stockId,
  body
) => {
  if (!mongoose.isValidObjectId(stockId)) {
    throw new Error("Invalid stock.");
  }

  const name = t(body.name);
  const category = t(body.category).toLowerCase();

  const units = whole(
    body.units,
    "Product units",
    true
  );

  /*
   * SUBSTATION IS COMPULSORY.
   *
   * Do not allow:
   *     ""
   *     null
   *     undefined
   */
  const substationId = t(body.substation);

  if (!name || !category) {
    throw new Error(
      "Product name and category are required."
    );
  }

  if (units <= 0) {
    throw new Error(
      "Product units must be greater than zero."
    );
  }

  if (!substationId) {
    throw new Error(
      "Substation selection is required."
    );
  }

  if (!mongoose.isValidObjectId(substationId)) {
    throw new Error(
      "Invalid substation."
    );
  }

  const session =
    await mongoose.startSession();

  try {
    let product;

    await session.withTransaction(
      async () => {
        const stock =
          await Stock.findById(stockId)
            .session(session);

        if (!stock) {
          throw new Error(
            "Stock not found."
          );
        }

        if (units > stock.units) {
          throw new Error(
            `Only ${stock.units} units are available in stock.`
          );
        }

        /*
         * The selected substation must:
         * 1. Exist
         * 2. Be active
         */
        const substation =
          await Substation.findOne({
            _id: substationId,
            isActive: true
          }).session(session);

        if (!substation) {
          throw new Error(
            "Selected substation was not found."
          );
        }

        /*
         * IMPORTANT:
         *
         * Buy price comes ONLY from the Stock record.
         *
         * We deliberately do NOT read:
         *
         *     body.buyPrice
         *
         * Therefore the client cannot change
         * the buy price by modifying the request.
         */
        const buyPrice =
          Number(stock.buyPrice || 0);

        [
          product
        ] = await Product.create(
          [
            {
              stock: stock._id,

              name,

              category,

              image: t(body.image),

              units,

              buyPrice,

              unitSellPrice: n(
                body.unitSellPrice,
                "Selling price",
                true
              ),

              description:
                t(body.description),

              substation:
                substation._id
            }
          ],
          {
            session
          }
        );

        /*
         * Deduct only the units allocated
         * to this product.
         */
        stock.units -= units;

        await stock.save({
          session
        });
      }
    );

    return product;
  } finally {
    await session.endSession();
  }
};