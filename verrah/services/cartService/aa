// ==========================================================
// verrah/services/cartService.js
// CART SERVICE
// VERRAH COSMETICS
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
    getUserId
} = require("./shopContext");


// ==========================================================
// GET LOGGED-IN USER ID
// ==========================================================

function getLoggedInUserId(req) {

    return getUserId(req);

}


// ==========================================================
// NORMALIZE REQUESTED QUANTITY
// ==========================================================

function normalizeRequestedQuantity(value) {

    const qty =
        Number(value);

    if (
        !Number.isFinite(qty) ||
        qty <= 0
    ) {

        return null;

    }

    return Math.floor(qty);

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

    if (!userId) {

        throw new Error(
            "User is not authenticated."
        );

    }

    let cartQuery =
        Cart.findOne({
            user:
                userId
        });

    if (session) {

        cartQuery =
            cartQuery.session(session);

    }

    let cart =
        await cartQuery;

    if (!cart) {

        cart =
            new Cart({
                user:
                    userId,

                items:
                    [],

                isMobile:
                    true
            });

        await cart.save(
            session
                ? { session }
                : undefined
        );

    }

    return cart;

}


// ==========================================================
// ADD PRODUCT TO CART
// ==========================================================

async function addToCart(
    req,
    productId,
    quantity
) {

    const qty =
        normalizeRequestedQuantity(
            quantity
        );

    if (!qty) {

        throw new Error(
            "Invalid quantity."
        );

    }

    if (
        !mongoose.Types.ObjectId.isValid(
            productId
        )
    ) {

        throw new Error(
            "Invalid product."
        );

    }

    const product =
        await Product.findOne({
            _id:
                productId,

            isActive:
                true
        }).lean();

    if (!product) {

        throw new Error(
            "Product not found or inactive."
        );

    }

    if (
        product.units !== undefined &&
        Number(product.units) < qty
    ) {

        throw new Error(
            `Only ${product.units} unit(s) available.`
        );

    }

    const cart =
        await getOrCreateCart(req);

    const existingItem =
        cart.items.find(
            item =>
                String(item.productId) ===
                String(product._id)
        );

    if (existingItem) {

        const newQty =
            Number(existingItem.qty || 0) +
            qty;

        if (
            product.units !== undefined &&
            Number(product.units) < newQty
        ) {

            throw new Error(
                `Only ${product.units} unit(s) available.`
            );

        }

        existingItem.qty =
            newQty;

        // --------------------------------------------------
        // Keep the original cart price snapshot.
        // --------------------------------------------------

        if (
            existingItem.price === undefined ||
            existingItem.price === null
        ) {

            existingItem.price =
                Number(
                    product.unitSellPrice || 0
                );

        }

    } else {

        cart.items.push({

            product:
                product._id,

            productId:
                product._id,

            name:
                product.name || "",

            price:
                Number(
                    product.unitSellPrice || 0
                ),

            image:
                product.image || "",

            qty:
                qty

        });

    }

    await cart.save();

    return cart;

}


// ==========================================================
// GET CART
// ==========================================================

async function getCart(req) {

    const userId =
        getLoggedInUserId(req);

    if (!userId) {

        return null;

    }

    return Cart.findOne({
        user:
            userId
    })
        .populate("items.product")
        .lean();

}


// ==========================================================
// UPDATE PAYMENT MODE
// ==========================================================
//
// isMobile = true
//     -> M-Pesa
//
// isMobile = false
//     -> Cash
//
// Authorization is handled by the controller.
// Both admin and staff are allowed.
// ==========================================================

async function updatePaymentMode(
    req,
    isMobile
) {

    const userId =
        getLoggedInUserId(req);

    if (!userId) {

        throw new Error(
            "User is not authenticated."
        );

    }

    if (
        typeof isMobile !== "boolean"
    ) {

        throw new Error(
            "Invalid payment mode."
        );

    }

    const cart =
        await Cart.findOne({
            user:
                userId
        });

    if (!cart) {

        throw new Error(
            "Cart not found."
        );

    }

    cart.isMobile =
        isMobile;

    await cart.save();

    return cart;

}


// ==========================================================
// REMOVE ITEM FROM CART
// ==========================================================

async function removeItem(
    req,
    productId
) {

    const userId =
        getLoggedInUserId(req);

    if (!userId) {

        throw new Error(
            "User is not authenticated."
        );

    }

    const cart =
        await Cart.findOne({
            user:
                userId
        });

    if (!cart) {

        throw new Error(
            "Cart not found."
        );

    }

    cart.items =
        cart.items.filter(
            item =>
                String(item.productId) !==
                String(productId)
        );

    await cart.save();

    return cart;

}


// ==========================================================
// CREATE STAFF / ADMIN CASH SALE
// ==========================================================
//
// saleData:
//
// {
//     salesName,
//     salesSubstation
// }
//
// STAFF:
//     Uses user.assignedSubstation.
//
// ADMIN:
//     Uses submitted salesSubstation.
//
// The selected substation is used for:
//
//     1. productInventory
//     2. productReductions
//     3. StaffSale.salesSubstation
//
// ==========================================================

async function createStaffSale(
    req,
    saleData = {}
) {

    const userId =
        getLoggedInUserId(req);

    if (!userId) {

        throw new Error(
            "User is not authenticated."
        );

    }


    // ======================================================
    // SALES NAME
    // ======================================================

    const salesName =
        String(
            saleData.salesName || ""
        ).trim();

    if (!salesName) {

        throw new Error(
            "Sales name is required."
        );

    }

    if (
        salesName.length > 150
    ) {

        throw new Error(
            "Sales name cannot exceed 150 characters."
        );

    }


    // ======================================================
    // REQUESTED SUBSTATION
    // ======================================================

    let requestedSubstation =
        saleData.salesSubstation;


    // ======================================================
    // START TRANSACTION
    // ======================================================

    const session =
        await mongoose.startSession();

    let sale;


    try {

        await session.withTransaction(
            async () => {


                // ==================================================
                // LOAD USER
                // ==================================================

                const user =
                    await User.findById(
                        userId
                    ).session(session);

                if (!user) {

                    throw new Error(
                        "User not found."
                    );

                }


                // ==================================================
                // ROLE
                // ==================================================

                const role =
                    String(
                        user.role || ""
                    ).toLowerCase();


                if (
                    role !== "staff" &&
                    role !== "admin"
                ) {

                    throw new Error(
                        "Only admin or staff can complete cash sales."
                    );

                }


                // ==================================================
                // DETERMINE SALES SUBSTATION
                // ==================================================
                //
                // STAFF:
                //     NEVER trust a submitted substation.
                //
                //     Always use:
                //
                //         user.assignedSubstation
                //
                // ADMIN:
                //     Use:
                //
                //         saleData.salesSubstation
                //
                // ==================================================

                let salesSubstation;


                if (role === "staff") {

                    salesSubstation =
                        user.assignedSubstation;

                } else {

                    salesSubstation =
                        requestedSubstation;

                }


                // ==================================================
                // HANDLE POPULATED SUBSTATION
                // ==================================================

                if (
                    salesSubstation &&
                    typeof salesSubstation === "object" &&
                    salesSubstation._id
                ) {

                    salesSubstation =
                        salesSubstation._id;

                }


                // ==================================================
                // VALIDATE SUBSTATION ID
                // ==================================================

                if (
                    !salesSubstation ||
                    !mongoose.Types.ObjectId.isValid(
                        salesSubstation
                    )
                ) {

                    if (role === "staff") {

                        throw new Error(
                            "Your account does not have an assigned substation."
                        );

                    }

                    throw new Error(
                        "A valid sales substation is required."
                    );

                }


                salesSubstation =
                    new mongoose.Types.ObjectId(
                        salesSubstation
                    );


                // ==================================================
                // LOAD SELECTED SUBSTATION
                // ==================================================

                const substation =
                    await Substation.findById(
                        salesSubstation
                    ).session(session);

                if (!substation) {

                    throw new Error(
                        "Selected sales substation was not found."
                    );

                }


                // ==================================================
                // LOAD CART
                // ==================================================

                const cart =
                    await Cart.findOne({
                        user:
                            userId
                    }).session(session);

                if (!cart) {

                    throw new Error(
                        "Cart not found."
                    );

                }


                if (
                    !Array.isArray(cart.items) ||
                    cart.items.length === 0
                ) {

                    throw new Error(
                        "Your cart is empty."
                    );

                }


                // ==================================================
                // PRODUCT IDS
                // ==================================================

                const productIds =
                    cart.items.map(
                        item =>
                            item.productId ||
                            item.product
                    );


                // ==================================================
                // LOAD PRODUCTS
                // ==================================================

                const products =
                    await Product.find({
                        _id:
                            {
                                $in:
                                    productIds
                            }
                    }).session(session);


                const productMap =
                    new Map(
                        products.map(
                            product => [
                                String(
                                    product._id
                                ),
                                product
                            ]
                        )
                    );


                // ==================================================
                // SALE PRODUCT SNAPSHOT
                // ==================================================

                const saleProducts =
                    [];

                let totalAmount =
                    0;


                // ==================================================
                // VALIDATE EVERYTHING BEFORE REDUCING STOCK
                // ==================================================

                for (
                    const cartItem
                    of cart.items
                ) {

                    const productId =
                        cartItem.productId ||
                        cartItem.product;

                    const product =
                        productMap.get(
                            String(productId)
                        );


                    // ----------------------------------------------
                    // PRODUCT EXISTS
                    // ----------------------------------------------

                    if (!product) {

                        throw new Error(
                            `Product ${productId} was not found.`
                        );

                    }


                    // ----------------------------------------------
                    // PRODUCT ACTIVE
                    // ----------------------------------------------

                    if (
                        product.isActive === false
                    ) {

                        throw new Error(
                            `${product.name} is no longer available.`
                        );

                    }


                    // ----------------------------------------------
                    // QUANTITY
                    // ----------------------------------------------

                    const qty =
                        normalizeRequestedQuantity(
                            cartItem.qty
                        );

                    if (!qty) {

                        throw new Error(
                            `Invalid quantity for ${product.name}.`
                        );

                    }


                    // ----------------------------------------------
                    // GLOBAL PRODUCT STOCK
                    // ----------------------------------------------

                    if (
                        product.units !== undefined &&
                        Number(product.units) < qty
                    ) {

                        throw new Error(
                            `Insufficient stock for ${product.name}. Available: ${product.units}.`
                        );

                    }


                    // ----------------------------------------------
                    // SUBSTATION STOCK
                    // ----------------------------------------------

                    if (
                        Array.isArray(
                            product.substationUnits
                        )
                    ) {

                        const substationStock =
                            product.substationUnits.find(
                                entry =>
                                    String(
                                        entry.substation
                                    ) ===
                                    String(
                                        salesSubstation
                                    )
                            );


                        const availableUnits =
                            substationStock
                                ? Number(
                                    substationStock.units || 0
                                )
                                : 0;


                        if (
                            availableUnits <
                            qty
                        ) {

                            throw new Error(
                                `Insufficient ${product.name} stock at ${substation.name}. Available: ${availableUnits}.`
                            );

                        }

                    }


                    // ----------------------------------------------
                    // CART PRICE SNAPSHOT
                    // ----------------------------------------------

                    let price =
                        Number(
                            cartItem.price
                        );


                    if (
                        !Number.isFinite(price) ||
                        price < 0
                    ) {

                        price =
                            Number(
                                product.unitSellPrice || 0
                            );

                    }


                    if (
                        !Number.isFinite(price) ||
                        price < 0
                    ) {

                        throw new Error(
                            `Invalid selling price for ${product.name}.`
                        );

                    }


                    // ----------------------------------------------
                    // ITEM TOTAL
                    // ----------------------------------------------

                    const itemTotal =
                        price * qty;


                    // ----------------------------------------------
                    // SALE SNAPSHOT
                    // ----------------------------------------------

                    saleProducts.push({

                        productId:
                            product._id,

                        name:
                            product.name || "",

                        image:
                            product.image || "",

                        category:
                            product.category || "",

                        subcategory:
                            product.subcategory || "",

                        qty:
                            qty,

                        price:
                            price,

                        total:
                            itemTotal

                    });


                    totalAmount +=
                        itemTotal;

                }


                // ==================================================
                // REDUCE GLOBAL PRODUCT STOCK
                // ==================================================

                for (
                    const cartItem
                    of cart.items
                ) {

                    const productId =
                        cartItem.productId ||
                        cartItem.product;

                    const product =
                        productMap.get(
                            String(productId)
                        );

                    const qty =
                        normalizeRequestedQuantity(
                            cartItem.qty
                        );


                    if (
                        product.units !== undefined
                    ) {

                        const updatedProduct =
                            await Product.findOneAndUpdate(
                                {
                                    _id:
                                        product._id,

                                    isActive:
                                        true,

                                    units:
                                        {
                                            $gte:
                                                qty
                                        }
                                },
                                {
                                    $inc:
                                        {
                                            units:
                                                -qty
                                        }
                                },
                                {
                                    new:
                                        true,

                                    session
                                }
                            );


                        if (!updatedProduct) {

                            throw new Error(
                                `Stock changed while processing ${product.name}. Please try again.`
                            );

                        }

                    }

                }


                // ==================================================
                // REDUCE SELECTED SUBSTATION INVENTORY
                // ==================================================
                //
                // This applies to:
                //
                // STAFF  -> assignedSubstation
                // ADMIN  -> salesSubstation
                //
                // ==================================================

                if (
                    Array.isArray(
                        substation.productInventory
                    )
                ) {

                    for (
                        const cartItem
                        of cart.items
                    ) {

                        const productId =
                            cartItem.productId ||
                            cartItem.product;

                        const product =
                            productMap.get(
                                String(productId)
                            );

                        const qty =
                            normalizeRequestedQuantity(
                                cartItem.qty
                            );


                        const inventoryItem =
                            substation.productInventory.find(
                                item =>
                                    String(
                                        item.productId
                                    ) ===
                                    String(
                                        productId
                                    )
                            );


                        if (
                            inventoryItem
                        ) {

                            const currentUnits =
                                Number(
                                    inventoryItem.units || 0
                                );


                            if (
                                currentUnits <
                                qty
                            ) {

                                throw new Error(
                                    `Insufficient ${inventoryItem.productName || product?.name || "product"} stock at ${substation.name}. Available: ${currentUnits}.`
                                );

                            }


                            inventoryItem.units =
                                currentUnits -
                                qty;


                            inventoryItem.productName =
                                product?.name ||
                                inventoryItem.productName ||
                                "";


                            inventoryItem.category =
                                product?.category ||
                                inventoryItem.category ||
                                "";


                            inventoryItem.subcategory =
                                product?.subcategory ||
                                inventoryItem.subcategory ||
                                "";


                            inventoryItem.updatedAt =
                                new Date();

                        } else {

                            throw new Error(
                                `${product?.name || "Product"} is not available in ${substation.name} inventory.`
                            );

                        }

                    }

                } else {

                    throw new Error(
                        `${substation.name} has no product inventory.`
                    );

                }


                // ==================================================
                // UPDATE PRODUCT REDUCTIONS
                // ==================================================
                //
                // IMPORTANT:
                //
                // Your schema requires:
                //
                //     productId
                //     productName
                //     category
                //     unitsReduced
                //     lastReducedAt
                //
                // ==================================================

                if (
                    !Array.isArray(
                        substation.productReductions
                    )
                ) {

                    substation.productReductions =
                        [];

                }


                for (
                    const cartItem
                    of cart.items
                ) {

                    const productId =
                        cartItem.productId ||
                        cartItem.product;

                    const product =
                        productMap.get(
                            String(productId)
                        );

                    const qty =
                        normalizeRequestedQuantity(
                            cartItem.qty
                        );


                    const reduction =
                        substation.productReductions.find(
                            item =>
                                String(
                                    item.productId
                                ) ===
                                String(
                                    productId
                                )
                        );


                    if (
                        reduction
                    ) {

                        reduction.unitsReduced =
                            Number(
                                reduction.unitsReduced || 0
                            ) +
                            qty;


                        reduction.productName =
                            product?.name ||
                            reduction.productName ||
                            "";


                        reduction.category =
                            product?.category ||
                            reduction.category ||
                            "";


                        reduction.lastReducedAt =
                            new Date();

                    } else {

                        substation.productReductions.push({

                            productId:
                                productId,

                            productName:
                                product?.name || "",

                            category:
                                product?.category || "",

                            unitsReduced:
                                qty,

                            lastReducedAt:
                                new Date()

                        });

                    }

                }


                // ==================================================
                // SAVE SUBSTATION
                // ==================================================

                await substation.save({
                    session
                });


                // ==================================================
                // CREATE STAFF SALE
                // ==================================================

                sale =
                    new StaffSale({

                        salesName:
                            salesName,

                        // ------------------------------------------------
                        // This field must be added to staff-sales.js
                        // ------------------------------------------------

                        salesSubstation:
                            salesSubstation,

                        products:
                            saleProducts,

                        totalAmount:
                            totalAmount,

                        soldBy:
                            user._id

                    });


                await sale.save({
                    session
                });


                // ==================================================
                // CLEAR CART
                // ==================================================

                cart.items =
                    [];

                await cart.save({
                    session
                });

            }
        );


        return sale;

    } finally {

        await session.endSession();

    }

}


// ==========================================================
// CALCULATE CART TOTAL
// ==========================================================
//
// Uses the price stored in the cart snapshot.
// Does not query current product prices.
// ==========================================================

function calculateTotal(cart) {

    if (
        !cart ||
        !Array.isArray(cart.items)
    ) {

        return 0;

    }

    return cart.items.reduce(
        (
            total,
            item
        ) => {

            const price =
                Number(
                    item.price || 0
                );

            const qty =
                Number(
                    item.qty || 0
                );

            return total +
                (
                    price *
                    qty
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

    updatePaymentMode,

    removeItem,

    createStaffSale,

    calculateTotal

};