// =========================================================
// services/cartService.js
// VERRAH COSMETICS
// CART SERVICE
// =========================================================

const mongoose =
  require("mongoose");

const Product =
  require("../models/products");

const Cart =
  require("../models/carts");

const StaffSale =
  require("../models/staff-sales");

const Substation =
  require("../models/substations");

const User =
  require("../models/user");

const {
  getUserId,
  getSessionId
} =
  require("./shopContext");


// =========================================================
// GET OR CREATE CART
// =========================================================

async function getOrCreateCart(
  req,
  session = null
) {

  const sessionId =
    getSessionId(req);

  if (!sessionId) {
    throw new Error(
      "A session or logged-in user is required."
    );
  }


  let cart =
    await Cart.findOne({
      sessionId
    }).session(session);


  if (!cart) {

    cart =
      new Cart({
        sessionId,

        user:
          getUserId(req),

        items: []
      });

    await cart.save({
      session
    });

  } else if (
    !cart.user &&
    getUserId(req)
  ) {

    cart.user =
      getUserId(req);

    await cart.save({
      session
    });
  }


  return cart;
}


// =========================================================
// ADD TO CART
// =========================================================

async function addToCart(
  req,
  productId,
  requestedQty
) {

  const qty =
    Number(requestedQty);


  if (
    !Number.isInteger(qty) ||
    qty < 1
  ) {

    throw new Error(
      "Quantity must be a whole number greater than zero."
    );
  }


  const dbSession =
    await mongoose.startSession();


  try {

    let result;


    await dbSession.withTransaction(
      async () => {

        // --------------------------------------------------
        // Reserve product stock
        // --------------------------------------------------

        const product =
          await Product.findOneAndUpdate(
            {
              _id: productId,

              isActive: true,

              $expr: {
                $gte: [
                  {
                    $subtract: [
                      "$units",

                      {
                        $ifNull: [
                          "$reservedUnits",
                          0
                        ]
                      }
                    ]
                  },

                  qty
                ]
              }
            },

            {
              $inc: {
                reservedUnits: qty
              }
            },

            {
              new: true,

              session:
                dbSession
            }
          ).lean();


        if (!product) {

          throw new Error(
            "The requested quantity is not available."
          );
        }


        // --------------------------------------------------
        // Get cart
        // --------------------------------------------------

        const cart =
          await getOrCreateCart(
            req,
            dbSession
          );


        const existing =
          cart.items.find(
            item =>
              String(
                item.productId
              ) ===
              String(
                product._id
              )
          );


        // --------------------------------------------------
        // Existing product
        // --------------------------------------------------

        if (existing) {

          existing.qty += qty;

          existing.name =
            product.name;

          existing.price =
            product.unitSellPrice;

          existing.image =
            product.image || "";

        }


        // --------------------------------------------------
        // New product
        // --------------------------------------------------

        else {

          cart.items.push({

            product:
              product._id,

            productId:
              String(
                product._id
              ),

            name:
              product.name,

            price:
              product.unitSellPrice,

            image:
              product.image || "",

            qty
          });
        }


        await cart.save({
          session:
            dbSession
        });


        result =
          cart;
      }
    );


    return result;

  } finally {

    await dbSession.endSession();
  }
}


// =========================================================
// GET CART
// =========================================================

async function getCart(req) {

  const sessionId =
    getSessionId(req);


  if (!sessionId) {
    return null;
  }


  return Cart.findOne({
    sessionId
  })
    .populate(
      "items.product"
    )
    .lean();
}


// =========================================================
// REMOVE CART ITEM
// =========================================================

async function removeItem(
  req,
  productId
) {

  const cart =
    await getCart(req);


  if (!cart) {

    throw new Error(
      "Cart not found."
    );
  }


  const item =
    cart.items.find(
      i =>
        String(
          i.productId
        ) ===
        String(
          productId
        )
    );


  if (!item) {

    throw new Error(
      "Item is not in the cart."
    );
  }


  const dbSession =
    await mongoose.startSession();


  try {

    await dbSession.withTransaction(
      async () => {

        // --------------------------------------------------
        // Release reservation
        // --------------------------------------------------

        const product =
          await Product.findById(
            productId
          ).session(
            dbSession
          );


        if (product) {

          product.reservedUnits =
            Math.max(
              0,

              Number(
                product.reservedUnits ||
                0
              ) -

              Number(
                item.qty ||
                0
              )
            );


          await product.save({
            session:
              dbSession
          });
        }


        // --------------------------------------------------
        // Remove cart item
        // --------------------------------------------------

        await Cart.updateOne(

          {
            _id:
              cart._id
          },

          {
            $pull: {
              items: {
                productId:
                  String(
                    productId
                  )
              }
            }
          },

          {
            session:
              dbSession
          }
        );
      }
    );

  } finally {

    await dbSession.endSession();
  }
}


// =========================================================
// CREATE STAFF SALE
// =========================================================

async function createStaffSale(
  req,
  salesName
) {

  // -------------------------------------------------------
  // Validate logged-in user
  // -------------------------------------------------------

  const userId =
    getUserId(req);


  if (!userId) {

    throw new Error(
      "You must be logged in to record a sale."
    );
  }


  // -------------------------------------------------------
  // Validate sales name
  // -------------------------------------------------------

  const cleanSalesName =
    String(
      salesName ||
      ""
    ).trim();


  if (!cleanSalesName) {

    throw new Error(
      "Sales name is required."
    );
  }


  if (
    cleanSalesName.length >
    150
  ) {

    throw new Error(
      "Sales name cannot exceed 150 characters."
    );
  }


  const dbSession =
    await mongoose.startSession();


  try {

    let sale;


    await dbSession.withTransaction(
      async () => {

        // =================================================
        // GET STAFF USER
        // =================================================

        const staff =
          await User.findById(
            userId
          ).session(
            dbSession
          );


        if (!staff) {

          throw new Error(
            "Staff user was not found."
          );
        }


        // -------------------------------------------------
        // Role verification
        // -------------------------------------------------

        if (
          String(
            staff.role ||
            ""
          ).toLowerCase() !==
          "staff"
        ) {

          throw new Error(
            "Only staff members can record staff sales."
          );
        }


        // -------------------------------------------------
        // Assigned substation verification
        // -------------------------------------------------

        if (
          !staff.assignedSubstation
        ) {

          throw new Error(
            "You are not assigned to a substation."
          );
        }


        // =================================================
        // GET CART
        // =================================================

        const sessionId =
          getSessionId(req);


        if (!sessionId) {

          throw new Error(
            "A session or logged-in user is required."
          );
        }


        const cart =
          await Cart.findOne({
            sessionId
          }).session(
            dbSession
          );


        if (
          !cart ||
          !cart.items ||
          !cart.items.length
        ) {

          throw new Error(
            "Your cart is empty."
          );
        }


        // =================================================
        // GET SUBSTATION
        // =================================================

        const substation =
          await Substation.findById(
            staff.assignedSubstation
          ).session(
            dbSession
          );


        if (!substation) {

          throw new Error(
            "Your assigned substation could not be found."
          );
        }


        // =================================================
        // BUILD SALE PRODUCTS
        // =================================================

        const saleProducts = [];

        let totalAmount = 0;


        for (
          const cartItem of cart.items
        ) {

          const productId =
            cartItem.productId;


          const qty =
            Number(
              cartItem.qty ||
              0
            );


          const price =
            Number(
              cartItem.price ||
              0
            );


          if (!productId) {

            throw new Error(
              "A cart item has no product ID."
            );
          }


          if (
            !Number.isInteger(qty) ||
            qty < 1
          ) {

            throw new Error(
              `Invalid quantity for ${cartItem.name || "a cart item"}.`
            );
          }


          if (
            !Number.isFinite(price) ||
            price < 0
          ) {

            throw new Error(
              `Invalid selling price for ${cartItem.name || "a cart item"}.`
            );
          }


          const lineTotal =
            price * qty;


          totalAmount +=
            lineTotal;


          saleProducts.push({

            productId,

            name:
              cartItem.name ||
              "",

            image:
              cartItem.image ||
              "",

            category:
              cartItem.category ||
              "",

            subcategory:
              cartItem.subcategory ||
              "",

            qty,

            price,

            total:
              lineTotal
          });
        }


        // =================================================
        // UPDATE PRODUCTS
        // =================================================

        for (
          const saleItem of saleProducts
        ) {

          const product =
            await Product.findById(
              saleItem.productId
            ).session(
              dbSession
            );


          if (!product) {

            throw new Error(
              `Product "${saleItem.name}" no longer exists.`
            );
          }


          const reservedUnits =
            Number(
              product.reservedUnits ||
              0
            );


          const physicalUnits =
            Number(
              product.units ||
              0
            );


          if (
            reservedUnits <
            saleItem.qty
          ) {

            throw new Error(
              `Reserved quantity for "${saleItem.name}" is insufficient.`
            );
          }


          if (
            physicalUnits <
            saleItem.qty
          ) {

            throw new Error(
              `Physical stock for "${saleItem.name}" is insufficient.`
            );
          }


          // ------------------------------------------------
          // Convert reservation into completed sale
          // ------------------------------------------------

          product.units =
            physicalUnits -
            saleItem.qty;


          product.reservedUnits =
            reservedUnits -
            saleItem.qty;


          await product.save({
            session:
              dbSession
          });
        }


        // =================================================
        // UPDATE SUBSTATION REDUCTIONS
        // =================================================

        for (
          const saleItem of saleProducts
        ) {

          let reduction =
            substation.productReductions.find(
              item =>
                String(
                  item.productId
                ) ===
                String(
                  saleItem.productId
                )
            );


          if (!reduction) {

            reduction = {

              productId:
                saleItem.productId,

              productName:
                saleItem.name,

              category:
                saleItem.category ||
                "",

              unitsReduced:
                0,

              lastReducedAt:
                null
            };


            substation.productReductions.push(
              reduction
            );


            reduction =
              substation.productReductions[
                substation.productReductions.length -
                1
              ];
          }


          reduction.productName =
            saleItem.name;


          reduction.category =
            saleItem.category ||
            reduction.category ||
            "";


          reduction.unitsReduced =
            Number(
              reduction.unitsReduced ||
              0
            ) +
            saleItem.qty;


          reduction.lastReducedAt =
            new Date();
        }


        await substation.save({
          session:
            dbSession
        });


        // =================================================
        // CREATE STAFF SALE RECORD
        // =================================================

        sale =
          new StaffSale({

            salesName:
              cleanSalesName,

            products:
              saleProducts,

            totalAmount,

            soldBy:
              staff._id
          });


        await sale.save({
          session:
            dbSession
        });


        // =================================================
        // CLEAR CART
        // =================================================

        cart.items = [];

        await cart.save({
          session:
            dbSession
        });
      }
    );


    return sale;

  } finally {

    await dbSession.endSession();
  }
}


// =========================================================
// CALCULATE TOTAL
// =========================================================

function calculateTotal(
  cart
) {

  return (
    cart?.items || []
  ).reduce(

    (
      sum,
      item
    ) =>

      sum +
      Number(
        item.price ||
        0
      ) *
      Number(
        item.qty ||
        0
      ),

    0
  );
}


// =========================================================
// EXPORTS
// =========================================================

module.exports = {

  getOrCreateCart,

  addToCart,

  getCart,

  removeItem,

  calculateTotal,

  createStaffSale
};