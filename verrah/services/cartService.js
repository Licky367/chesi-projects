const mongoose = require("mongoose");

const Product = require("../models/products");
const Cart = require("../models/carts");
const StaffSale = require("../models/staffSale");
const Substation = require("../models/substations");
const User = require("../models/users");

const {
    getUserId,
    getSessionId
} = require("../utils/requestIdentity");


/* ==========================================================
   HELPERS
========================================================== */

function getQuantity(item) {
    if (!item) return 0;

    const value =
        item.qty !== undefined && item.qty !== null
            ? item.qty
            : item.quantity;

    const quantity = Number(value);

    return Number.isFinite(quantity) && quantity > 0
        ? quantity
        : 0;
}


function getProductId(item) {
    if (!item) return null;

    return (
        item.productId ||
        item.product ||
        null
    );
}


function getRequestedQuantity(req, requestedQty) {
    let value = requestedQty;

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {
        value = req.body?.quantity;
    }

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {
        value = req.body?.qty;
    }

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {
        value = 1;
    }

    const quantity = Number(value);

    if (
        !Number.isInteger(quantity) ||
        quantity < 1
    ) {
        throw new Error("Quantity must be at least 1.");
    }

    return quantity;
}


function getItemTotal(item) {
    const price = Number(item?.price || 0);
    const quantity = getQuantity(item);

    return price * quantity;
}


/* ==========================================================
   GET / CREATE CART
========================================================== */

async function getOrCreateCart(req, session) {
    const userId = getUserId(req);
    const sessionId = getSessionId(req);

    let cart = null;


    /* ------------------------------------------------------
       LOGGED-IN USER
    ------------------------------------------------------ */

    if (userId) {
        cart = await Cart.findOne({
            user: userId
        });

        /*
         * If the user's cart already exists, make sure its
         * current session ID is available for checkout and
         * payment services.
         */
        if (cart) {
            let changed = false;

            if (
                sessionId &&
                cart.sessionId !== sessionId
            ) {
                cart.sessionId = sessionId;
                changed = true;
            }

            if (changed) {
                await cart.save();
            }

            if (session) {
                session.cartId = cart._id.toString();
            }

            return cart;
        }


        /* --------------------------------------------------
           CLAIM EXISTING GUEST CART
        -------------------------------------------------- */

        if (sessionId) {
            cart = await Cart.findOne({
                sessionId,
                $or: [
                    { user: null },
                    { user: { $exists: false } }
                ]
            });

            if (cart) {
                cart.user = userId;
                cart.sessionId = sessionId;

                await cart.save();

                if (session) {
                    session.cartId = cart._id.toString();
                }

                return cart;
            }
        }


        /* --------------------------------------------------
           CREATE USER CART
        -------------------------------------------------- */

        cart = new Cart({
            user: userId,
            sessionId: sessionId || null,
            items: [],
            totalPrice: 0
        });

        await cart.save();

        if (session) {
            session.cartId = cart._id.toString();
        }

        return cart;
    }


    /* ======================================================
       GUEST CART
    ====================================================== */

    if (!sessionId) {
        throw new Error(
            "Unable to identify the shopping session."
        );
    }

    cart = await Cart.findOne({
        sessionId
    });

    if (!cart) {
        cart = new Cart({
            sessionId,
            user: null,
            items: [],
            totalPrice: 0
        });

        await cart.save();
    }

    if (session) {
        session.cartId = cart._id.toString();
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
    const quantityToAdd =
        getRequestedQuantity(
            req,
            requestedQty
        );


    if (!mongoose.Types.ObjectId.isValid(productId)) {
        throw new Error("Invalid product.");
    }


    const dbSession =
        await mongoose.startSession();


    try {
        let result;


        await dbSession.withTransaction(
            async () => {

                /* ------------------------------------------
                   FIND PRODUCT
                ------------------------------------------ */

                const product =
                    await Product.findOne({
                        _id: productId,
                        active: {
                            $ne: false
                        }
                    }).session(dbSession);


                if (!product) {
                    throw new Error(
                        "Product not found."
                    );
                }


                const availableUnits =
                    Number(product.units || 0);


                if (availableUnits < 1) {
                    throw new Error(
                        "This product is out of stock."
                    );
                }


                /* ------------------------------------------
                   GET CART
                ------------------------------------------ */

                const cart =
                    await getOrCreateCart(
                        req,
                        req.session
                    );


                /*
                 * Re-fetch the cart inside the transaction so
                 * all modifications participate in the same
                 * transaction.
                 */

                const transactionalCart =
                    await Cart.findById(
                        cart._id
                    ).session(dbSession);


                if (!transactionalCart) {
                    throw new Error(
                        "Unable to access your cart."
                    );
                }


                /* ------------------------------------------
                   FIND EXISTING PRODUCT
                ------------------------------------------ */

                const existingItem =
                    transactionalCart.items.find(
                        item => {

                            const existingProductId =
                                getProductId(item);

                            return (
                                existingProductId &&
                                String(existingProductId) ===
                                    String(product._id)
                            );
                        }
                    );


                /* ------------------------------------------
                   EXISTING QUANTITY
                ------------------------------------------ */

                const existingQuantity =
                    existingItem
                        ? getQuantity(existingItem)
                        : 0;


                const newQuantity =
                    existingQuantity +
                    quantityToAdd;


                /* ------------------------------------------
                   INVENTORY CHECK
                ------------------------------------------ */

                if (
                    newQuantity >
                    availableUnits
                ) {
                    throw new Error(
                        `Only ${availableUnits} unit${
                            availableUnits === 1
                                ? ""
                                : "s"
                        } of ${
                            product.name
                        } ${
                            availableUnits === 1
                                ? "is"
                                : "are"
                        } available.`
                    );
                }


                /* ------------------------------------------
                   UPDATE EXISTING ITEM
                ------------------------------------------ */

                if (existingItem) {

                    /*
                     * qty is the canonical field used by the
                     * current cart/package/payment services.
                     */

                    existingItem.qty =
                        newQuantity;


                    /*
                     * Keep quantity synchronized for cart
                     * records that use the newer model field.
                     */

                    if (
                        Object.prototype.hasOwnProperty.call(
                            existingItem.toObject
                                ? existingItem.toObject()
                                : existingItem,
                            "quantity"
                        )
                    ) {
                        existingItem.quantity =
                            newQuantity;
                    }


                    existingItem.product =
                        product._id;

                    existingItem.productId =
                        product._id;

                    existingItem.name =
                        product.name;

                    existingItem.price =
                        Number(product.price || 0);

                    existingItem.image =
                        product.image || "";
                }


                /* ------------------------------------------
                   ADD NEW ITEM
                ------------------------------------------ */

                else {

                    transactionalCart.items.push({
                        product: product._id,

                        productId:
                            product._id,

                        name:
                            product.name,

                        price:
                            Number(product.price || 0),

                        image:
                            product.image || "",

                        qty:
                            quantityToAdd,

                        quantity:
                            quantityToAdd
                    });
                }


                /* ------------------------------------------
                   SAVE CART
                ------------------------------------------ */

                transactionalCart.totalPrice =
                    transactionalCart.items.reduce(
                        (total, item) => {
                            return (
                                total +
                                getItemTotal(item)
                            );
                        },
                        0
                    );


                await transactionalCart.save({
                    session: dbSession
                });


                result =
                    transactionalCart;
            }
        );


        return result;
    }

    finally {
        await dbSession.endSession();
    }
}


/* ==========================================================
   GET CART
========================================================== */

async function getCart(req) {
    const userId = getUserId(req);
    const sessionId = getSessionId(req);


    /* ------------------------------------------------------
       LOGGED-IN USER
    ------------------------------------------------------ */

    if (userId) {

        let cart =
            await Cart.findOne({
                user: userId
            })
            .populate("items.product");


        /*
         * Fallback to the session cart if the user cart is
         * not yet associated correctly.
         */

        if (
            !cart &&
            sessionId
        ) {
            cart =
                await Cart.findOne({
                    sessionId,
                    $or: [
                        { user: userId },
                        { user: null },
                        { user: { $exists: false } }
                    ]
                })
                .populate("items.product");


            if (cart) {
                cart.user = userId;
                cart.sessionId = sessionId;

                await cart.save();
            }
        }


        return cart;
    }


    /* ------------------------------------------------------
       GUEST
    ------------------------------------------------------ */

    if (!sessionId) {
        return null;
    }


    return Cart.findOne({
        sessionId
    })
    .populate("items.product");
}


/* ==========================================================
   REMOVE ITEM
========================================================== */

async function removeItem(
    req,
    productId
) {
    if (
        !mongoose.Types.ObjectId.isValid(
            productId
        )
    ) {
        throw new Error(
            "Invalid product."
        );
    }


    const cart =
        await getCart(req);


    if (
        !cart ||
        !cart.items ||
        cart.items.length === 0
    ) {
        throw new Error(
            "Your cart is empty."
        );
    }


    const itemExists =
        cart.items.some(item => {

            const currentProductId =
                getProductId(item);

            return (
                currentProductId &&
                String(currentProductId) ===
                    String(productId)
            );
        });


    if (!itemExists) {
        throw new Error(
            "Product not found in your cart."
        );
    }


    cart.items =
        cart.items.filter(item => {

            const currentProductId =
                getProductId(item);

            return !(
                currentProductId &&
                String(currentProductId) ===
                    String(productId)
            );
        });


    cart.totalPrice =
        cart.items.reduce(
            (total, item) => {
                return (
                    total +
                    getItemTotal(item)
                );
            },
            0
        );


    await cart.save();

    return cart;
}


/* ==========================================================
   CLEAR CART
========================================================== */

async function clearCart(req) {
    const cart =
        await getCart(req);


    if (!cart) {
        return null;
    }


    cart.items = [];
    cart.totalPrice = 0;

    await cart.save();


    return cart;
}


/* ==========================================================
   CALCULATE TOTAL
========================================================== */

function calculateTotal(cart) {
    if (
        !cart ||
        !Array.isArray(cart.items)
    ) {
        return 0;
    }


    return cart.items.reduce(
        (total, item) => {
            return (
                total +
                getItemTotal(item)
            );
        },
        0
    );
}


/* ==========================================================
   CREATE STAFF SALE
========================================================== */

async function createStaffSale(
    req,
    data = {}
) {
    const staff =
        req.user;


    if (!staff) {
        throw new Error(
            "You must be logged in."
        );
    }


    if (
        staff.role !== "staff" &&
        staff.role !== "admin"
    ) {
        throw new Error(
            "You are not authorized to make a staff sale."
        );
    }


    const staffId =
        staff._id;


    /* ------------------------------------------------------
       DETERMINE SUBSTATION
    ------------------------------------------------------ */

    const substationId =
        data.substationId ||
        data.packageSubstation ||
        req.body?.substationId ||
        req.body?.packageSubstation ||
        staff.substation;


    if (!substationId) {
        throw new Error(
            "Please select a substation."
        );
    }


    if (
        !mongoose.Types.ObjectId.isValid(
            substationId
        )
    ) {
        throw new Error(
            "Invalid substation."
        );
    }


    const dbSession =
        await mongoose.startSession();


    try {

        let createdSale = null;


        await dbSession.withTransaction(
            async () => {

                /* ------------------------------------------
                   USER
                ------------------------------------------ */

                const currentStaff =
                    await User.findById(
                        staffId
                    ).session(dbSession);


                if (!currentStaff) {
                    throw new Error(
                        "Staff account not found."
                    );
                }


                if (
                    currentStaff.role !== "staff" &&
                    currentStaff.role !== "admin"
                ) {
                    throw new Error(
                        "You are not authorized to make a staff sale."
                    );
                }


                /* ------------------------------------------
                   SUBSTATION
                ------------------------------------------ */

                const substation =
                    await Substation.findById(
                        substationId
                    ).session(dbSession);


                if (!substation) {
                    throw new Error(
                        "Substation not found."
                    );
                }


                /* ------------------------------------------
                   STAFF CART
                ------------------------------------------ */

                let cart =
                    await Cart.findOne({
                        user: staffId
                    })
                    .session(dbSession);


                /*
                 * Fallback to session cart where necessary.
                 */

                if (
                    !cart &&
                    getSessionId(req)
                ) {
                    cart =
                        await Cart.findOne({
                            sessionId:
                                getSessionId(req),
                            user: staffId
                        })
                        .session(dbSession);
                }


                if (
                    !cart ||
                    !Array.isArray(
                        cart.items
                    ) ||
                    cart.items.length === 0
                ) {
                    throw new Error(
                        "Your cart is empty."
                    );
                }


                /* ------------------------------------------
                   SALE PRODUCTS
                ------------------------------------------ */

                const saleProducts = [];


                /* ------------------------------------------
                   PROCESS EACH ITEM
                ------------------------------------------ */

                for (
                    const cartItem
                    of cart.items
                ) {

                    const productId =
                        getProductId(
                            cartItem
                        );


                    const quantity =
                        getQuantity(
                            cartItem
                        );


                    if (!productId) {
                        throw new Error(
                            "A cart item has no product."
                        );
                    }


                    if (
                        quantity < 1
                    ) {
                        throw new Error(
                            "Invalid product quantity in cart."
                        );
                    }


                    const product =
                        await Product.findById(
                            productId
                        )
                        .session(dbSession);


                    if (!product) {
                        throw new Error(
                            "A product in your cart no longer exists."
                        );
                    }


                    /* --------------------------------------
                       PRODUCT INVENTORY
                    -------------------------------------- */

                    const availableUnits =
                        Number(
                            product.units || 0
                        );


                    if (
                        availableUnits <
                        quantity
                    ) {
                        throw new Error(
                            `Insufficient stock for ${product.name}.`
                        );
                    }


                    /* --------------------------------------
                       SUBSTATION INVENTORY
                    -------------------------------------- */

                    let substationInventoryItem =
                        null;


                    if (
                        Array.isArray(
                            substation.productInventory
                        )
                    ) {

                        substationInventoryItem =
                            substation.productInventory.find(
                                inventoryItem => {

                                    const inventoryProductId =
                                        inventoryItem.productId ||
                                        inventoryItem.product;

                                    return (
                                        inventoryProductId &&
                                        String(
                                            inventoryProductId
                                        ) ===
                                            String(
                                                product._id
                                            )
                                    );
                                }
                            );
                    }


                    if (
                        substationInventoryItem
                    ) {

                        const substationUnits =
                            Number(
                                substationInventoryItem.units ||
                                0
                            );


                        if (
                            substationUnits <
                            quantity
                        ) {
                            throw new Error(
                                `Insufficient ${product.name} stock at this substation.`
                            );
                        }


                        substationInventoryItem.units =
                            substationUnits -
                            quantity;
                    }


                    /* --------------------------------------
                       REDUCE MAIN PRODUCT STOCK
                    -------------------------------------- */

                    product.units =
                        availableUnits -
                        quantity;


                    await product.save({
                        session: dbSession
                    });


                    /* --------------------------------------
                       SALE ITEM
                    -------------------------------------- */

                    const unitPrice =
                        Number(
                            cartItem.price ??
                            product.price ??
                            0
                        );


                    const itemTotal =
                        unitPrice *
                        quantity;


                    saleProducts.push({
                        productId:
                            product._id,

                        name:
                            cartItem.name ||
                            product.name,

                        image:
                            cartItem.image ||
                            product.image ||
                            "",

                        category:
                            product.category,

                        subcategory:
                            product.subcategory,

                        qty:
                            quantity,

                        price:
                            unitPrice,

                        total:
                            itemTotal
                    });
                }


                /* ------------------------------------------
                   SAVE SUBSTATION
                ------------------------------------------ */

                await substation.save({
                    session: dbSession
                });


                /* ------------------------------------------
                   TOTAL
                ------------------------------------------ */

                const total =
                    saleProducts.reduce(
                        (sum, item) => {
                            return (
                                sum +
                                Number(
                                    item.total || 0
                                );
                        },
                        0
                    );


                /* ------------------------------------------
                   CREATE STAFF SALE
                ------------------------------------------ */

                const saleData = {
                    staff:
                        staffId,

                    substation:
                        substation._id,

                    products:
                        saleProducts,

                    total,

                    totalAmount:
                        total
                };


                /*
                 * Preserve any fields supplied by the
                 * existing controller if StaffSale supports
                 * them.
                 */

                if (data.paymentMethod) {
                    saleData.paymentMethod =
                        data.paymentMethod;
                }

                if (data.customer) {
                    saleData.customer =
                        data.customer;
                }


                const sales =
                    await StaffSale.create(
                        [saleData],
                        {
                            session:
                                dbSession
                        }
                    );


                createdSale =
                    sales[0];


                /* ------------------------------------------
                   CLEAR STAFF CART
                   
                   Only happens after the sale has been
                   successfully created.
                ------------------------------------------ */

                cart.items = [];
                cart.totalPrice = 0;


                await cart.save({
                    session: dbSession
                });
            }
        );


        return createdSale;

    } finally {
        await dbSession.endSession();
    }
}


/* ==========================================================
   EXPORTS
========================================================== */

module.exports = {
    getOrCreateCart,
    addToCart,
    getCart,
    removeItem,
    clearCart,
    calculateTotal,
    createStaffSale,

    /*
     * Kept available for controllers/services that need
     * compatibility with the current cart structure.
     */
    getQuantity,
    getProductId
};