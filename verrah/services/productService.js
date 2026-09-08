// ==========================================================
// services/productService.js
// PRODUCT SERVICE
//
// IMPORTANT:
//
// Product.category stores Category._id.
//
// Stock.category stores Category.name.
//
// Therefore:
//
// Product.category
//       ↓
// Category._id
//       ↓
// Category document
//       ↓
// Category.name
//
// The views receive the populated Category document so they
// can display:
//
//     product.category.name
//
// rather than:
//
//     product.category   // ObjectId
// ==========================================================

const mongoose = require("mongoose");

const Product =
  require("../models/products");

const Stock =
  require("../models/stock");

const Category =
  require("../models/category");


// ==========================================================
// HELPERS
// ==========================================================

const text = (value) =>
  String(value ?? "").trim();


// ==========================================================
// DISPLAY LABEL
// ==========================================================

function label(value) {
  return text(value || "other")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) =>
      c.toUpperCase()
    );
}


// ==========================================================
// CHUNK PRODUCTS
// ==========================================================
//
// Six products per row.
// ==========================================================

function chunk(
  items,
  size = 6
) {
  const rows = [];

  for (
    let i = 0;
    i < items.length;
    i += size
  ) {
    rows.push({
      products:
        items.slice(
          i,
          i + size
        )
    });
  }

  return rows;
}


// ==========================================================
// NORMALIZE DIRECTIONS OF USE
// ==========================================================

function normalizeDirections(
  directions
) {
  if (!directions) {
    return undefined;
  }

  const items =
    Array.isArray(
      directions.items
    )
      ? directions.items
          .map(
            (item) => ({
              subtitle:
                text(
                  item?.subtitle
                ),

              content:
                text(
                  item?.content
                )
            })
          )
          .filter(
            (item) =>
              item.subtitle &&
              item.content
          )
      : [];

  const title =
    text(
      directions.title
    );

  if (
    !title &&
    !items.length
  ) {
    return undefined;
  }

  return {
    title,
    items
  };
}


// ==========================================================
// RESOLVE CATEGORY
// ==========================================================
//
// Product.category contains Category._id.
//
// This helper converts the stored ID into the actual
// Category document.
//
// Returned object:
//
// {
//   _id,
//   name,
//   categoryIcon,
//   isActive
// }
// ==========================================================

async function resolveCategory(
  categoryId
) {
  if (
    !categoryId ||
    !mongoose.isValidObjectId(
      categoryId
    )
  ) {
    return null;
  }

  return Category.findOne({
    _id:
      categoryId,

    isActive:
      true
  })
    .select(
      "_id name categoryIcon isActive"
    )
    .lean();
}


// ==========================================================
// GET PRODUCTS BY CATEGORY
// ==========================================================
//
// Product.category:
//
//     Category._id
//
// The Category document is loaded separately and attached
// to each group.
//
// Returned structure:
//
// [
//   {
//     category: {
//       _id,
//       name,
//       categoryIcon,
//       isActive
//     },
//
//     label: "Category Name",
//
//     rows: [
//       {
//         hasSubcategory: true,
//         subcategory: "...",
//         label: "...",
//         products: [...]
//       }
//     ]
//   }
// ]
//
// Therefore the EJS can use:
//
//     group.category.name
//
// instead of:
//
//     group.category
// ==========================================================

async function getProductsByCategory() {

  const products =
    await Product.find({
      isActive: true
    })
      .sort({
        category: 1,
        subcategory: 1,
        name: 1,
        createdAt: 1
      })
      .populate({
        path:
          "category",

        select:
          "_id name categoryIcon isActive",

        match: {
          isActive: true
        }
      })
      .lean();


  // --------------------------------------------------------
  // CATEGORY GROUPS
  // --------------------------------------------------------

  const categoryMap =
    new Map();


  for (
    const product
    of products
  ) {

    // ------------------------------------------------------
    // PRODUCTS WITHOUT A VALID CATEGORY
    // ------------------------------------------------------

    const categoryDocument =
      product.category;


    if (
      !categoryDocument
    ) {

      const fallbackCategory =
        "other";


      if (
        !categoryMap.has(
          fallbackCategory
        )
      ) {

        categoryMap.set(
          fallbackCategory,

          {
            category:
              null,

            label:
              "Other",

            subcategoryMap:
              new Map(),

            uncategorized:
              []
          }
        );
      }


      const group =
        categoryMap.get(
          fallbackCategory
        );


      const subcategory =
        text(
          product.subcategory
        );


      if (!subcategory) {

        group.uncategorized.push(
          product
        );

        continue;
      }


      if (
        !group.subcategoryMap.has(
          subcategory
        )
      ) {

        group.subcategoryMap.set(
          subcategory,

          {
            subcategory,

            label:
              label(
                subcategory
              ),

            products:
              []
          }
        );
      }


      group
        .subcategoryMap
        .get(
          subcategory
        )
        .products
        .push(
          product
        );

      continue;
    }


    // ------------------------------------------------------
    // CATEGORY DOCUMENT
    // ------------------------------------------------------

    const categoryId =
      String(
        categoryDocument._id
      );


    if (
      !categoryMap.has(
        categoryId
      )
    ) {

      categoryMap.set(
        categoryId,

        {
          // IMPORTANT:
          // Full Category document
          category:
            categoryDocument,

          // IMPORTANT:
          // Display Category.name
          label:
            categoryDocument.name,

          subcategoryMap:
            new Map(),

          uncategorized:
            []
        }
      );
    }


    const group =
      categoryMap.get(
        categoryId
      );


    // ------------------------------------------------------
    // SUBCATEGORY
    // ------------------------------------------------------

    const subcategory =
      text(
        product.subcategory
      );


    if (!subcategory) {

      group.uncategorized.push(
        product
      );

      continue;
    }


    if (
      !group.subcategoryMap.has(
        subcategory
      )
    ) {

      group.subcategoryMap.set(
        subcategory,

        {
          subcategory,

          label:
            label(
              subcategory
            ),

          products:
            []
        }
      );
    }


    group
      .subcategoryMap
      .get(
        subcategory
      )
      .products
      .push(
        product
      );
  }


  // --------------------------------------------------------
  // BUILD ROWS
  // --------------------------------------------------------

  return Array
    .from(
      categoryMap.values()
    )
    .map(
      (group) => {

        const rows = [];


        // --------------------------------------------------
        // SUBCATEGORIZED PRODUCTS
        // --------------------------------------------------

        for (
          const subcategory
          of group
            .subcategoryMap
            .values()
        ) {

          for (
            const row
            of chunk(
              subcategory.products,
              6
            )
          ) {

            rows.push({

              hasSubcategory:
                true,

              subcategory:
                subcategory.subcategory,

              label:
                subcategory.label,

              products:
                row.products
            });
          }
        }


        // --------------------------------------------------
        // PRODUCTS WITHOUT SUBCATEGORY
        // --------------------------------------------------

        for (
          const row
          of chunk(
            group.uncategorized,
            6
          )
        ) {

          rows.push({

            hasSubcategory:
              false,

            subcategory:
              "",

            label:
              "Other",

            products:
              row.products
          });
        }


        // --------------------------------------------------
        // RETURN CATEGORY
        // --------------------------------------------------

        return {

          // Full Category document
          category:
            group.category,

          // Category.name
          label:
            group.label,

          rows
        };
      }
    );
}


// ==========================================================
// GET SINGLE PRODUCT
// ==========================================================
//
// Product.category is populated with the Category document.
//
// Therefore the product details EJS can use:
//
//     product.category.name
//
// instead of:
//
//     product.category
// ==========================================================

async function getProduct(
  id
) {

  if (
    !mongoose.isValidObjectId(
      id
    )
  ) {
    return null;
  }


  const product =
    await Product.findOne({

      _id:
        id,

      isActive:
        true

    })
      .populate({

        path:
          "category",

        select:
          "_id name categoryIcon isActive",

        match: {
          isActive:
            true
        }
      })
      .lean();


  if (!product) {
    return null;
  }


  // --------------------------------------------------------
  // NORMALIZE DIRECTIONS STORED ON PRODUCT
  // --------------------------------------------------------

  const productDirections =
    normalizeDirections(
      product.directionsOfUse
    );


  // --------------------------------------------------------
  // FALLBACK TO STOCK
  // --------------------------------------------------------
  //
  // Older products may not have directionsOfUse directly
  // stored on Product.
  //
  // In that case retrieve them from Stock.
  // --------------------------------------------------------

  if (
    !productDirections &&
    product.stock
  ) {

    const stock =
      await Stock.findById(
        product.stock
      )
        .select(
          "directionsOfUse"
        )
        .lean();


    product.directionsOfUse =
      normalizeDirections(
        stock?.directionsOfUse
      );

  } else {

    product.directionsOfUse =
      productDirections;
  }


  return product;
}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

  getProductsByCategory,

  getProduct
};