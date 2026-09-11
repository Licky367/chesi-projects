// =========================================================
// verrah/services/cartService.js
// VERRAH COSMETICS
// CART SERVICE
//
// STOCK RULE:
//
// 1. Adding an item to cart DOES NOT reduce Product.units.
// 2. Removing an item from cart DOES NOT change Product.units.
// 3. Staff sale reduces Product.units when the sale is completed.
// 4. Normal client/admin package creation reduces Product.units
//    when the package is actually formed.
// 5. There is NO reservedUnits logic.
// =========================================================

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
//
// IMPORTANT:
//
// Adding to cart DOES NOT reduce Product.units.
//
// We only make sure that the quantity requested in the
// cart does not exceed the product's current physical stock.
//
// Stock is reduced later:
// - Staff -> when staff sale is completed.
// - Client/Admin -> when package is formed.
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

                // -------------------------------------------------
                // GET CART
                // -------------------------------------------------

                const cart =
                    await getOrCreateCart(
                        req,
                        dbSession
                    );

                // -------------------------------------------------
                // CHECK WHETHER PRODUCT ALREADY EXISTS IN CART
                // -------------------------------------------------

                const existing =
                    cart.items.find(
                        item =>
                            String(
                                item.productId
                            ) ===
                            String(
                                productId
                            )
                    );

                const existingQty =
                    existing
                        ? Number(existing.qty || 0)
                        : 0;

                const requestedTotalQty =
                    existingQty + qty;

                // -------------------------------------------------
                // GET CURRENT PRODUCT
                // -------------------------------------------------

                const product =
                    await Product.findOne({
                        _id: productId,
                        isActive: true
                    })
                        .session(
                            dbSession
                        );

                if (!product) {

                    throw new Error(
                        "The requested product was not found or is inactive."
                    );
                }

                // -------------------------------------------------
                // PHYSICAL STOCK CHECK
                //
                // ONLY Product.units MATTERS.
                // -------------------------------------------------

                const availableUnits =
                    Number(
                        product.units || 0
                    );

                if (
                    availableUnits <
                    requestedTotalQty
                ) {

                    throw new Error(
                        `${product.name} has only ${availableUnits} units available.`
                    );
                }

                // -------------------------------------------------
                // UPDATE EXISTING CART ITEM
                // -------------------------------------------------

                if (existing) {

                    existing.qty =
                        requestedTotalQty;

                    existing.name =
                        product.name;

                    existing.price =
                        Number(
                            product.unitSellPrice ||
                            0
                        );

                    existing.image =
                        product.image ||
                        "";

                    existing.product =
                        product._id;

                }

                // -------------------------------------------------
                // ADD NEW CART ITEM
                // -------------------------------------------------

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
                            Number(
                                product.unitSellPrice ||
                                0
                            ),

                        image:
                            product.image ||
                            "",

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
//
// IMPORTANT:
//
// Removing an item from cart DOES NOT modify Product.units.
//
// Nothing was taken from physical stock when the item was
// added to cart, therefore nothing needs to be returned.
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
            currentItem =>
                String(
                    currentItem.productId
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
//
// STAFF STOCK RULE:
//
// Product.units >= cart quantity
//
// If true:
//     sale is allowed
//     Product.units decreases
//
// If false:
//     sale is rejected
//
// There is NO reservedUnits check.
// There is NO reservedUnits update.
// =========================================================

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

                // =============================================
                // STAFF
                // =============================================

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
                    ).toLowerCase();

                if (
                    role !== "staff"
                ) {

                    throw new Error(
                        "Only staff members can record staff sales."
                    );
                }


                // =============================================
                // ASSIGNED SUBSTATION
                // =============================================

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


                // =============================================
                // CART
                // =============================================

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


                // =============================================
                // BUILD SALE SNAPSHOTS
                // =============================================

                const saleProducts = [];

                let totalAmount = 0;


                for (
                    const cartItem
                    of cart.items
                ) {

                    const productId =
                        cartItem.productId;

                    const qty =
                        Number(
                            cartItem.qty || 0
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
                            `Invalid quantity for ${
                                cartItem.name ||
                                "a cart item"
                            }.`
                        );
                    }


                    // -----------------------------------------
                    // GET CURRENT PRODUCT
                    // -----------------------------------------

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
                            `Product "${cartItem.name || productId}" no longer exists.`
                        );
                    }


                    // -----------------------------------------
                    // CURRENT PHYSICAL STOCK
                    // -----------------------------------------

                    const physicalUnits =
                        Number(
                            product.units || 0
                        );


                    // -----------------------------------------
                    // STAFF STOCK CHECK
                    //
                    // THIS IS THE ONLY CHECK.
                    //
                    // Example:
                    //
                    // Product.units = 10
                    // Cart qty       = 3
                    //
                    // 10 >= 3 -> SALE ALLOWED
                    //
                    // Product.units = 2
                    // Cart qty       = 3
                    //
                    // 2 >= 3 -> SALE REJECTED
                    // -----------------------------------------

                    if (
                        physicalUnits <
                        qty
                    ) {

                        throw new Error(
                            `Only ${physicalUnits} units of "${product.name}" are available, but ${qty} units are being sold.`
                        );
                    }


                    // -----------------------------------------
                    // PRICE
                    // -----------------------------------------

                    const price =
                        Number(
                            cartItem.price ??
                            product.unitSellPrice ??
                            0
                        );

                    if (
                        !Number.isFinite(
                            price
                        ) ||
                        price < 0
                    ) {

                        throw new Error(
                            `Invalid selling price for ${product.name}.`
                        );
                    }


                    const lineTotal =
                        price * qty;

                    totalAmount +=
                        lineTotal;


                    // -----------------------------------------
                    // CATEGORY
                    // -----------------------------------------

                    let category = "";

                    if (
                        product.category
                    ) {

                        category =
                            product.category.name ||
                            String(
                                product.category._id ||
                                product.category
                            );
                    }


                    // -----------------------------------------
                    // SALE SNAPSHOT
                    // -----------------------------------------

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
                            lineTotal

                    });
                }


                // =============================================
                // REDUCE PRODUCT STOCK
                //
                // IMPORTANT:
                //
                // Product.units is reduced ONLY NOW.
                //
                // There is NO reservedUnits.
                // =============================================

                for (
                    const saleItem
                    of saleProducts
                ) {

                    const result =
                        await Product.updateOne(

                            {
                                _id:
                                    saleItem.productId,

                                units: {
                                    $gte:
                                        saleItem.qty
                                }
                            },

                            {
                                $inc: {
                                    units:
                                        -saleItem.qty
                                }
                            },

                            {
                                session:
                                    dbSession
                            }
                        );


                    if (
                        result.modifiedCount !==
                        1
                    ) {

                        throw new Error(
                            `Unable to reduce stock for "${saleItem.name}". The available stock may have changed.`
                        );
                    }
                }


                // =============================================
                // UPDATE SUBSTATION PRODUCT REDUCTIONS
                // =============================================

                for (
                    const saleItem
                    of saleProducts
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
                                new Date()

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
                        dbSession
                });


                // =============================================
                // CREATE STAFF SALE
                // =============================================

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


                // =============================================
                // CLEAR CART
                // =============================================

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

function calculateTotal(cart) {

    return (
        cart?.items || []
    ).reduce(

        (
            sum,
            item
        ) => {

            return (
                sum +
                Number(
                    item.price || 0
                ) *
                Number(
                    item.qty || 0
                )
            );

        },

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