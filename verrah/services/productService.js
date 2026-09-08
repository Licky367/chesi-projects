// ==========================================================
// verrah/services/productService.js
// PRODUCT SERVICE
// ==========================================================

const mongoose = require("mongoose");

const Product = require("../models/products");
const Stock = require("../models/stock");

// IMPORTANT:
// Explicitly register Category before populate() is used.
const Category = require("../models/category");


// ==========================================================
// CHUNK PRODUCTS INTO ROWS
// ==========================================================
//
// Desktop:
//     Maximum 6 products per row.
//
// Mobile:
//     Frontend CSS handles horizontal scrolling.
//
// ==========================================================

function chunk(items, size = 6) {

  const rows = [];

  for (
    let i = 0;
    i < items.length;
    i += size
  ) {

    rows.push({
      products: items.slice(i, i + size)
    });

  }

  return rows;
}


// ==========================================================
// NORMALIZE DIRECTIONS OF USE
// ==========================================================

function normalizeDirections(directions) {

  if (!directions) {
    return undefined;
  }


  const items = Array.isArray(
    directions.items
  )

    ? directions.items
        .map((item) => {

          return {
            subtitle: String(
              item?.subtitle || ""
            ).trim(),

            content: String(
              item?.content || ""
            ).trim()
          };

        })
        .filter((item) => {

          return (
            item.subtitle &&
            item.content
          );

        })

    : [];


  const title = String(
    directions.title || ""
  ).trim();


  if (
    !title &&
    items.length === 0
  ) {

    return undefined;

  }


  return {
    title,
    items
  };
}


// ==========================================================
// GET CATEGORY NAME
// ==========================================================
//
// This function accepts the populated Category.
//
// It NEVER converts an ObjectId into a fake label.
//
// It gets the actual Category.name.
//
// ==========================================================

function getCategoryName(category) {

  if (
    category &&
    typeof category === "object" &&
    typeof category.name === "string"
  ) {

    const name = category.name.trim();

    if (name) {
      return name;
    }

  }


  return "Other";
}


// ==========================================================
// PREPARE PRODUCT FOR FRONTEND
// ==========================================================
//
// MongoDB:
//
//     category: Category._id
//
// After populate:
//
//     category: {
//         _id: "...",
//         name: "skin care"
//     }
//
// Before sending to EJS:
//
//     categoryName: "skin care"
//
//     category is removed.
//
// ==========================================================

function prepareProduct(product) {

  if (!product) {
    return null;
  }


  const prepared = {
    ...product
  };


  // --------------------------------------------------------
  // RESOLVE ACTUAL CATEGORY NAME
  // --------------------------------------------------------

  prepared.categoryName =
    getCategoryName(
      prepared.category
    );


  // --------------------------------------------------------
  // REMOVE CATEGORY OBJECT
  // --------------------------------------------------------
  //
  // The frontend does not need:
  //
  //     category._id
  //
  //     category.name
  //
  // It only needs:
  //
  //     categoryName
  //
  // --------------------------------------------------------

  delete prepared.category;


  return prepared;
}


// ==========================================================
// GET PRODUCTS BY CATEGORY
// ==========================================================
//
// FRONTEND RESULT:
//
// [
//   {
//     label: "skin care",
//     categoryName: "skin care",
//     rows: [
//       {
//         products: [ ... up to 6 ... ]
//       }
//     ]
//   }
// ]
//
// NO Category._id is exposed here.
//
// ==========================================================

async function getProductsByCategory() {

  // ========================================================
  // FETCH ACTIVE PRODUCTS
  // ========================================================

  const products = await Product.find({
    isActive: true
  })

    // ------------------------------------------------------
    // RESOLVE CATEGORY REFERENCE
    // ------------------------------------------------------

    .populate({
      path: "category",
      select: "name"
    })

    // ------------------------------------------------------
    // SORT PRODUCTS
    // ------------------------------------------------------

    .sort({
      name: 1,
      createdAt: 1
    })

    .lean();


  // ========================================================
  // CATEGORY MAP
  // ========================================================
  //
  // IMPORTANT:
  //
  // The Map is keyed by the CATEGORY NAME.
  //
  // We are not using Category._id for frontend grouping.
  //
  // ========================================================

  const categoryMap = new Map();


  // ========================================================
  // PROCESS PRODUCTS
  // ========================================================

  for (const rawProduct of products) {

    const product =
      prepareProduct(rawProduct);


    if (!product) {
      continue;
    }


    // ------------------------------------------------------
    // ACTUAL CATEGORY NAME
    // ------------------------------------------------------

    const categoryName =
      product.categoryName ||
      "Other";


    // ------------------------------------------------------
    // CREATE CATEGORY GROUP
    // ------------------------------------------------------

    if (
      !categoryMap.has(categoryName)
    ) {

      categoryMap.set(
        categoryName,
        {
          label: categoryName,
          categoryName,
          products: []
        }
      );

    }


    // ------------------------------------------------------
    // ADD PRODUCT
    // ------------------------------------------------------

    const group =
      categoryMap.get(categoryName);


    group.products.push(product);

  }


  // ========================================================
  // CONVERT MAP INTO FRONTEND STRUCTURE
  // ========================================================

  return Array.from(
    categoryMap.values()
  ).map((group) => {

    return {

      // ----------------------------------------------------
      // CATEGORY NAME
      // ----------------------------------------------------

      label: group.label,

      categoryName:
        group.categoryName,


      // ----------------------------------------------------
      // PRODUCT ROWS
      // ----------------------------------------------------

      rows: chunk(
        group.products,
        6
      )

    };

  });
}


// ==========================================================
// GET SINGLE PRODUCT
// ==========================================================
//
// Used by:
//
//     GET /products/:id
//
// ==========================================================

async function getProduct(id) {

  // ========================================================
  // VALIDATE PRODUCT ID
  // ========================================================

  if (
    !mongoose.Types.ObjectId.isValid(id)
  ) {

    return null;

  }


  // ========================================================
  // FIND PRODUCT
  // ========================================================

  const product =
    await Product.findOne({
      _id: id,
      isActive: true
    })

      // ----------------------------------------------------
      // RESOLVE CATEGORY
      // ----------------------------------------------------

      .populate({
        path: "category",
        select: "name"
      })

      .lean();


  // ========================================================
  // PRODUCT NOT FOUND
  // ========================================================

  if (!product) {
    return null;
  }


  // ========================================================
  // CATEGORY NAME
  // ========================================================

  product.categoryName =
    getCategoryName(
      product.category
    );


  // ========================================================
  // REMOVE CATEGORY OBJECT
  // ========================================================
  //
  // Product-details EJS should use:
  //
  //     product.categoryName
  //
  // NOT:
  //
  //     product.category._id
  //
  // ========================================================

  delete product.category;


  // ========================================================
  // PRODUCT DIRECTIONS
  // ========================================================

  const productDirections =
    normalizeDirections(
      product.directionsOfUse
    );


  // ========================================================
  // STOCK DIRECTIONS FALLBACK
  // ========================================================
  //
  // This preserves compatibility with older products whose
  // directions were stored on Stock instead of Product.
  //
  // ========================================================

  if (
    !productDirections &&
    product.stock &&
    mongoose.Types.ObjectId.isValid(
      product.stock
    )
  ) {

    const stock =
      await Stock.findById(
        product.stock
      )
        .select("directionsOfUse")
        .lean();


    product.directionsOfUse =
      normalizeDirections(
        stock?.directionsOfUse
      );

  } else {

    product.directionsOfUse =
      productDirections;

  }


  // ========================================================
  // RETURN PRODUCT
  // ========================================================

  return product;
}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

  getProductsByCategory,

  getProduct

};