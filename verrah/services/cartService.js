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
        }).session(
            session
        );


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
        Number(
            requestedQty
        );


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

                const product =
                    await Product.findOneAndUpdate(
                        {
                            _id:
                                productId,

                            isActive:
                                true,

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
                                reservedUnits:
                                    qty
                            }
                        },

                        {
                            new:
                                true,

                            session:
                                dbSession
                        }
                    ).lean();


                if (!product) {

                    throw new Error(
                        "The requested quantity is not available."
                    );
                }


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


                if (existing) {

                    existing.qty +=
                        qty;

                    existing.name =
                        product.name;

                    existing.price =
                        product.unitSellPrice;

                    existing.image =
                        product.image ||
                        "";

                } else {

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
// REMOVE ITEM
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

    const staffId =
        getUserId(req);


    if (!staffId) {

        throw new Error(
            "Login is required."
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


    const sessionId =
        getSessionId(req);


    if (!sessionId) {

        throw new Error(
            "Cart session is missing."
        );
    }


    const dbSession =
        await mongoose.startSession();


    let result;


    try {

        await dbSession.withTransaction(
            async () => {

                // ==========================================
                // STAFF
                // ==========================================

                const staff =
                    await User.findOne({
                        _id:
                            staffId,

                        role:
                            "staff"
                    })
                        .select(
                            "_id assignedSubstation"
                        )
                        .session(
                            dbSession
                        );


                if (!staff) {

                    throw new Error(
                        "Staff account not found."
                    );
                }


                if (
                    !staff.assignedSubstation
                ) {

                    throw new Error(
                        "You do not have an assigned substation."
                    );
                }


                // ==========================================
                // ASSIGNED SUBSTATION
                // ==========================================

                const substation =
                    await Substation.findById(
                        staff.assignedSubstation
                    ).session(
                        dbSession
                    );


                if (!substation) {

                    throw new Error(
                        "Your assigned substation was not found."
                    );
                }


                // ==========================================
                // CART
                // ==========================================

                const cart =
                    await Cart.findOne({
                        sessionId,

                        user:
                            staff._id
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


                // ==========================================
                // BUILD STAFF SALE PRODUCTS
                // ==========================================

                const products = [];

                let totalAmount = 0;


                for (
                    const cartItem of cart.items
                ) {

                    const productId =
                        cartItem.product ||
                        cartItem.productId;


                    if (!productId) {

                        throw new Error(
                            "A cart item has no product ID."
                        );
                    }


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


                    if (
                        !Number.isInteger(qty) ||
                        qty < 1
                    ) {

                        throw new Error(
                            `Invalid quantity for ${cartItem.name}.`
                        );
                    }


                    if (
                        !Number.isFinite(price) ||
                        price < 0
                    ) {

                        throw new Error(
                            `Invalid selling price for ${cartItem.name}.`
                        );
                    }


                    const itemTotal =
                        price * qty;


                    totalAmount +=
                        itemTotal;


                    // --------------------------------------
                    // Get product for category information
                    // --------------------------------------

                    const product =
                        await Product.findById(
                            productId
                        )
                            .select(
                                "name image category subcategory"
                            )
                            .session(
                                dbSession )
                            .lean();


                    products.push({

                        productId,

                        name:
                            cartItem.name ||
                            product?.name ||
                            "",

                        image:
                            cartItem.image ||
                            product?.image ||
                            "",

                        category:
                            product?.category ||
                            "",

                        subcategory:
                            product?.subcategory ||
                            "",

                        qty,

                        price,

                        total:
                            itemTotal
                    });
                }


                // ==========================================
                // CREATE STAFF SALE
                // ==========================================

                const createdSales =
                    await StaffSale.create(
                        [
                            {
                                salesName:
                                    cleanSalesName,

                                products,

                                totalAmount,

                                soldBy:
                                    staff._id
                            }
                        ],
                        {
                            session:
                                dbSession
                        }
                    );


                const staffSale =
                    createdSales[0];


                // ==========================================
                // UPDATE PRODUCT REDUCTIONS
                // ==========================================

                for (
                    const item of products
                ) {

                    let reduction =
                        substation.productReductions.find(
                            reductionItem =>
                                String(
                                    reductionItem.productId
                                ) ===
                                String(
                                    item.productId
                                )
                        );


                    if (!reduction) {

                        substation.productReductions.push(
                            {
                                productId:
                                    item.productId,

                                productName:
                                    item.name,

                                category:
                                    item.category,

                                unitsReduced:
                                    item.qty,

                                lastReducedAt:
                                    new Date()
                            }
                        );

                    } else {

                        reduction.productName =
                            item.name;

                        reduction.category =
                            item.category ||
                            reduction.category ||
                            "";

                        reduction.unitsReduced =
                            Number(
                                reduction.unitsReduced ||
                                0
                            ) +
                            item.qty;

                        reduction.lastReducedAt =
                            new Date();
                    }
                }


                await substation.save({
                    session:
                        dbSession
                });


                // ==========================================
                // RELEASE CART RESERVATIONS
                // ==========================================

                for (
                    const item of cart.items
                ) {

                    const productId =
                        item.product ||
                        item.productId;


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
                }


                // ==========================================
                // REMOVE CART
                // ==========================================

                await Cart.deleteOne(
                    {
                        _id:
                            cart._id
                    },
                    {
                        session:
                            dbSession
                    }
                );


                // ==========================================
                // RETURN DATA TO CONTROLLER
                // ==========================================

                result = {

                    sale:
                        staffSale,

                    substationId:
                        String(
                            staff.assignedSubstation
                        )
                };
            }
        );


        return result;

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
        cart?.items ||
        []
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
// EXPORT
// =========================================================

module.exports = {

    getOrCreateCart,

    addToCart,

    getCart,

    removeItem,

    calculateTotal,

    createStaffSale
};