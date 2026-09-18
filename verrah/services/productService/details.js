// ==========================================================
// verrah/services/products/details.js
// PRODUCT DETAILS SERVICE
// ==========================================================
//
// Handles:
//
// - Loading a single Product
// - Resolving Product category
// - Preparing product data for the view
// - Loading directions of use
// - Editing Product information
// - Synchronizing the linked Stock record
//
// IMPORTANT FIFO RULE:
//
// Product.fifoBatches and Stock.purchaseBatches are NOT
// modified by the product edit operation.
//
// FIFO quantities and purchase prices must continue to be
// controlled by the stock/FIFO services.
//
// Product.category stores Category._id.
// Stock.category stores Category.name.
// ==========================================================

const mongoose =
    require("mongoose");

const Product =
    require("../../models/products");

const Stock =
    require("../../models/stock");

const Category =
    require("../../models/category");

const {
    normalizeDirections,
    prepareProduct
} = require("./helpers");


// ==========================================================
// GET PRODUCT
// ==========================================================

const getProduct = async (id) => {

    // --------------------------------------------------------
    // VALIDATE PRODUCT ID
    // --------------------------------------------------------

    if (
        !mongoose.Types.ObjectId.isValid(id)
    ) {
        return null;
    }


    // --------------------------------------------------------
    // LOAD PRODUCT + CATEGORY
    // --------------------------------------------------------

    const products =
        await Product.aggregate([
            {
                $match: {
                    _id:
                        new mongoose.Types.ObjectId(id),

                    isActive: true
                }
            },

            {
                $lookup: {
                    from: "categories",

                    localField: "category",

                    foreignField: "_id",

                    as: "categoryData"
                }
            },

            {
                $unwind: {
                    path: "$categoryData",

                    preserveNullAndEmptyArrays: true
                }
            },

            {
                $limit: 1
            }
        ]);


    // --------------------------------------------------------
    // PRODUCT NOT FOUND
    // --------------------------------------------------------

    if (
        !products ||
        products.length === 0
    ) {
        return null;
    }


    const rawProduct =
        products[0];


    // --------------------------------------------------------
    // RESOLVE CATEGORY NAME
    // --------------------------------------------------------

    let categoryName =
        "Other";


    if (
        rawProduct.categoryData &&
        typeof rawProduct.categoryData.name ===
            "string" &&
        rawProduct.categoryData.name.trim()
    ) {
        categoryName =
            rawProduct.categoryData.name.trim();
    }


    // --------------------------------------------------------
    // PREPARE PRODUCT
    // --------------------------------------------------------

    const product =
        prepareProduct(
            rawProduct,
            categoryName
        );


    // --------------------------------------------------------
    // REMOVE INTERNAL CATEGORY DATA
    // --------------------------------------------------------

    delete product.categoryData;


    // --------------------------------------------------------
    // NORMALIZE PRODUCT DIRECTIONS
    // --------------------------------------------------------

    const productDirections =
        normalizeDirections(
            product.directionsOfUse
        );


    // --------------------------------------------------------
    // LOAD STOCK DIRECTIONS IF PRODUCT DOES NOT HAVE THEM
    // --------------------------------------------------------

    if (
        !productDirections &&
        product.stock &&
        mongoose.Types.ObjectId.isValid(
            product.stock
        )
    ) {

        const stock =
            await Stock.findById(
                product.stock
            )
                .select(
                    "directionsOfUse"
                )
                .lean();


        if (stock) {

            product.directionsOfUse =
                normalizeDirections(
                    stock.directionsOfUse
                );

        } else {

            product.directionsOfUse =
                productDirections;

        }

    } else {

        product.directionsOfUse =
            productDirections;

    }


    // --------------------------------------------------------
    // RETURN PRODUCT
    // --------------------------------------------------------

    return product;
};


// ==========================================================
// UPDATE PRODUCT
// ==========================================================
//
// Updates editable Product fields.
//
// The linked Stock record is synchronized for fields that
// Product and Stock both contain.
//
// FIFO fields are deliberately excluded:
//
// Product.fifoBatches
// Stock.purchaseBatches
//
// units and buyPrice are also excluded from this general
// product editor because those values are controlled by the
// FIFO stock system.
//
// Product.unitSellPrice exists only on Product.
// ==========================================================

const updateProduct = async (
    productId,
    data = {}
) => {

    // --------------------------------------------------------
    // VALIDATE PRODUCT ID
    // --------------------------------------------------------

    if (
        !mongoose.Types.ObjectId.isValid(
            productId
        )
    ) {
        return {
            success: false,
            error: "Invalid product ID."
        };
    }


    // --------------------------------------------------------
    // LOAD PRODUCT
    // --------------------------------------------------------

    const product =
        await Product.findById(
            productId
        );


    if (!product) {
        return {
            success: false,
            error: "Product not found."
        };
    }


    // --------------------------------------------------------
    // ALLOWED EDITABLE FIELDS
    // --------------------------------------------------------

    const allowedFields = [
        "name",
        "category",
        "subcategory",
        "days",
        "image",
        "description",
        "directionsOfUse",
        "unitSellPrice",
        "isActive"
    ];


    // --------------------------------------------------------
    // BUILD PRODUCT UPDATE
    // --------------------------------------------------------

    const productUpdate = {};


    for (
        const field of allowedFields
    ) {

        if (
            Object.prototype.hasOwnProperty.call(
                data,
                field
            )
        ) {

            productUpdate[field] =
                data[field];

        }

    }


    // --------------------------------------------------------
    // VALIDATE NAME
    // --------------------------------------------------------

    if (
        Object.prototype.hasOwnProperty.call(
            productUpdate,
            "name"
        )
    ) {

        if (
            typeof productUpdate.name !==
                "string" ||
            !productUpdate.name.trim()
        ) {
            return {
                success: false,
                error: "Product name is required."
            };
        }

        productUpdate.name =
            productUpdate.name.trim();
    }


    // --------------------------------------------------------
    // VALIDATE SUBCATEGORY
    // --------------------------------------------------------

    if (
        Object.prototype.hasOwnProperty.call(
            productUpdate,
            "subcategory"
        )
    ) {

        if (
            typeof productUpdate.subcategory !==
                "string" ||
            !productUpdate.subcategory.trim()
        ) {
            return {
                success: false,
                error: "Subcategory is required."
            };
        }

        productUpdate.subcategory =
            productUpdate.subcategory
                .trim()
                .toLowerCase();
    }


    // --------------------------------------------------------
    // VALIDATE DAYS
    // --------------------------------------------------------

    if (
        Object.prototype.hasOwnProperty.call(
            productUpdate,
            "days"
        )
    ) {

        const days =
            Number(
                productUpdate.days
            );


        if (
            !Number.isFinite(days) ||
            days < 0
        ) {
            return {
                success: false,
                error: "Invalid delivery days."
            };
        }


        productUpdate.days =
            days;
    }


    // --------------------------------------------------------
    // VALIDATE SELL PRICE
    // --------------------------------------------------------

    if (
        Object.prototype.hasOwnProperty.call(
            productUpdate,
            "unitSellPrice"
        )
    ) {

        const price =
            Number(
                productUpdate.unitSellPrice
            );


        if (
            !Number.isFinite(price) ||
            price < 0
        ) {
            return {
                success: false,
                error: "Invalid sell price."
            };
        }


        productUpdate.unitSellPrice =
            price;
    }


    // --------------------------------------------------------
    // VALIDATE IMAGE
    // --------------------------------------------------------

    if (
        Object.prototype.hasOwnProperty.call(
            productUpdate,
            "image"
        )
    ) {

        productUpdate.image =
            typeof productUpdate.image ===
                "string"
                ? productUpdate.image.trim()
                : "";

    }


    // --------------------------------------------------------
    // VALIDATE DESCRIPTION
    // --------------------------------------------------------

    if (
        Object.prototype.hasOwnProperty.call(
            productUpdate,
            "description"
        )
    ) {

        productUpdate.description =
            typeof productUpdate.description ===
                "string"
                ? productUpdate.description.trim()
                : "";

    }


    // --------------------------------------------------------
    // NORMALIZE DIRECTIONS OF USE
    // --------------------------------------------------------

    if (
        Object.prototype.hasOwnProperty.call(
            productUpdate,
            "directionsOfUse"
        )
    ) {

        if (
            productUpdate.directionsOfUse &&
            typeof productUpdate.directionsOfUse ===
                "object"
        ) {

            const directions =
                productUpdate.directionsOfUse;


            productUpdate.directionsOfUse = {

                title:
                    typeof directions.title ===
                        "string"
                        ? directions.title.trim()
                        : "",

                items:
                    Array.isArray(
                        directions.items
                    )
                        ? directions.items.map(
                            item => ({
                                subtitle:
                                    typeof item?.subtitle ===
                                        "string"
                                        ? item.subtitle.trim()
                                        : "",

                                content:
                                    typeof item?.content ===
                                        "string"
                                        ? item.content.trim()
                                        : ""
                            })
                        )
                        : []
            };

        } else {

            productUpdate.directionsOfUse =
                undefined;

        }

    }


    // --------------------------------------------------------
    // VALIDATE ACTIVE STATUS
    // --------------------------------------------------------

    if (
        Object.prototype.hasOwnProperty.call(
            productUpdate,
            "isActive"
        )
    ) {

        productUpdate.isActive =
            productUpdate.isActive === true ||
            productUpdate.isActive === "true";

    }


    // ========================================================
    // CATEGORY
    // ========================================================
    //
    // Product.category = Category._id
    // Stock.category   = Category.name
    //
    // When Product.category changes, resolve the Category
    // document so Stock receives the category NAME.
    // ========================================================

    let stockCategoryName = null;


    if (
        Object.prototype.hasOwnProperty.call(
            productUpdate,
            "category"
        )
    ) {

        if (
            !mongoose.Types.ObjectId.isValid(
                productUpdate.category
            )
        ) {
            return {
                success: false,
                error: "Invalid category."
            };
        }


        const category =
            await Category.findById(
                productUpdate.category
            )
                .select("name")
                .lean();


        if (!category) {
            return {
                success: false,
                error: "Category not found."
            };
        }


        if (
            typeof category.name !==
                "string" ||
            !category.name.trim()
        ) {
            return {
                success: false,
                error: "Category name is invalid."
            };
        }


        stockCategoryName =
            category.name
                .trim()
                .toLowerCase();

    }


    // ========================================================
    // UPDATE PRODUCT
    // ========================================================

    let updatedProduct;


    try {

        updatedProduct =
            await Product.findByIdAndUpdate(
                productId,

                {
                    $set:
                        productUpdate
                },

                {
                    new: true,
                    runValidators: true
                }
            );

    } catch (error) {

        console.error(
            "PRODUCT UPDATE ERROR:",
            error
        );

        return {
            success: false,
            error:
                error.message ||
                "Failed to update product."
        };

    }


    if (!updatedProduct) {
        return {
            success: false,
            error: "Product not found."
        };
    }


    // ========================================================
    // UPDATE LINKED STOCK
    // ========================================================
    //
    // Product.stock identifies the corresponding Stock.
    //
    // Only shared editable fields are synchronized.
    //
    // FIFO fields are NEVER touched.
    // ========================================================

    if (
        product.stock &&
        mongoose.Types.ObjectId.isValid(
            product.stock
        )
    ) {

        const stockUpdate = {};


        // ----------------------------------------------------
        // NAME
        // ----------------------------------------------------

        if (
            Object.prototype.hasOwnProperty.call(
                productUpdate,
                "name"
            )
        ) {
            stockUpdate.name =
                productUpdate.name;
        }


        // ----------------------------------------------------
        // CATEGORY
        // ----------------------------------------------------

        if (
            stockCategoryName !== null
        ) {
            stockUpdate.category =
                stockCategoryName;
        }


        // ----------------------------------------------------
        // SUBCATEGORY
        // ----------------------------------------------------

        if (
            Object.prototype.hasOwnProperty.call(
                productUpdate,
                "subcategory"
            )
        ) {
            stockUpdate.subcategory =
                productUpdate.subcategory;
        }


        // ----------------------------------------------------
        // DELIVERY DAYS
        // ----------------------------------------------------

        if (
            Object.prototype.hasOwnProperty.call(
                productUpdate,
                "days"
            )
        ) {
            stockUpdate.days =
                productUpdate.days;
        }


        // ----------------------------------------------------
        // IMAGE
        // ----------------------------------------------------

        if (
            Object.prototype.hasOwnProperty.call(
                productUpdate,
                "image"
            )
        ) {
            stockUpdate.image =
                productUpdate.image;
        }


        // ----------------------------------------------------
        // DESCRIPTION
        // ----------------------------------------------------

        if (
            Object.prototype.hasOwnProperty.call(
                productUpdate,
                "description"
            )
        ) {
            stockUpdate.description =
                productUpdate.description;
        }


        // ----------------------------------------------------
        // DIRECTIONS OF USE
        // ----------------------------------------------------

        if (
            Object.prototype.hasOwnProperty.call(
                productUpdate,
                "directionsOfUse"
            )
        ) {
            stockUpdate.directionsOfUse =
                productUpdate.directionsOfUse;
        }


        // ----------------------------------------------------
        // ACTIVE STATUS
        // ----------------------------------------------------

        if (
            Object.prototype.hasOwnProperty.call(
                productUpdate,
                "isActive"
            )
        ) {
            stockUpdate.isActive =
                productUpdate.isActive;
        }


        // ----------------------------------------------------
        // UPDATE STOCK
        // ----------------------------------------------------

        if (
            Object.keys(stockUpdate).length > 0
        ) {

            const updatedStock =
                await Stock.findByIdAndUpdate(
                    product.stock,

                    {
                        $set:
                            stockUpdate
                    },

                    {
                        new: true,
                        runValidators: true
                    }
                );


            // ------------------------------------------------
            // STOCK RECORD MUST EXIST
            // ------------------------------------------------

            if (!updatedStock) {

                return {
                    success: false,
                    error:
                        "Product was updated, but the linked stock record was not found."
                };

            }

        }

    }


    // ========================================================
    // RETURN
    // ========================================================

    return {
        success: true,
        product:
            updatedProduct
    };
};


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    getProduct,

    updateProduct

};