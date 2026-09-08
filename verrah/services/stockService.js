// ==========================================================
// services/stockService.js
// STOCK SERVICE
// ==========================================================

const mongoose = require("mongoose");

const Stock = require("../models/stock");
const Product = require("../models/products");
const Category = require("../models/category");
const Substation = require("../models/substations");


// ==========================================================
// HELPERS
// ==========================================================

const text = (value) =>
  String(value ?? "").trim();


const cleanSubcategory = (value) =>
  text(value).replace(/\s+/g, " ");


const displayLabel = (value) =>
  text(value)
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());


// ==========================================================
// CATEGORY VALIDATION
// ==========================================================
//
// Stock.category is a MongoDB reference to Category.
//
// The supplied value MUST be a valid Category._id.
//
// Only active categories are accepted.
//
// Returns the actual Category._id.
// ==========================================================

async function validateCategory(value) {

  const categoryId =
    text(value);


  if (!categoryId) {

    throw new Error(
      "Select a valid stock category."
    );

  }


  if (
    !mongoose.isValidObjectId(
      categoryId
    )
  ) {

    throw new Error(
      "The selected category is invalid."
    );

  }


  const category =
    await Category.findOne({
      _id: categoryId,
      isActive: true
    })
      .select(
        "_id name categoryIcon isActive"
      )
      .lean();


  if (!category) {

    throw new Error(
      "The selected category was not found or is inactive."
    );

  }


  return category._id;
}


// ==========================================================
// NUMBER HELPERS
// ==========================================================

function number(
  value,
  label,
  required = false
) {

  if (
    value === "" ||
    value == null
  ) {

    if (!required) {
      return 0;
    }

    throw new Error(
      `${label} is required.`
    );

  }


  const result =
    Number(value);


  if (
    !Number.isFinite(result) ||
    result < 0
  ) {

    throw new Error(
      `${label} must be zero or greater.`
    );

  }


  return result;
}


function wholeNumber(
  value,
  label,
  required = false
) {

  const result =
    number(
      value,
      label,
      required
    );


  if (
    !Number.isInteger(result)
  ) {

    throw new Error(
      `${label} must be a whole number.`
    );

  }


  return result;
}


// ==========================================================
// DIRECTIONS OF USE
// ==========================================================

function cleanDirectionsOfUse(
  input
) {

  if (input == null) {
    return undefined;
  }


  if (
    typeof input !== "object" ||
    Array.isArray(input)
  ) {

    return undefined;

  }


  if (
    text(input.clear) === "1"
  ) {

    return null;

  }


  const title =
    text(input.title);


  let items =
    input.items || [];


  if (!Array.isArray(items)) {

    items =
      Object.values(items);

  }


  const cleanedItems =
    items
      .map((item) => ({

        subtitle:
          text(item?.subtitle),

        content:
          text(item?.content)

      }))
      .filter(
        (item) =>
          item.subtitle &&
          item.content
      );


  if (
    !title &&
    !cleanedItems.length
  ) {

    return null;

  }


  return {

    title,

    items:
      cleanedItems

  };

}


// ==========================================================
// DIRECTIONS FOR PRODUCT
// ==========================================================

function directionsForProduct(
  stock
) {

  const directions =
    stock?.directionsOfUse;


  if (!directions) {
    return undefined;
  }


  if (
    !directions.title &&
    !directions.items?.length
  ) {

    return undefined;

  }


  return {

    title:
      text(directions.title),

    items:
      Array.isArray(
        directions.items
      )

        ? directions.items.map(
            (item) => ({

              subtitle:
                text(
                  item.subtitle
                ),

              content:
                text(
                  item.content
                )

            })
          )

        : []

  };

}


// ==========================================================
// RECALCULATE STOCK TOTALS
// ==========================================================

async function recalculateStockTotals(
  session = null
) {

  const query =
    Stock.find({
      isActive: true
    })
      .select(
        "_id category units buyPrice"
      );


  if (session) {
    query.session(session);
  }


  const stocks =
    await query.lean();


  const categoryTotals =
    new Map();


  let overall = 0;


  // --------------------------------------------------------
  // CALCULATE TOTALS
  // --------------------------------------------------------

  for (
    const stock of stocks
  ) {

    const value =
      Number(
        stock.units || 0
      ) *
      Number(
        stock.buyPrice || 0
      );


    const categoryId =
      String(
        stock.category
      );


    categoryTotals.set(
      categoryId,
      (
        categoryTotals.get(
          categoryId
        ) || 0
      ) + value
    );


    overall += value;

  }


  // --------------------------------------------------------
  // SAVE TOTALS
  // --------------------------------------------------------

  const now =
    new Date();


  for (
    const stock of stocks
  ) {

    const value =
      Number(
        stock.units || 0
      ) *
      Number(
        stock.buyPrice || 0
      );


    const categoryId =
      String(
        stock.category
      );


    await Stock.updateOne(

      {
        _id:
          stock._id
      },

      {
        $set: {

          cashOutflow:
            value,

          categoryOveral:
            categoryTotals.get(
              categoryId
            ) || 0,

          overal:
            overall,

          totalsUpdatedAt:
            now

        }
      },

      {
        session,
        timestamps: true
      }

    );

  }


  return {

    categoryTotals,

    overal:
      overall

  };

}


// ==========================================================
// GET ACTIVE CATEGORIES
// ==========================================================
//
// THIS IS THE DATABASE-BACKED SOURCE FOR THE FRONTEND.
//
// Returns complete Category documents:
//
//   _id
//   name
//   categoryIcon
//   isActive
//
// The controller passes this array directly to:
//
//   views/stock/product-entry.ejs
//
// The EJS can therefore use:
//
//   category._id
//   category.name
//   category.categoryIcon
//
// No hard-coded category list.
// No enum.
// No conversion to strings.
// ==========================================================

exports.getCategories =
  async () => {

    return Category
      .find({
        isActive: true
      })
      .select(
        "_id name categoryIcon isActive"
      )
      .sort({
        name: 1
      })
      .lean();

  };


// ==========================================================
// LIST STOCK
// ==========================================================

exports.listStock =
  async () => {

    const stocks =
      await Stock.find({
        isActive: true
      })
        .populate({
          path:
            "category",

          select:
            "_id name categoryIcon isActive"
        })
        .sort({
          subcategory: 1,
          name: 1,
          createdAt: 1
        })
        .lean();


    const categoryMap =
      new Map();


    for (
      const stock of stocks
    ) {

      if (!stock.category) {
        continue;
      }


      const categoryId =
        String(
          stock.category._id
        );


      if (
        !categoryMap.has(
          categoryId
        )
      ) {

        categoryMap.set(
          categoryId,
          {

            category:
              stock.category,

            label:
              displayLabel(
                stock.category.name
              ),

            stocks: []

          }
        );

      }


      categoryMap
        .get(categoryId)
        .stocks
        .push(stock);

    }


    return Array.from(
      categoryMap.values()
    ).map((group) => {

      const rows = [];


      for (
        let i = 0;
        i < group.stocks.length;
        i += 6
      ) {

        rows.push({

          products:
            group.stocks.slice(
              i,
              i + 6
            )

        });

      }


      return {

        ...group,

        rows

      };

    });

  };


// ==========================================================
// GET SINGLE STOCK
// ==========================================================

exports.getStock =
  async (id) => {

    if (
      !mongoose.isValidObjectId(
        id
      )
    ) {

      return null;

    }


    return Stock.findOne({

      _id:
        id,

      isActive:
        true

    })
      .populate({

        path:
          "category",

        select:
          "_id name categoryIcon isActive"

      })
      .lean();

  };


// ==========================================================
// GET STOCK RECORDS
// ==========================================================
//
// Used by the stock-entry/update interface.
//
// Category remains populated as the actual Category object.
// ==========================================================

exports.getStockCategories =
  () =>

    Stock.find({
      isActive: true
    })
      .select(
        "name category subcategory days image units buyPrice description directionsOfUse"
      )
      .populate({

        path:
          "category",

        select:
          "_id name categoryIcon isActive"

      })
      .sort({

        subcategory:
          1,

        name:
          1

      })
      .lean();


// ==========================================================
// GET SUBSTATIONS
// ==========================================================

exports.getSubstations =
  () =>

    Substation.find({
      isActive: true
    })
      .select(
        "name location description productInventory"
      )
      .sort({
        name: 1
      })
      .lean();


// ==========================================================
// EXPORT RECALCULATION
// ==========================================================

exports.recalculateStockTotals =
  recalculateStockTotals;


// ==========================================================
// CREATE STOCK
// ==========================================================

exports.createStock =
  async (body) => {

    const name =
      cleanSubcategory(
        body.name ||
        body.subcategory
      );


    // ------------------------------------------------------
    // CATEGORY
    // ------------------------------------------------------

    const category =
      await validateCategory(
        body.category
      );


    const subcategory =
      cleanSubcategory(
        body.subcategory
      );


    const units =
      wholeNumber(
        body.units,
        "Warehouse units",
        true
      );


    const buyPrice =
      number(
        body.buyPrice,
        "Buy price",
        true
      );


    const days =
      wholeNumber(
        body.days || 0,
        "Delivery days"
      );


    const image =
      text(body.image);


    const description =
      text(body.description);


    const directionsOfUse =
      cleanDirectionsOfUse(
        body.directionsOfUse
      );


    if (!subcategory) {

      throw new Error(
        "Subcategory is required."
      );

    }


    // ------------------------------------------------------
    // DUPLICATE
    // ------------------------------------------------------

    const existing =
      await Stock.findOne({

        category,

        subcategory,

        isActive:
          true

      });


    if (existing) {

      throw new Error(
        `The subcategory "${subcategory}" already exists under the selected category. Select the existing stock record to update it.`
      );

    }


    // ------------------------------------------------------
    // CREATE
    // ------------------------------------------------------

    const stock =
      await Stock.create({

        name:
          name || subcategory,

        category,

        subcategory,

        days,

        image,

        units,

        buyPrice,

        description,

        directionsOfUse:
          directionsOfUse ||
          undefined

      });


    // ------------------------------------------------------
    // RECALCULATE
    // ------------------------------------------------------

    await recalculateStockTotals();


    return Stock.findById(
      stock._id
    )
      .populate({

        path:
          "category",

        select:
          "_id name categoryIcon isActive"

      })
      .lean();

  };


// ==========================================================
// UPDATE STOCK ENTRY
// ==========================================================

exports.updateStockEntry =
  async (
    stockId,
    body
  ) => {

    if (
      !mongoose.isValidObjectId(
        stockId
      )
    ) {

      throw new Error(
        "Invalid stock subcategory."
      );

    }


    const stock =
      await Stock.findOne({

        _id:
          stockId,

        isActive:
          true

      });


    if (!stock) {

      throw new Error(
        "Stock subcategory not found."
      );

    }


    // ------------------------------------------------------
    // CATEGORY
    // ------------------------------------------------------

    const category =
      await validateCategory(

        body.category ||
        stock.category

      );


    // ------------------------------------------------------
    // SUBCATEGORY
    // ------------------------------------------------------

    const subcategory =
      cleanSubcategory(

        body.subcategory ||
        stock.subcategory

      );


    // ------------------------------------------------------
    // ADDITIONAL UNITS
    // ------------------------------------------------------

    const additionalUnits =
      wholeNumber(

        body.additionalUnits ??
        0,

        "Additional units"

      );


    // ------------------------------------------------------
    // BUY PRICE
    // ------------------------------------------------------

    const buyPrice =
      number(

        body.buyPrice,

        "Buy price",

        true

      );


    // ------------------------------------------------------
    // DELIVERY DAYS
    // ------------------------------------------------------

    const days =
      wholeNumber(

        body.days ??
        stock.days ??
        0,

        "Delivery days"

      );


    const directionsOfUse =
      cleanDirectionsOfUse(
        body.directionsOfUse
      );


    if (!subcategory) {

      throw new Error(
        "Subcategory is required."
      );

    }


    // ------------------------------------------------------
    // DUPLICATE
    // ------------------------------------------------------

    const duplicate =
      await Stock.findOne({

        _id: {
          $ne:
            stock._id
        },

        category,

        subcategory,

        isActive:
          true

      });


    if (duplicate) {

      throw new Error(
        `The subcategory "${subcategory}" already belongs to another stock record under the selected category.`
      );

    }


    // ------------------------------------------------------
    // UPDATE
    // ------------------------------------------------------

    stock.name =
      subcategory;


    stock.category =
      category;


    stock.subcategory =
      subcategory;


    stock.days =
      days;


    stock.buyPrice =
      buyPrice;


    stock.description =
      text(
        body.description
      );


    stock.units =
      Number(
        stock.units || 0
      ) +
      additionalUnits;


    if (
      directionsOfUse !==
      undefined
    ) {

      stock.directionsOfUse =
        directionsOfUse ||
        undefined;

    }


    const image =
      text(body.image);


    if (image) {

      stock.image =
        image;

    }


    await stock.save();


    // ======================================================
    // SYNCHRONIZE PRODUCTS
    // ======================================================

    const productSync = {

      $set: {

        name:
          stock.name,

        category:
          stock.category,

        subcategory:
          stock.subcategory,

        days:
          Number(
            stock.days || 0
          ),

        image:
          stock.image || "",

        buyPrice:
          Number(
            stock.buyPrice || 0
          ),

        description:
          stock.description || ""

      }

    };


    const productDirections =
      directionsForProduct(
        stock
      );


    if (productDirections) {

      productSync.$set
        .directionsOfUse =
        productDirections;

    } else {

      productSync.$unset = {

        directionsOfUse:
          1

      };

    }


    await Product.updateMany(

      {

        stock:
          stock._id,

        isActive:
          true

      },

      productSync

    );


    // ======================================================
    // SYNCHRONIZE SUBSTATION INVENTORY
    // ======================================================

    const productIds =
      await Product.find({

        stock:
          stock._id

      }).distinct(
        "_id"
      );


    if (productIds.length) {

      await Substation.updateMany(

        {

          "productInventory.productId":
            {
              $in:
                productIds
            }

        },

        {

          $set: {

            "productInventory.$[item].productName":
              stock.name,

            "productInventory.$[item].category":
              stock.category,

            "productInventory.$[item].subcategory":
              stock.subcategory,

            "productInventory.$[item].days":
              Number(
                stock.days || 0
              ),

            "productInventory.$[item].updatedAt":
              new Date()

          }

        },

        {

          arrayFilters: [

            {

              "item.productId":
                {
                  $in:
                    productIds
                }

            }

          ]

        }

      );

    }


    // ------------------------------------------------------
    // RECALCULATE
    // ------------------------------------------------------

    await recalculateStockTotals();


    return Stock.findById(
      stock._id
    )
      .populate({

        path:
          "category",

        select:
          "_id name categoryIcon isActive"

      })
      .lean();

  };


// ==========================================================
// NORMALIZE ALLOCATIONS
// ==========================================================

function normalizeAllocations(
  input
) {

  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {

    return [];

  }


  return Object.entries(
    input
  )
    .map(
      ([
        substationId,
        rawValue
      ]) => ({

        substationId:
          text(substationId),

        units:
          wholeNumber(

            rawValue,

            `Units for substation ${substationId}`

          )

      })
    )
    .filter(

      (entry) =>
        entry.substationId &&
        entry.units > 0

    );

}


// ==========================================================
// CREATE PRODUCT FROM STOCK
// ==========================================================

exports.createProductFromStock =
  async (
    stockId,
    body
  ) => {

    if (
      !mongoose.isValidObjectId(
        stockId
      )
    ) {

      throw new Error(
        "Invalid stock."
      );

    }


    const unitSellPrice =
      number(

        body.unitSellPrice,

        "Selling price",

        true

      );


    const allocations =
      normalizeAllocations(
        body.allocations
      );


    if (!allocations.length) {

      throw new Error(
        "Allocate at least one unit to at least one substation."
      );

    }


    const allocationTotal =
      allocations.reduce(

        (sum, item) =>
          sum + item.units,

        0

      );


    const ids =
      allocations.map(
        (item) =>
          item.substationId
      );


    // ------------------------------------------------------
    // VALIDATE IDs
    // ------------------------------------------------------

    if (

      ids.some(

        (id) =>
          !mongoose.isValidObjectId(
            id
          )

      )

    ) {

      throw new Error(
        "One or more selected substations are invalid."
      );

    }


    // ------------------------------------------------------
    // DUPLICATE SUBSTATIONS
    // ------------------------------------------------------

    if (

      new Set(ids).size !==
      ids.length

    ) {

      throw new Error(
        "Each substation can appear only once in the allocation."
      );

    }


    const session =
      await mongoose.startSession();


    let product;


    try {

      await session.withTransaction(
        async () => {

          // ==================================================
          // GET STOCK
          // ==================================================

          const stock =
            await Stock.findOne({

              _id:
                stockId,

              isActive:
                true

            })
              .populate({

                path:
                  "category",

                select:
                  "_id name categoryIcon isActive"

              })
              .session(
                session
              );


          if (!stock) {

            throw new Error(
              "Stock subcategory not found."
            );

          }


          // ==================================================
          // CATEGORY
          // ==================================================

          if (

            !stock.category ||
            !stock.category._id

          ) {

            throw new Error(
              "The category assigned to this stock record no longer exists or is inactive."
            );

          }


          const warehouseUnits =
            Number(
              stock.units || 0
            );


          // ==================================================
          // STOCK CHECK
          // ==================================================

          if (

            allocationTotal >
            warehouseUnits

          ) {

            throw new Error(

              `Only ${warehouseUnits} units are available in this stock subcategory.`

            );

          }


          // ==================================================
          // GET SUBSTATIONS
          // ==================================================

          const substations =
            await Substation.find({

              _id: {
                $in:
                  ids
              },

              isActive:
                true

            })
              .session(
                session
              );


          const substationMap =
            new Map(

              substations.map(
                (s) => [

                  String(
                    s._id
                  ),

                  s

                ]
              )

            );


          // ==================================================
          // VALIDATE SUBSTATIONS
          // ==================================================

          for (
            const allocation of
              allocations
          ) {

            if (
              !substationMap.has(
                allocation.substationId
              )
            ) {

              throw new Error(
                "One or more selected substations were not found or are inactive."
              );

            }

          }


          // ==================================================
          // FIND EXISTING PRODUCT
          // ==================================================

          let existingProduct =
            await Product.findOne({

              stock:
                stock._id,

              isActive:
                true

            })
              .session(
                session
              );


          // ==================================================
          // STOCK DATA INHERITED BY PRODUCT
          // ==================================================

          const inherited = {

            name:
              stock.name,

            category:
              stock.category._id,

            subcategory:
              stock.subcategory,

            days:
              Number(
                stock.days || 0
              ),

            image:
              stock.image || "",

            buyPrice:
              Number(
                stock.buyPrice || 0
              ),

            description:
              stock.description || "",

            directionsOfUse:
              directionsForProduct(
                stock
              )

          };


          // ==================================================
          // UPDATE EXISTING PRODUCT
          // ==================================================

          if (
            existingProduct
          ) {

            existingProduct.units =
              Number(
                existingProduct.units ||
                0
              ) +
              allocationTotal;


            existingProduct.unitSellPrice =
              unitSellPrice;


            Object.assign(
              existingProduct,
              inherited
            );


            await existingProduct.save({
              session
            });


            product =
              existingProduct;

          }


          // ==================================================
          // CREATE PRODUCT
          // ==================================================

          else {

            const created =
              await Product.create(

                [

                  {

                    stock:
                      stock._id,

                    ...inherited,

                    units:
                      allocationTotal,

                    unitSellPrice

                  }

                ],

                {
                  session
                }

              );


            product =
              created[0];

          }


          // ==================================================
          // DEDUCT STOCK
          // ==================================================

          stock.units =
            warehouseUnits -
            allocationTotal;


          await stock.save({
            session
          });


          // ==================================================
          // UPDATE SUBSTATION INVENTORY
          // ==================================================

          for (
            const allocation of
              allocations
          ) {

            const substation =
              substationMap.get(
                allocation.substationId
              );


            const inventory =
              substation.productInventory.find(

                (entry) =>

                  String(
                    entry.productId
                  ) ===
                  String(
                    product._id
                  )

              );


            // ------------------------------------------------
            // EXISTING INVENTORY
            // ------------------------------------------------

            if (inventory) {

              inventory.units =
                Number(
                  inventory.units ||
                  0
                ) +
                allocation.units;


              inventory.productName =
                product.name;


              inventory.category =
                product.category;


              inventory.subcategory =
                product.subcategory;


              inventory.days =
                Number(
                  product.days ||
                  0
                );


              inventory.updatedAt =
                new Date();

            }


            // ------------------------------------------------
            // NEW INVENTORY
            // ------------------------------------------------

            else {

              substation.productInventory.push({

                productId:
                  product._id,

                productName:
                  product.name,

                category:
                  product.category,

                subcategory:
                  product.subcategory,

                days:
                  Number(
                    product.days ||
                    0
                  ),

                units:
                  allocation.units,

                updatedAt:
                  new Date()

              });

            }


            await substation.save({
              session
            });

          }


          // ==================================================
          // RECALCULATE TOTALS
          // ==================================================

          await recalculateStockTotals(
            session
          );

        }
      );


      return product;

    } finally {

      await session.endSession();

    }

  };