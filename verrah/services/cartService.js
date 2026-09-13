// ==========================================================
// verrah/services/cartService.js
// VERRAH COSMETICS
// CART SERVICE
//
// CART IDENTITY RULE
//
// Logged-in user:
//     Cart.user is the permanent cart identity.
//
// Guest:
//     Cart.sessionId is the cart identity.
//
// INVENTORY RULE
//
// Adding to cart DOES NOT reduce inventory.
//
// There is NO reserved quantity.
// There is NO reservedUnits.
//
// Inventory is reduced only when a sale is completed.
// ==========================================================

const mongoose = require("mongoose");

const Product = require("../models/products");
const Cart = require("../models/carts");
const StaffSale = require("../models/staff-sales");
const Substation = require("../models/substations");
const User = require("../models/user");

const {
    getUserId,
    getSessionId
} = require("./shopContext");


// ==========================================================
// CART IDENTITY HELPERS
// ==========================================================

function getLoggedInUserId(req) {
    return getUserId(req);
}


function getCurrentSessionId(req) {
    return getSessionId(req);
}


// ==========================================================
// NORMALIZE QUANTITY
//
// The service accepts:
//
//     requestedQty
//     req.body.quantity
//     req.body.qty
//
// If no quantity is supplied, one unit is added.
//
// IMPORTANT:
// A quantity of 2 means ADD TWO units.
//
// It does NOT mean "set the cart quantity to 2".
// ==========================================================

function normalizeRequestedQuantity(
    req,
    requestedQty
) {

    let value = requestedQty;


    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {

        value =
            req?.body?.quantity ??
            req?.body?.qty ??
            1;
    }


    const qty =
        Number(value);


    if (
        !Number.isInteger(qty) ||
        qty < 1
    ) {

        throw new Error(
            "Quantity must be a whole number greater than zero."
        );
    }


    return qty;
}


// ==========================================================
// GET OR CREATE CART
// ==========================================================

async function getOrCreateCart(
    req,
    session = null
) {

    const userId =
        getLoggedInUserId(req);

    const sessionId =
        getCurrentSessionId(req);


    // ======================================================
    // LOGGED-IN USER
    // ======================================================

    if (userId) {

        // --------------------------------------------------
        // FIND THE USER'S PERMANENT CART
        // --------------------------------------------------

        let cart =
            await Cart.findOne({
                user: userId
            }).session(session);


        if (cart) {

            // Keep the session associated with the cart,
            // but the user remains the permanent identity.
            if (
                sessionId &&
                cart.sessionId !== sessionId
            ) {

                cart.sessionId =
                    sessionId;

                await cart.save({
                    session
                });
            }


            return cart;
        }


        // --------------------------------------------------
        // CLAIM AN EXISTING GUEST SESSION CART
        // --------------------------------------------------

        if (sessionId) {

            cart =
                await Cart.findOne({
                    sessionId,
                    $or: [
                        {
                            user: null
                        },
                        {
                            user: {
                                $exists: false
                            }
                        }
                    ]
                }).session(session);


            if (cart) {

                cart.user =
                    userId;

                await cart.save({
                    session
                });

                return cart;
            }
        }


        // --------------------------------------------------
        // CREATE NEW USER CART
        // --------------------------------------------------

        cart =
            new Cart({
                user: userId,
                sessionId:
                    sessionId || null,
                items: []
            });


        await cart.save({
            session
        });


        return cart;
    }


    // ======================================================
    // GUEST
    // ======================================================

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
                user: null,
                items: []
            });


        await cart.save({
            session
        });
    }


    return cart;
}


// ==========================================================
// ADD TO CART
//
// IMPORTANT QUANTITY BEHAVIOUR
//
// If the cart contains:
//
//     Product A = 1
//
// and the user adds:
//
//     Product A = 1
//
// the result is:
//
//     Product A = 2
//
// If the user adds:
//
//     Product A = 3
//
// the result is:
//
//     Product A = 5
//
// provided enough inventory exists.
//
// Adding to cart NEVER reduces Product.units.
// ==========================================================

async function addToCart(
    req,
    productId,
    requestedQty
) {

    const qty =
        normalizeRequestedQuantity(
            req,
            requestedQty
        );


    if (
        !mongoose.Types.ObjectId.isValid(
            productId
        )
    ) {

        throw new Error(
            "Invalid Product ID."
        );
    }


    const dbSession =
        await mongoose.startSession();


    try {

        let result = null;


        await dbSession.withTransaction(
            async () => {

                // ==========================================
                // GET PRODUCT
                // ==========================================

                const product =
                    await Product.findOne({
                        _id: productId,
                        isActive: true
                    }).session(
                        dbSession
                    );


                if (!product) {

                    throw new Error(
                        "The requested Product could not be found."
                    );
                }


                // ==========================================
                // AVAILABLE INVENTORY
                // ==========================================

                const availableUnits =
                    Number(
                        product.units || 0
                    );


                if (
                    availableUnits < 1
                ) {

                    throw new Error(
                        `"${product.name}" is currently out of stock.`
                    );
                }


                // ==========================================
                // GET CART
                // ==========================================

                const cart =
                    await getOrCreateCart(
                        req,
                        dbSession
                    );


                // ==========================================
                // FIND EXISTING PRODUCT
                //
                // The product itself is the identity.
                //
                // productId is retained because the current
                // cart structure uses it throughout the
                // service.
                // ==========================================

                const existing =
                    cart.items.find(
                        item => {

                            const storedProductId =
                                item.productId ||
                                item.product;


                            return (
                                String(
                                    storedProductId
                                ) ===
                                String(
                                    product._id
                                )
                            );
                        }
                    );


                // ==========================================
                // EXISTING QUANTITY
                //
                // IMPORTANT:
                //
                // Read the EXISTING quantity.
                // Then ADD the requested quantity.
                //
                // Never replace the existing quantity with 1.
                // ==========================================

                const existingQty =
                    existing
                        ? Number(
                            existing.qty || 0
                        )
                        : 0;


                const newQty =
                    existingQty +
                    qty;


                // ==========================================
                // CHECK TOTAL CART QUANTITY AGAINST STOCK
                // ==========================================

                if (
                    newQty >
                    availableUnits
                ) {

                    throw new Error(
                        `Only ${availableUnits} units of "${product.name}" are available. You already have ${existingQty} in your cart.`
                    );
                }


                // ==========================================
                // PRICE
                // ==========================================

                const price =
                    Number(
                        product.unitSellPrice || 0
                    );


                // ==========================================
                // UPDATE EXISTING ITEM
                // ==========================================

                if (existing) {

                    existing.product =
                        product._id;

                    existing.productId =
                        String(
                            product._id
                        );

                    existing.name =
                        product.name;

                    existing.price =
                        price;

                    existing.image =
                        product.image || "";

                    existing.qty =
                        newQty;
                }


                // ==========================================
                // ADD NEW ITEM
                // ==========================================

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

                        price,

                        image:
                            product.image || "",

                        qty
                    });
                }


                // ==========================================
                // SAVE CART
                //
                // Product.units is NOT changed here.
                // ==========================================

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


// ==========================================================
// GET CART
// ==========================================================

async function getCart(req) {

    const userId =
        getLoggedInUserId(req);

    const sessionId =
        getCurrentSessionId(req);


    // ======================================================
    // LOGGED-IN USER
    // ======================================================

    if (userId) {

        let cart =
            await Cart.findOne({
                user: userId
            })
                .populate(
                    "items.product"
                )
                .lean();


        if (cart) {
            return cart;
        }


        // --------------------------------------------------
        // FALLBACK TO CURRENT SESSION CART
        // --------------------------------------------------

        if (sessionId) {

            cart =
                await Cart.findOne({
                    sessionId,
                    $or: [
                        {
                            user: null
                        },
                        {
                            user: {
                                $exists: false
                            }
                        }
                    ]
                })
                    .populate(
                        "items.product"
                    )
                    .lean();


            if (cart) {
                return cart;
            }
        }


        return null;
    }


    // ======================================================
    // GUEST
    // ======================================================

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


// ==========================================================
// REMOVE CART ITEM
// ==========================================================

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
            currentItem => {

                const storedProductId =
                    currentItem.productId ||
                    currentItem.product;


                return (
                    String(
                        storedProductId
                    ) ===
                    String(
                        productId
                    )
                );
            }
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
                                $or: [
                                    {
                                        productId:
                                            String(
                                                productId
                                            )
                                    },
                                    {
                                        product:
                                            productId
                                    }
                                ]
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


// ==========================================================
// CREATE STAFF SALE
//
// Inventory is reduced ONLY here.
//
// The cart is cleared ONLY after:
//     1. Product inventory succeeds.
//     2. Substation inventory succeeds.
//     3. Reduction records succeed.
//     4. StaffSale is successfully created.
//
// Therefore a failed sale does NOT empty the cart.
// ==========================================================

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

                // ==========================================
                // STAFF
                // ==========================================

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


                if (
                    role !== "staff"
                ) {

                    throw new Error(
                        "Only staff members can record staff sales."
                    );
                }


                // ==========================================
                // ASSIGNED SUBSTATION
                // ==========================================

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


                // ==========================================
                // PERSISTENT USER CART
                // ==========================================

                const cart =
                    await Cart.findOne({
                        user:
                            staff._id
                    }).session(
                        dbSession
                    );


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


                // ==========================================
                // BUILD SALE ITEMS
                // ==========================================

                const saleProducts = [];

                let totalAmount = 0;


                for (
                    const cartItem
                    of cart.items
                ) {

                    // --------------------------------------
                    // PRODUCT ID
                    // --------------------------------------

                    const productId =
                        cartItem.productId ||
                        cartItem.product;


                    // --------------------------------------
                    // QUANTITY
                    // --------------------------------------

                    const qty =
                        Number(
                            cartItem.qty
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
                            `Invalid quantity for ${
                                cartItem.name ||
                                "a cart item"
                            }.`
                        );
                    }


                    // ======================================
                    // CURRENT PRODUCT
                    // ======================================

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
                            `Product "${
                                cartItem.name ||
                                productId
                            }" no longer exists.`
                        );
                    }


                    if (!product.isActive) {

                        throw new Error(
                            `Product "${product.name}" is no longer available.`
                        );
                    }


                    // ======================================
                    // PRODUCT INVENTORY
                    // ======================================

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


                    // ======================================
                    // SUBSTATION UNITS
                    // ======================================

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


                    // ======================================
                    // PRICE
                    // ======================================

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


                    // ======================================
                    // CATEGORY
                    // ======================================

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


                    // ======================================
                    // SALE SNAPSHOT
                    // ======================================

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

                        availableSubstationUnits
                    });
                }


                // ==========================================
                // REDUCE PRODUCT INVENTORY
                // ==========================================

                for (
                    const saleItem
                    of saleProducts
                ) {

                    const product =
                        await Product.findById(
                            saleItem.productId
                        ).session(
                            dbSession
                        );


                    if (!product) {

                        throw new Error(
                            `Product "${saleItem.name}" could not be found while updating inventory.`
                        );
                    }


                    const increment = {
                        units:
                            -saleItem.qty
                    };


                    if (
                        saleItem.hasSubstationUnits
                    ) {

                        increment.substationUnits =
                            -saleItem.qty;
                    }


                    const query = {

                        _id:
                            saleItem.productId,

                        isActive:
                            true,

                        units: {
                            $gte:
                                saleItem.qty
                        }

                    };


                    if (
                        saleItem.hasSubstationUnits
                    ) {

                        query.substationUnits = {
                            $gte:
                                saleItem.qty
                        };
                    }


                    const productResult =
                        await Product.updateOne(
                            query,
                            {
                                $inc:
                                    increment
                            },
                            {
                                session:
                                    dbSession
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


                // ==========================================
                // SUBSTATION INVENTORY
                // ==========================================

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
                            item =>
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
                            inventoryItem.units || 0
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


                // ==========================================
                // PRODUCT REDUCTIONS
                // ==========================================

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
                                item =>
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


                // ==========================================
                // SAVE SUBSTATION
                // ==========================================

                await substation.save({
                    session:
                        dbSession
                });


                // ==========================================
                // CREATE STAFF SALE
                // ==========================================

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


                // ==========================================
                // CLEAR CART
                //
                // THIS HAPPENS ONLY AFTER THE SALE HAS
                // SUCCESSFULLY BEEN CREATED.
                // ==========================================

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


// ==========================================================
// CALCULATE TOTAL
// ==========================================================

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
                Number(
                    item.qty || 0
                )
            );

        },
        0
    );
}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    getOrCreateCart,

    addToCart,

    getCart,

    removeItem,

    calculateTotal,

    createStaffSale

};