// =========================================================
// services/corevester/productsService.js
// =========================================================
//
// COREVESTER MARKETPLACE SERVICE
//
// PRODUCT FIELDS
// ---------------------------------------------------------
// name
// category
// units
// unitSellPrice
// image
//
// CART
// ---------------------------------------------------------
// Cart is maintained per session/user.
//
// IMPORTANT:
// ---------------------------------------------------------
// Cart quantities DO NOT immediately modify Product.units.
//
// Example:
//
//     Product.units = 80
//     Cart.qty      = 3
//
// Marketplace availability:
//     77
//
// Database Product.units remains:
//     80
//
// This prevents simply adding something to a cart from
// permanently consuming stock.
//
// =========================================================

const Product =
    require("../../models/corevester/products");


// =========================================================
// CART STORAGE
// =========================================================
//
// Map:
//
//     sessionId -> [
//         {
//             productId,
//             name,
//             price,
//             qty
//         }
//     ]
//
// =========================================================

const carts =
    new Map();


// =========================================================
// INTERNAL HELPERS
// =========================================================

function normalizeString(value) {

    return String(
        value == null
            ? ""
            : value
    ).trim();

}


function normalizeCategory(value) {

    return normalizeString(value);

}


function normalizeImage(value) {

    const image =
        normalizeString(value);

    return image || "";

}


function getNumeric(value, fallback = 0) {

    const number =
        Number(value);

    return Number.isFinite(number)
        ? number
        : fallback;

}


function getCartInternal(sessionId) {

    const key =
        normalizeString(sessionId) ||
        "anonymous";


    if (!carts.has(key)) {

        carts.set(
            key,
            []
        );

    }


    return carts.get(key);

}


function cloneCart(cart) {

    return cart.map(item => ({

        productId:
            String(item.productId),

        name:
            item.name,

        price:
            Number(item.price || 0),

        qty:
            Number(item.qty || 0)

    }));

}


// =========================================================
// CLEAN STALE CART ITEMS
// =========================================================
//
// Products can be deleted after somebody has placed them
// in a cart.
//
// Remove those dead references automatically.
//
// Also make sure quantities never exceed current Product.units.
//
// =========================================================

async function cleanCart(sessionId) {

    const cart =
        getCartInternal(sessionId);


    if (!cart.length) {

        return cart;

    }


    const productIds =
        cart.map(item =>
            String(item.productId)
        );


    const products =
        await Product.find({
            _id: {
                $in: productIds
            }
        })
        .lean();


    const productMap =
        new Map();


    products.forEach(product => {

        productMap.set(
            String(product._id),
            product
        );

    });


    const cleaned = [];


    for (const item of cart) {

        const product =
            productMap.get(
                String(item.productId)
            );


        // Product no longer exists.
        if (!product) {

            continue;

        }


        const stock =
            Math.max(
                0,
                getNumeric(
                    product.units
                )
            );


        let quantity =
            Math.max(
                0,
                Number(item.qty || 0)
            );


        // Never allow cart quantity above
        // the actual database stock.
        quantity =
            Math.min(
                quantity,
                stock
            );


        if (quantity <= 0) {

            continue;

        }


        cleaned.push({

            productId:
                String(product._id),

            name:
                product.name,

            price:
                getNumeric(
                    product.unitSellPrice
                ),

            qty:
                quantity

        });

    }


    carts.set(
        normalizeString(sessionId),
        cleaned
    );


    return cleaned;

}


// =========================================================
// GET CATEGORIES
// =========================================================

exports.getCategories = async () => {

    const categories =
        await Product.distinct(
            "category"
        );


    return categories

        .map(category =>
            normalizeCategory(category)
        )

        .filter(Boolean)

        .sort((a, b) =>
            a.localeCompare(
                b,
                undefined,
                {
                    sensitivity: "base"
                }
            )
        );

};


// =========================================================
// GET MARKETPLACE STATS
// =========================================================
//
// These are intentionally named broadly so the EJS can use:
//
//     stats.totalProducts
//     stats.availableProducts
//     stats.totalUnits
//
// =========================================================

exports.getStats = async () => {

    const result =
        await Product.aggregate([

            {
                $group: {

                    _id: null,

                    totalProducts: {
                        $sum: 1
                    },

                    availableProducts: {

                        $sum: {

                            $cond: [

                                {
                                    $gt: [
                                        {
                                            $ifNull: [
                                                "$units",
                                                0
                                            ]
                                        },
                                        0
                                    ]

                                },

                                1,

                                0

                            ]

                        }

                    },

                    totalUnits: {

                        $sum: {

                            $ifNull: [
                                "$units",
                                0
                            ]

                        }

                    }

                }

            }

        ]);


    if (!result.length) {

        return {

            totalProducts: 0,

            availableProducts: 0,

            totalUnits: 0

        };

    }


    return {

        totalProducts:
            Number(
                result[0].totalProducts || 0
            ),

        availableProducts:
            Number(
                result[0].availableProducts || 0
            ),

        totalUnits:
            Number(
                result[0].totalUnits || 0
            )

    };

};


// =========================================================
// GET PRODUCTS
// =========================================================

exports.getProducts =
async () => {

    return Product
        .find({})
        .sort({
            category: 1,
            name: 1
        })
        .lean();

};


// =========================================================
// GET PRODUCTS WITH CART ADJUSTMENT
// =========================================================
//
// This is what the marketplace page uses.
//
// Product database:
//
//     units = 80
//
// Current session cart:
//
//     qty = 3
//
// Returned marketplace product:
//
//     units = 77
//
// Other sessions are unaffected.
//
// =========================================================

exports.getProductsWithCartAdjustment =
async (sessionId) => {

    const products =
        await Product
            .find({})
            .sort({
                category: 1,
                name: 1
            })
            .lean();


    const cart =
        await cleanCart(
            sessionId
        );


    const cartMap =
        new Map();


    cart.forEach(item => {

        cartMap.set(
            String(item.productId),
            Number(item.qty || 0)
        );

    });


    return products.map(product => {

        const productId =
            String(product._id);


        const cartQty =
            cartMap.get(productId) || 0;


        const databaseUnits =
            Math.max(
                0,
                getNumeric(
                    product.units
                )
            );


        const availableUnits =
            Math.max(
                0,
                databaseUnits -
                cartQty
            );


        return {

            ...product,

            // ------------------------------------------------
            // IMPORTANT:
            // Keep the field name as "units".
            // The EJS expects p.units.
            // ------------------------------------------------

            units:
                availableUnits

        };

    });

};


// =========================================================
// GET CART
// =========================================================

exports.getCart =
function(sessionId) {

    const cart =
        getCartInternal(
            sessionId
        );


    return cloneCart(cart);

};


// =========================================================
// ADD TO CART
// =========================================================

exports.addToCart =
async function(
    sessionId,
    productId,
    quantity = 1
) {

    const id =
        normalizeString(productId);


    if (!id) {

        throw new Error(
            "Product ID is required."
        );

    }


    const qty =
        Number.parseInt(
            quantity,
            10
        );


    if (
        !Number.isInteger(qty) ||
        qty < 1
    ) {

        throw new Error(
            "Quantity must be at least 1."
        );

    }


    // -------------------------------------------------------
    // Verify product
    // -------------------------------------------------------

    const product =
        await Product
            .findById(id)
            .lean();


    if (!product) {

        throw new Error(
            "Product not found."
        );

    }


    const stock =
        Math.max(
            0,
            getNumeric(
                product.units
            )
        );


    if (stock <= 0) {

        throw new Error(
            "This product is out of stock."
        );

    }


    // -------------------------------------------------------
    // Current cart
    // -------------------------------------------------------

    const cart =
        getCartInternal(
            sessionId
        );


    const existing =
        cart.find(item =>
            String(item.productId) === id
        );


    const currentQty =
        existing
            ? Number(existing.qty || 0)
            : 0;


    const newQty =
        currentQty + qty;


    if (newQty > stock) {

        throw new Error(

            `Only ${Math.max(
                0,
                stock - currentQty
            )} more unit${
                stock - currentQty === 1
                    ? ""
                    : "s"
            } available.`

        );

    }


    // -------------------------------------------------------
    // Add / update
    // -------------------------------------------------------

    if (existing) {

        existing.qty =
            newQty;

        existing.name =
            product.name;

        existing.price =
            getNumeric(
                product.unitSellPrice
            );

    } else {

        cart.push({

            productId:
                String(product._id),

            name:
                product.name,

            price:
                getNumeric(
                    product.unitSellPrice
                ),

            qty:
                qty

        });

    }


    return cloneCart(cart);

};


// =========================================================
// UPDATE CART QUANTITY
// =========================================================

exports.updateCartQty =
async function(
    sessionId,
    productId,
    quantity
) {

    const id =
        normalizeString(productId);


    const qty =
        Number.parseInt(
            quantity,
            10
        );


    if (!id) {

        throw new Error(
            "Product ID is required."
        );

    }


    if (
        !Number.isInteger(qty) ||
        qty < 1
    ) {

        throw new Error(
            "Quantity must be at least 1."
        );

    }


    const product =
        await Product
            .findById(id)
            .lean();


    if (!product) {

        throw new Error(
            "Product not found."
        );

    }


    const stock =
        Math.max(
            0,
            getNumeric(
                product.units
            )
        );


    if (stock <= 0) {

        throw new Error(
            "This product is out of stock."
        );

    }


    if (qty > stock) {

        throw new Error(

            `Only ${stock} unit${
                stock === 1
                    ? ""
                    : "s"
            } available.`

        );

    }


    const cart =
        getCartInternal(
            sessionId
        );


    const existingIndex =
        cart.findIndex(item =>
            String(item.productId) === id
        );


    if (existingIndex === -1) {

        // If something calls update directly,
        // create the cart item rather than failing.
        cart.push({

            productId:
                String(product._id),

            name:
                product.name,

            price:
                getNumeric(
                    product.unitSellPrice
                ),

            qty

        });

    } else {

        cart[existingIndex] = {

            productId:
                String(product._id),

            name:
                product.name,

            price:
                getNumeric(
                    product.unitSellPrice
                ),

            qty

        };

    }


    return cloneCart(cart);

};


// =========================================================
// REMOVE FROM CART
// =========================================================

exports.removeFromCart =
async function(
    sessionId,
    productId
) {

    const id =
        normalizeString(productId);


    if (!id) {

        throw new Error(
            "Product ID is required."
        );

    }


    const cart =
        getCartInternal(
            sessionId
        );


    const filtered =
        cart.filter(item =>
            String(item.productId) !== id
        );


    carts.set(
        normalizeString(sessionId),
        filtered
    );


    return cloneCart(filtered);

};


// =========================================================
// CREATE PRODUCT
// =========================================================
//
// EXACT FIELD NAMES:
//
//     name
//     category
//     units
//     unitSellPrice
//     image
//
// =========================================================

exports.createProduct =
async function(data = {}) {

    const name =
        normalizeString(
            data.name
        );


    const category =
        normalizeCategory(
            data.category
        );


    const units =
        Number.parseInt(
            data.units,
            10
        );


    const unitSellPrice =
        Number(
            data.unitSellPrice
        );


    const image =
        normalizeImage(
            data.image
        );


    // -------------------------------------------------------
    // Validation
    // -------------------------------------------------------

    if (!name) {

        throw new Error(
            "Product name is required."
        );

    }


    if (!category) {

        throw new Error(
            "Product category is required."
        );

    }


    if (
        !Number.isInteger(units) ||
        units < 1
    ) {

        throw new Error(
            "Units must be at least 1."
        );

    }


    if (
        !Number.isFinite(unitSellPrice) ||
        unitSellPrice < 0
    ) {

        throw new Error(
            "Selling price must be a valid amount."
        );

    }


    // -------------------------------------------------------
    // Prevent accidental duplicate listing
    // -------------------------------------------------------

    const existing =
        await Product.findOne({

            name: {
                $regex:
                    `^${escapeRegex(name)}$`,
                $options: "i"
            },

            category: {
                $regex:
                    `^${escapeRegex(category)}$`,
                $options: "i"
            }

        })
        .lean();


    if (existing) {

        throw new Error(

            `${name} is already listed in the marketplace.`

        );

    }


    // -------------------------------------------------------
    // CREATE
    // -------------------------------------------------------

    const product =
        await Product.create({

            name,

            category,

            units,

            unitSellPrice,

            image

        });


    return product.toObject();

};


// =========================================================
// DELETE PRODUCT
// =========================================================
//
// IMPORTANT:
//
// This removes the Product listing.
//
// It deliberately does NOT invent a Stock model or modify
// an unknown stock collection.
//
// If your existing stock service already handles returning
// listed units to warehouse stock, that logic should be
// called from here using that service.
//
// =========================================================

exports.deleteProduct =
async function(productId) {

    const id =
        normalizeString(productId);


    if (!id) {

        throw new Error(
            "Product ID is required."
        );

    }


    const product =
        await Product
            .findById(id);


    if (!product) {

        throw new Error(
            "Product not found."
        );

    }


    const result =
        product.toObject();


    await Product
        .deleteOne({
            _id: product._id
        });


    // -------------------------------------------------------
    // Remove deleted product from every in-memory cart.
    // -------------------------------------------------------

    for (
        const [
            sessionId,
            cart
        ] of carts.entries()
    ) {

        const filtered =
            cart.filter(item =>
                String(item.productId) !==
                String(product._id)
            );


        carts.set(
            sessionId,
            filtered
        );

    }


    return result;

};


// =========================================================
// ESCAPE REGEX
// =========================================================

function escapeRegex(value) {

    return String(value)
        .replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );

}


// =========================================================
// EXPORTS
// =========================================================

console.log(
    "✅ productsService loaded successfully"
);