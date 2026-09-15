// ==========================================================
// verrah/services/cartService.js
//
// VERRAH COSMETICS
// CART SERVICE
// ==========================================================

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
    getUserId
} = require("./shopContext");


// ==========================================================
// CART USER HELPER
// ==========================================================

function getLoggedInUserId(req) {

    return getUserId(req);
}


// ==========================================================
// NORMALIZE QUANTITY
// ==========================================================

function normalizeRequestedQuantity(
    req,
    requestedQty
) {

    let value =
        requestedQty;


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
// GET OR CREATE USER CART
// ==========================================================

async function getOrCreateCart(
    req,
    session = null
) {

    const userId =
        getLoggedInUserId(req);


    if (!userId) {

        throw new Error(
            "You must be logged in to use the cart."
        );
    }


    let cart =
        await Cart.findOne({
            user:
                userId
        }).session(
            session
        );


    if (cart) {

        return cart;
    }


    cart =
        new Cart({

            user:
                userId,

            items:
                [],

            totalPrice:
                0
        });


    await cart.save({
        session
    });


    return cart;
}


// ==========================================================
// ADD TO CART
//
// Adding quantity increases existing quantity.
// Inventory is NOT reduced here.
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

        let result =
            null;


        await dbSession.withTransaction(
            async () => {

                const product =
                    await Product.findOne({

                        _id:
                            productId,

                        isActive:
                            true

                    }).session(
                        dbSession
                    );


                if (!product) {

                    throw new Error(
                        "The requested Product could not be found."
                    );
                }


                const availableUnits =
                    Number(
                        product.units ||
                        0
                    );


                if (
                    availableUnits < 1
                ) {

                    throw new Error(
                        `"${product.name}" is currently out of stock.`
                    );
                }


                const cart =
                    await getOrCreateCart(
                        req,
                        dbSession
                    );


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


                const existingQty =
                    existing
                        ? Number(
                            existing.qty ||
                            0
                        )
                        : 0;


                const newQty =
                    existingQty +
                    qty;


                if (
                    newQty >
                    availableUnits
                ) {

                    throw new Error(
                        `Only ${availableUnits} units of "${product.name}" are available. You already have ${existingQty} in your cart.`
                    );
                }


                const price =
                    Number(
                        product.unitSellPrice ||
                        0
                    );


                if (existing) {

                    existing.product =
                        product._id;

                    existing.productId =
                        product._id;

                    existing.name =
                        product.name;

                    existing.price =
                        price;

                    existing.image =
                        product.image ||
                        "";

                    existing.qty =
                        newQty;

                } else {

                    cart.items.push({

                        product:
                            product._id,

                        productId:
                            product._id,

                        name:
                            product.name,

                        image:
                            product.image ||
                            "",

                        price,

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


// ==========================================================
// GET CART
//
// IMPORTANT:
// This returns a LEAN object for reading.
//
// Do NOT call .save() on the result of this function.
//
// Any write operation must retrieve a real Mongoose
// document separately.
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
        .populate(
            "items.product"
        )
        .lean();
}


// ==========================================================
// UPDATE PAYMENT MODE
//
// true  = M-PESA
// false = CASH
//
// IMPORTANT:
//
// We DO NOT use getCart() here because getCart()
// deliberately returns a lean object.
//
// Instead, we retrieve the actual Mongoose Cart
// document and then save it.
// ==========================================================

async function updatePaymentMode(
    req,
    isMobile
) {

    const userId =
        getLoggedInUserId(req);


    if (!userId) {

        const error =
            new Error(
                "You must be logged in to modify your cart."
            );

        error.statusCode =
            401;

        throw error;
    }


    if (
        typeof isMobile !==
        "boolean"
    ) {

        const error =
            new Error(
                "Payment mode must be true or false."
            );

        error.statusCode =
            400;

        throw error;
    }


    const cart =
        await Cart.findOne({

            user:
                userId

        });


    if (!cart) {

        const error =
            new Error(
                "Cart not found."
            );

        error.statusCode =
            404;

        throw error;
    }


    cart.isMobile =
        isMobile;


    await cart.save();


    return cart;
}


// ==========================================================
// REMOVE CART ITEM
// ==========================================================

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
            "Invalid Product ID."
        );
    }


    const userId =
        getLoggedInUserId(req);


    if (!userId) {

        throw new Error(
            "You must be logged in to modify your cart."
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


    cart.items =
        cart.items.filter(
            currentItem => {

                const storedProductId =
                    currentItem.productId ||
                    currentItem.product;

                return (
                    String(
                        storedProductId
                    ) !==
                    String(
                        productId
                    )
                );
            }
        );


    await cart.save();


    return cart;
}


// ==========================================================
// CREATE STAFF SALE
//
// Inventory is reduced ONLY here.
//
// The cart is cleared only after all sale operations
// succeed inside the transaction.
// ==========================================================

async function createStaffSale(
    req,
    salesName
) {

    const userId =
        getLoggedInUserId(req);


    if (!userId) {

        throw new Error(
            "You must be logged in to record a sale."
        );
    }


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

        let sale =
            null;


        await dbSession.withTransaction(
            async () => {

                // ------------------------------------------
                // STAFF
                // ------------------------------------------

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
                        staff.role ||
                        ""
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


                // ------------------------------------------
                // ASSIGNED SUBSTATION
                // ------------------------------------------

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


                // ------------------------------------------
                // STAFF CART
                // ------------------------------------------

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


                // ------------------------------------------
                // BUILD SALE SNAPSHOT
                // ------------------------------------------

                const saleProducts =
                    [];

                let totalAmount =
                    0;


                for (
                    const cartItem
                    of cart.items
                ) {

                    const productId =
                        cartItem.productId ||
                        cartItem.product;


                    if (!productId) {

                        throw new Error(
                            "A cart item has no Product ID."
                        );
                    }


                    const qty =
                        Number(
                            cartItem.qty
                        );


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


                    if (
                        !product.isActive
                    ) {

                        throw new Error(
                            `Product "${product.name}" is no longer available.`
                        );
                    }


                    const availableUnits =
                        Number(
                            product.units ||
                            0
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
                        price *
                        qty;


                    totalAmount +=
                        lineTotal;


                    let category =
                        "";


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
                            "",

                        qty,

                        price,

                        total:
                            lineTotal,

                        hasSubstationUnits,

                        availableSubstationUnits
                    });
                }


                // ------------------------------------------
                // REDUCE PRODUCT INVENTORY
                // ------------------------------------------

                for (
                    const saleItem
                    of saleProducts
                ) {

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


                // ------------------------------------------
                // SUBSTATION INVENTORY
                // ------------------------------------------

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


                // ------------------------------------------
                // PRODUCT REDUCTIONS
                // ------------------------------------------

                for (
                    const saleItem
                    of saleProducts
                ) {

                    let reduction =
                        null;


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


                // ------------------------------------------
                // SAVE SUBSTATION
                // ------------------------------------------

                await substation.save({

                    session:
                        dbSession
                });


                // ------------------------------------------
                // CREATE STAFF SALE
                // ------------------------------------------

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


                // ------------------------------------------
                // CLEAR STAFF CART
                // ------------------------------------------

                cart.items =
                    [];


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
        cart?.items ||
        []
    ).reduce(

        (
            total,
            item
        ) => {

            const price =
                Number(
                    item.price ||
                    0
                );


            const qty =
                Number(
                    item.qty ||
                    0
                );


            return (
                total +
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

    calculateTotal,

    createStaffSale
};