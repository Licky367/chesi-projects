// ==========================================================
// verrah/services/cartService.js
//
// VERRAH COSMETICS
// CART SERVICE
//
// CART IDENTITY
// ----------------------------------------------------------
// Logged-in user:
//     Cart.user
//
// Guest:
//     Cart.sessionId
//
// IMPORTANT
// ----------------------------------------------------------
// Adding to cart DOES NOT reduce inventory.
//
// Inventory is reduced only when a completed sale occurs.
// ==========================================================

const mongoose = require("mongoose");

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
  getSessionId,
} = require("./shopContext");


/* ==========================================================
   ID HELPERS
========================================================== */

function getLoggedInUserId(req) {
  return getUserId(req);
}

function getCurrentSessionId(req) {
  return getSessionId(req);
}


/* ==========================================================
   CART ITEM HELPERS
========================================================== */

function getProductId(item) {
  if (!item) {
    return "";
  }

  if (item.product) {
    return String(
      item.product._id ||
      item.product
    );
  }

  if (item.productId) {
    return String(item.productId);
  }

  return "";
}


function getQuantity(item) {
  if (!item) {
    return 0;
  }

  const quantity =
    Number(item.quantity);

  if (
    Number.isInteger(quantity) &&
    quantity > 0
  ) {
    return quantity;
  }

  const legacyQty =
    Number(item.qty);

  if (
    Number.isInteger(legacyQty) &&
    legacyQty > 0
  ) {
    return legacyQty;
  }

  return 0;
}


function getItemName(item) {
  return (
    item?.name ||
    item?.product?.name ||
    "Product"
  );
}


/* ==========================================================
   GET OR CREATE CART
========================================================== */

async function getOrCreateCart(
  req,
  dbSession = null
) {
  const userId =
    getLoggedInUserId(req);

  const sessionId =
    getCurrentSessionId(req);


  /* ========================================================
     LOGGED-IN USER
  ======================================================== */

  if (userId) {
    /*
     * FIRST:
     * Find the permanent user cart.
     */

    let cart =
      await Cart.findOne({
        user: userId,
      }).session(
        dbSession
      );


    if (cart) {
      /*
       * Keep sessionId updated for compatibility.
       * The user remains the permanent identity.
       */

      if (
        sessionId &&
        cart.sessionId !== sessionId
      ) {
        cart.sessionId =
          sessionId;

        await cart.save({
          session:
            dbSession,
        });
      }

      return cart;
    }


    /*
     * SECOND:
     * Claim an existing guest/session cart.
     */

    if (sessionId) {
      cart =
        await Cart.findOne({
          sessionId,
          $or: [
            {
              user: null,
            },
            {
              user: {
                $exists: false,
              },
            },
          ],
        }).session(
          dbSession
        );


      if (cart) {
        cart.user =
          userId;

        await cart.save({
          session:
            dbSession,
        });

        return cart;
      }
    }


    /*
     * THIRD:
     * Create a permanent user cart.
     */

    cart =
      new Cart({
        user: userId,
        sessionId:
          sessionId || null,
        items: [],
      });

    await cart.save({
      session:
        dbSession,
    });

    return cart;
  }


  /* ========================================================
     GUEST
  ======================================================== */

  if (!sessionId) {
    throw new Error(
      "A session or logged-in user is required."
    );
  }


  let cart =
    await Cart.findOne({
      sessionId,
      $or: [
        {
          user: null,
        },
        {
          user: {
            $exists: false,
          },
        },
      ],
    }).session(
      dbSession
    );


  if (!cart) {
    cart =
      new Cart({
        sessionId,
        user: null,
        items: [],
      });

    await cart.save({
      session:
        dbSession,
    });
  }


  return cart;
}


/* ==========================================================
   ADD TO CART
========================================================== */

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


  if (
    !mongoose.isValidObjectId(
      productId
    )
  ) {
    throw new Error(
      "Invalid product."
    );
  }


  const dbSession =
    await mongoose.startSession();


  try {
    let result;


    await dbSession.withTransaction(
      async () => {
        /* ==================================================
           PRODUCT
        ================================================== */

        const product =
          await Product.findOne({
            _id: productId,
            isActive: true,
          }).session(
            dbSession
          );


        if (!product) {
          throw new Error(
            "The requested Product could not be found."
          );
        }


        /* ==================================================
           CART
        ================================================== */

        const cart =
          await getOrCreateCart(
            req,
            dbSession
          );


        /* ==================================================
           EXISTING ITEM
        ================================================== */

        const existing =
          cart.items.find(
            (item) =>
              getProductId(item) ===
              String(product._id)
          );


        const existingQty =
          getQuantity(existing);


        const newQty =
          existingQty + qty;


        /* ==================================================
           AVAILABLE INVENTORY
        ================================================== */

        const availableUnits =
          Number(
            product.units || 0
          );


        if (
          newQty >
          availableUnits
        ) {
          throw new Error(
            `Only ${availableUnits} units of "${product.name}" are available.`
          );
        }


        /* ==================================================
           UPDATE EXISTING ITEM
        ================================================== */

        if (existing) {
          existing.product =
            product._id;

          existing.productId =
            String(product._id);

          existing.quantity =
            newQty;

          existing.qty =
            newQty;

          existing.price =
            Number(
              product.unitSellPrice ||
              0
            );

          existing.name =
            product.name;

          existing.image =
            product.image ||
            "";
        }


        /* ==================================================
           ADD NEW ITEM
        ================================================== */

        else {
          cart.items.push({
            product:
              product._id,

            productId:
              String(product._id),

            quantity:
              qty,

            qty,

            price:
              Number(
                product.unitSellPrice ||
                0
              ),

            name:
              product.name,

            image:
              product.image ||
              "",
          });
        }


        /*
         * IMPORTANT:
         *
         * Inventory is NOT changed here.
         */

        await cart.save({
          session:
            dbSession,
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


/* ==========================================================
   GET CART
========================================================== */

async function getCart(req) {
  const userId =
    getLoggedInUserId(req);

  const sessionId =
    getCurrentSessionId(req);


  /* ========================================================
     LOGGED-IN USER
  ======================================================== */

  if (userId) {
    /*
     * USER IS THE PRIMARY CART IDENTITY.
     */

    let cart =
      await Cart.findOne({
        user: userId,
      })
        .populate(
          "items.product"
        )
        .lean();


    if (cart) {
      return normalizeCart(
        cart
      );
    }


    /*
     * Legacy/session fallback.
     */

    if (sessionId) {
      cart =
        await Cart.findOne({
          sessionId,
          $or: [
            {
              user: null,
            },
            {
              user: {
                $exists: false,
              },
            },
          ],
        })
          .populate(
            "items.product"
          )
          .lean();


      if (cart) {
        return normalizeCart(
          cart
        );
      }
    }


    return null;
  }


  /* ========================================================
     GUEST
  ======================================================== */

  if (!sessionId) {
    return null;
  }


  const cart =
    await Cart.findOne({
      sessionId,
    })
      .populate(
        "items.product"
      )
      .lean();


  return normalizeCart(
    cart
  );
}


/* ==========================================================
   NORMALIZE CART
========================================================== */

function normalizeCart(cart) {
  if (!cart) {
    return null;
  }


  cart.items =
    (cart.items || [])
      .map((item) => {
        const productId =
          getProductId(item);

        const quantity =
          getQuantity(item);

        return {
          ...item,

          product:
            item.product ||
            productId,

          productId,

          quantity,

          qty: quantity,

          name:
            item.name ||
            item.product?.name ||
            "Product",

          image:
            item.image ||
            item.product?.image ||
            "",

          price:
            Number(
              item.price || 0
            ),
        };
      })
      .filter(
        (item) =>
          item.productId &&
          item.quantity > 0
      );


  cart.totalPrice =
    cart.items.reduce(
      (total, item) =>
        total +
        Number(
          item.price || 0
        ) *
        Number(
          item.quantity || 0
        ),
      0
    );


  return cart;
}


/* ==========================================================
   REMOVE ITEM
========================================================== */

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
      (currentItem) =>
        getProductId(
          currentItem
        ) ===
        String(productId)
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
        await Cart.updateOne(
          {
            _id: cart._id,
          },
          {
            $pull: {
              items: {
                $or: [
                  {
                    product:
                      productId,
                  },
                  {
                    productId:
                      String(productId),
                  },
                ],
              },
            },
          },
          {
            session:
              dbSession,
          }
        );
      }
    );

  } finally {
    await dbSession.endSession();
  }
}


/* ==========================================================
   CREATE STAFF SALE
========================================================== */

async function createStaffSale(
  req,
  salesName
) {
  const userId =
    getUserId(req);


  if (!userId) {
    throw new Error(
      "You must be logged in to record a sale."
    );
  }


  const cleanSalesName =
    String(
      salesName || ""
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
        /* ==================================================
           STAFF
        ================================================== */

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


        const role =
          String(
            staff.role || ""
          )
            .trim()
            .toLowerCase();


        if (role !== "staff") {
          throw new Error(
            "Only staff members can record staff sales."
          );
        }


        /* ==================================================
           ASSIGNED SUBSTATION
        ================================================== */

        if (
          !staff.assignedSubstation
        ) {
          throw new Error(
            "You are not assigned to a substation."
          );
        }


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


        /* ==================================================
           STAFF CART
        ================================================== */

        const cart =
          await Cart.findOne({
            user:
              staff._id,
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


        let totalAmount = 0;

        const saleProducts = [];


        /* ==================================================
           VALIDATE ALL CART ITEMS
        ================================================== */

        for (
          const cartItem
          of cart.items
        ) {
          const productId =
            getProductId(
              cartItem
            );

          const qty =
            getQuantity(
              cartItem
            );


          if (!productId) {
            throw new Error(
              "A cart item has no Product ID."
            );
          }


          if (
            !Number.isInteger(qty) ||
            qty < 1
          ) {
            throw new Error(
              `Invalid quantity for ${getItemName(cartItem)}.`
            );
          }


          const product =
            await Product.findById(
              productId
            )
              .populate(
                "category",
                "name"
              )
              .session(
                dbSession
              );


          if (!product) {
            throw new Error(
              `Product "${getItemName(cartItem)}" no longer exists.`
            );
          }


          if (!product.isActive) {
            throw new Error(
              `Product "${product.name}" is no longer available.`
            );
          }


          const availableUnits =
            Number(
              product.units || 0
            );


          if (
            availableUnits <
            qty
          ) {
            throw new Error(
              `Only ${availableUnits} units of "${product.name}" are available.`
            );
          }


          const hasSubstationUnits =
            product.substationUnits !==
              undefined &&
            product.substationUnits !==
              null;


          const availableSubstationUnits =
            hasSubstationUnits
              ? Number(
                  product.substationUnits ||
                    0
                )
              : null;


          if (
            hasSubstationUnits &&
            availableSubstationUnits <
              qty
          ) {
            throw new Error(
              `Only ${availableSubstationUnits} substation units of "${product.name}" are available.`
            );
          }


          const price =
            Number(
              cartItem.price ??
                product.unitSellPrice ??
                0
            );


          if (
            !Number.isFinite(price) ||
            price < 0
          ) {
            throw new Error(
              `Invalid selling price for "${product.name}".`
            );
          }


          const lineTotal =
            price * qty;


          totalAmount +=
            lineTotal;


          const category =
            product.category
              ? (
                  product.category.name ||
                  String(
                    product.category._id ||
                    product.category
                  )
                )
              : "";


          saleProducts.push({
            productId:
              product._id,

            name:
              product.name,

            image:
              product.image ||
              cartItem.image ||
              "",

            category,

            subcategory:
              product.subcategory ||
              cartItem.subcategory ||
              "",

            qty,

            price,

            total:
              lineTotal,

            hasSubstationUnits,

            availableSubstationUnits,
          });
        }


        /* ==================================================
           REDUCE PRODUCT INVENTORY
        ================================================== */

        for (
          const saleItem
          of saleProducts
        ) {
          const productUpdate = {
            $inc: {
              units:
                -saleItem.qty,
            },
          };


          if (
            saleItem.hasSubstationUnits
          ) {
            productUpdate.$inc.substationUnits =
              -saleItem.qty;
          }


          const productResult =
            await Product.updateOne(
              {
                _id:
                  saleItem.productId,

                isActive:
                  true,

                units: {
                  $gte:
                    saleItem.qty,
                },

                ...(saleItem.hasSubstationUnits
                  ? {
                      substationUnits: {
                        $gte:
                          saleItem.qty,
                      },
                    }
                  : {}),
              },
              productUpdate,
              {
                session:
                  dbSession,
              }
            );


          if (
            productResult.modifiedCount !==
            1
          ) {
            throw new Error(
              `The available inventory for "${saleItem.name}" changed before the sale could be completed.`
            );
          }
        }


        /* ==================================================
           SUBSTATION INVENTORY
        ================================================== */

        if (
          !Array.isArray(
            substation.productInventory
          )
        ) {
          throw new Error(
            "The assigned substation has no product inventory."
          );
        }


        for (
          const saleItem
          of saleProducts
        ) {
          const inventoryItem =
            substation.productInventory.find(
              (item) =>
                String(
                  item.productId
                ) ===
                String(
                  saleItem.productId
                )
            );


          if (!inventoryItem) {
            throw new Error(
              `Product "${saleItem.name}" is not available in the assigned substation inventory.`
            );
          }


          const available =
            Number(
              inventoryItem.units ||
                0
            );


          if (
            available <
            saleItem.qty
          ) {
            throw new Error(
              `Only ${available} units of "${saleItem.name}" are available at your assigned substation.`
            );
          }


          inventoryItem.units =
            available -
            saleItem.qty;

          inventoryItem.productName =
            saleItem.name;

          inventoryItem.updatedAt =
            new Date();
        }


        /* ==================================================
           PRODUCT REDUCTIONS
        ================================================== */

        for (
          const saleItem
          of saleProducts
        ) {
          let reduction = null;


          if (
            Array.isArray(
              substation.productReductions
            )
          ) {
            reduction =
              substation.productReductions.find(
                (item) =>
                  String(
                    item.productId
                  ) ===
                  String(
                    saleItem.productId
                  )
              );
          }


          if (!reduction) {
            substation.productReductions.push({
              productId:
                saleItem.productId,

              productName:
                saleItem.name,

              category:
                saleItem.category ||
                "",

              unitsReduced:
                saleItem.qty,

              lastReducedAt:
                new Date(),
            });

          } else {
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
        }


        await substation.save({
          session:
            dbSession,
        });


        /* ==================================================
           STAFF SALE
        ================================================== */

        sale =
          new StaffSale({
            salesName:
              cleanSalesName,

            products:
              saleProducts,

            totalAmount,

            soldBy:
              staff._id,
          });


        await sale.save({
          session:
            dbSession,
        });


        /* ==================================================
           CLEAR CART
        ================================================== */

        cart.items = [];

        await cart.save({
          session:
            dbSession,
        });
      }
    );


    return sale;

  } finally {
    await dbSession.endSession();
  }
}


/* ==========================================================
   CALCULATE TOTAL
========================================================== */

function calculateTotal(cart) {
  return (
    cart?.items || []
  ).reduce(
    (
      total,
      item
    ) => {
      return (
        total +
        Number(
          item.price || 0
        ) *
        getQuantity(item)
      );
    },
    0
  );
}


/* ==========================================================
   EXPORTS
========================================================== */

module.exports = {
  getOrCreateCart,
  addToCart,
  getCart,
  removeItem,
  createStaffSale,
  calculateTotal,
  getProductId,
  getQuantity,
};