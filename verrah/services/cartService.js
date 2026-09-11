// =========================================================
// verrah/services/cartService.js
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
//
// IMPORTANT:
// Adding a Product to the cart DOES NOT change
// Product.units.
//
// There is NO reserved quantity.
// There is NO reservedUnits.
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

                // ---------------------------------------------
                // GET PRODUCT
                // ---------------------------------------------

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


                // ---------------------------------------------
                // GET CART
                // ---------------------------------------------

                const cart =
                    await getOrCreateCart(
                        req,
                        dbSession
                    );


                // ---------------------------------------------
                // CHECK EXISTING CART QUANTITY
                //
                // We do not reserve anything.
                //
                // We simply prevent the cart from containing
                // more units than the Product currently has.
                // ---------------------------------------------

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


                const existingQty =
                    existing
                        ? Number(existing.qty || 0)
                        : 0;


                const newQty =
                    existingQty + qty;


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


                // ---------------------------------------------
                // UPDATE EXISTING CART ITEM
                // ---------------------------------------------

                if (existing) {

                    existing.qty =
                        newQty;

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

                } else {

                    // -----------------------------------------
                    // ADD NEW CART ITEM
                    // -----------------------------------------

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


                // ---------------------------------------------
                // SAVE CART ONLY
                //
                // Product.units remains unchanged.
                // ---------------------------------------------

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
// Removing a Product from the cart DOES NOT change
// Product.units.
//
// There is nothing to release because nothing was reserved.
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

                // ---------------------------------------------
                // REMOVE ITEM FROM CART
                //
                // Product.units is NOT changed.
                // ---------------------------------------------

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
// Staff sales use Product.units directly.
//
// Required:
//
// Product.units >= quantity being sold
//
// After successful sale:
//
// Product.units -= quantity
//
// There is NO reserved quantity.
// There is NO reservedUnits.
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
                // SALE SNAPSHOTS
                // =============================================

                const saleProducts = [];

                let totalAmount = 0;


                // =============================================
                // VERIFY EVERY PRODUCT
                // =============================================

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


                    if (!product.isActive) {

                        throw new Error(
                            `Product "${product.name}" is no longer available.`
                        );
                    }


                    // -----------------------------------------
                    // CURRENT PRODUCT UNITS
                    // -----------------------------------------

                    const availableUnits =
                        Number(
                            product.units || 0
                        );


                    // -----------------------------------------
                    // PRODUCT UNITS CHECK
                    //
                    // This is the ONLY quantity check.
                    // -----------------------------------------

                    if (
                        availableUnits <
                        qty
                    ) {

                        throw new Error(
                            `Only ${availableUnits} units of "${product.name}" are available.`
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
                // REDUCE PRODUCT.UNITS
                //
                // This is where the Product quantity actually
                // decreases for a staff sale.
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

                                isActive:
                                    true,

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
                            `The available units for "${saleItem.name}" changed before the sale could be completed.`
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

                    let reduction;


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