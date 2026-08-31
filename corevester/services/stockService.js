// ==========================================================
// corevester/services/stockService.js
// COREVESTER - STOCK SERVICE
// ==========================================================

const mongoose = require("mongoose");

const Stock = require("../models/stock");
const Product = require("../models/products");
const Substation = require("../models/substations");


// ==========================================================
// HELPERS
// ==========================================================

const text = (value) => {
    return String(value ?? "").trim();
};


const cleanCategory = (value) => {
    return text(value).toLowerCase();
};


const cleanSubcategory = (value) => {
    return text(value).toLowerCase();
};


// ==========================================================
// NUMBER VALIDATION
// ==========================================================

function number(value, label, required = false) {

    if (value === "" || value == null) {

        if (!required) {
            return 0;
        }

        throw new Error(
            `${label} is required.`
        );
    }


    const result = Number(value);


    if (
        !Number.isFinite(result) ||
        result < 0
    ) {

        throw new Error(
            `${label} must be zero or greater.`
        );
    }


    return result;
}


function wholeNumber(value, label, required = false) {

    const result =
        number(
            value,
            label,
            required
        );


    if (!Number.isInteger(result)) {

        throw new Error(
            `${label} must be a whole number.`
        );
    }


    return result;
}


// ==========================================================
// DISPLAY LABEL
// ==========================================================

function displayLabel(value) {

    return text(value)
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
}


// ==========================================================
// LIST STOCK
// ==========================================================
//
// /stock is grouped:
//
// Category
//     Subcategory
//         six cards horizontally
//         seventh card starts another row
//
// ==========================================================

exports.listStock = async () => {

    const stocks =
        await Stock.find({
            isActive: true
        })
            .sort({
                category: 1,
                subcategory: 1,
                name: 1,
                createdAt: 1
            })
            .lean();


    const categoryMap =
        new Map();


    for (const stock of stocks) {

        const category =
            stock.category ||
            "other";


        const subcategory =
            stock.subcategory ||
            "uncategorized";


        if (!categoryMap.has(category)) {

            categoryMap.set(
                category,
                {
                    category,
                    label:
                        displayLabel(category),
                    subcategories:
                        new Map()
                }
            );
        }


        const categoryGroup =
            categoryMap.get(category);


        if (
            !categoryGroup.subcategories.has(
                subcategory
            )
        ) {

            categoryGroup.subcategories.set(
                subcategory,
                {
                    subcategory,
                    label:
                        displayLabel(subcategory),
                    stocks: []
                }
            );
        }


        categoryGroup
            .subcategories
            .get(subcategory)
            .stocks
            .push(stock);
    }


    return Array
        .from(categoryMap.values())
        .map((categoryGroup) => {

            const subcategories =
                Array.from(
                    categoryGroup
                        .subcategories
                        .values()
                );


            return {

                category:
                    categoryGroup.category,

                label:
                    categoryGroup.label,

                subcategories:
                    subcategories.map(
                        (subcategoryGroup) => {

                            const rows = [];


                            for (
                                let i = 0;
                                i <
                                subcategoryGroup.stocks.length;
                                i += 6
                            ) {

                                rows.push({
                                    products:
                                        subcategoryGroup
                                            .stocks
                                            .slice(
                                                i,
                                                i + 6
                                            )
                                });
                            }


                            return {

                                subcategory:
                                    subcategoryGroup.subcategory,

                                label:
                                    subcategoryGroup.label,

                                rows
                            };
                        }
                    )
            };
        });
};


// ==========================================================
// GET ONE STOCK
// ==========================================================

exports.getStock = async (id) => {

    if (
        !mongoose.isValidObjectId(id)
    ) {

        return null;
    }


    return Stock.findOne({
        _id: id,
        isActive: true
    }).lean();
};


// ==========================================================
// GET STOCK CATALOGUE
// ==========================================================
//
// Used by stock creation/editing.
//
// ==========================================================

exports.getStockCategories = () => {

    return Stock.find({
        isActive: true
    })
        .select(
            "name category subcategory days image units buyPrice description"
        )
        .sort({
            category: 1,
            subcategory: 1,
            name: 1
        })
        .lean();
};


// ==========================================================
// GET ACTIVE SUBSTATIONS
// ==========================================================

exports.getSubstations = () => {

    return Substation.find({
        isActive: true
    })
        .select(
            "name location description productInventory"
        )
        .sort({
            name: 1
        })
        .lean();
};


// ==========================================================
// CREATE STOCK
// ==========================================================

exports.createStock = async (body) => {

    const name =
        text(body.name);


    const category =
        cleanCategory(
            body.category
        );


    const subcategory =
        cleanSubcategory(
            body.subcategory
        );


    const units =
        wholeNumber(
            body.units,
            "Warehouse units",
            true
        );


    const buyPrice =
        number(
            body.buyPrice,
            "Buy price"
        );


    const days =
        wholeNumber(
            body.days,
            "Delivery days",
            true
        );


    if (
        !name ||
        !category ||
        !subcategory
    ) {

        throw new Error(
            "Stock name, category and subcategory are required."
        );
    }


    const existing =
        await Stock.findOne({
            category,
            subcategory,
            isActive: true
        });


    if (existing) {

        throw new Error(
            `The subcategory "${subcategory}" already exists under "${category}". Select it from the existing subcategory list to update it.`
        );
    }


    return Stock.create({

        name,

        category,

        subcategory,

        days,

        image:
            text(body.image),

        units,

        buyPrice,

        description:
            text(body.description)

    });
};


// ==========================================================
// UPDATE STOCK ENTRY
// ==========================================================
//
// Additional units are added to existing warehouse stock.
//
// Product.units is NEVER changed here.
//
// Existing Products inherit updated metadata from Stock.
//
// ==========================================================

exports.updateStockEntry = async (
    stockId,
    body
) => {

    if (
        !mongoose.isValidObjectId(stockId)
    ) {

        throw new Error(
            "Invalid stock subcategory."
        );
    }


    const name =
        text(body.name);


    const category =
        cleanCategory(
            body.category
        );


    const subcategory =
        cleanSubcategory(
            body.subcategory
        );


    const additionalUnits =
        wholeNumber(
            body.additionalUnits,
            "Additional units"
        );


    const buyPrice =
        number(
            body.buyPrice,
            "Buy price"
        );


    const days =
        wholeNumber(
            body.days,
            "Delivery days",
            true
        );


    if (
        !name ||
        !category ||
        !subcategory
    ) {

        throw new Error(
            "Stock name, category and subcategory are required."
        );
    }


    const stock =
        await Stock.findOne({
            _id: stockId,
            isActive: true
        });


    if (!stock) {

        throw new Error(
            "Stock subcategory not found."
        );
    }


    const duplicate =
        await Stock.findOne({

            _id: {
                $ne: stock._id
            },

            category,

            subcategory,

            isActive: true

        });


    if (duplicate) {

        throw new Error(
            `The subcategory "${subcategory}" already belongs to another stock record under "${category}".`
        );
    }


    // ------------------------------------------------------
    // UPDATE STOCK
    // ------------------------------------------------------

    stock.name =
        name;

    stock.category =
        category;

    stock.subcategory =
        subcategory;

    stock.days =
        days;

    stock.buyPrice =
        buyPrice;

    stock.description =
        text(body.description);


    const image =
        text(body.image);


    if (image) {

        stock.image =
            image;
    }


    stock.units =
        Number(stock.units || 0) +
        additionalUnits;


    await stock.save();


    // ------------------------------------------------------
    // SYNCHRONIZE EXISTING PRODUCTS
    //
    // IMPORTANT:
    // Product.units is NOT touched.
    // ------------------------------------------------------

    await Product.updateMany(

        {
            stock: stock._id,
            isActive: true
        },

        {
            $set: {

                name:
                    stock.name,

                category:
                    stock.category,

                subcategory:
                    stock.subcategory,

                days:
                    Number(stock.days || 0),

                image:
                    stock.image || "",

                buyPrice:
                    Number(
                        stock.buyPrice || 0
                    ),

                description:
                    stock.description || ""
            }
        }
    );


    // ------------------------------------------------------
    // SYNCHRONIZE SUBSTATION PRODUCT LABELS
    // ------------------------------------------------------

    const productIds =
        await Product.find({
            stock: stock._id
        })
            .distinct("_id");


    if (productIds.length) {

        await Substation.updateMany(

            {
                "productInventory.productId":
                    {
                        $in: productIds
                    }
            },

            {
                $set: {

                    "productInventory.$[item].productName":
                        stock.name,

                    "productInventory.$[item].category":
                        stock.category,

                    "productInventory.$[item].subcategory":
                        stock.subcategory,

                    "productInventory.$[item].days":
                        Number(
                            stock.days || 0
                        ),

                    "productInventory.$[item].updatedAt":
                        new Date()
                }
            },

            {
                arrayFilters: [
                    {
                        "item.productId":
                            {
                                $in: productIds
                            }
                    }
                ]
            }
        );
    }


    return stock;
};


// ==========================================================
// NORMALIZE ALLOCATIONS
// ==========================================================
//
// This is the critical part.
//
// The view sends:
//
// allocations[SUBSTATION_ID] = quantity
//
// We DO NOT depend on:
//
// units
//
// because the hidden `units` field can be stale or zero.
//
// The service calculates the real total itself.
//
// ==========================================================

function normalizeAllocations(
    allocationInput
) {

    if (
        !allocationInput ||
        typeof allocationInput !== "object" ||
        Array.isArray(allocationInput)
    ) {

        return [];
    }


    const allocations = [];


    for (
        const [
            substationId,
            rawValue
        ]
        of Object.entries(
            allocationInput
        )
    ) {

        const cleanId =
            text(substationId);


        if (!cleanId) {
            continue;
        }


        const units =
            wholeNumber(
                rawValue,
                `Units for substation ${cleanId}`
            );


        /*
         * Zero is allowed as an individual value,
         * but zero allocations are not sent forward.
         */

        if (units <= 0) {
            continue;
        }


        allocations.push({

            substationId:
                cleanId,

            units

        });
    }


    return allocations;
}


// ==========================================================
// CREATE PRODUCT FROM STOCK
// ==========================================================
//
// IMPORTANT LOGIC:
//
// 1. Read quantities from allocations.
// 2. Calculate total ourselves.
// 3. Verify total <= warehouse stock.
// 4. Find/create ONE Product for the Stock record.
// 5. Increase Product.units by total.
// 6. Reduce Stock.units by total.
// 7. Add each allocation to its Substation.
//
// The hidden `units` field from the browser is deliberately
// NOT used.
//
// ==========================================================

exports.createProductFromStock = async (
    stockId,
    body
) => {

    // ------------------------------------------------------
    // VALIDATE STOCK ID
    // ------------------------------------------------------

    if (
        !mongoose.isValidObjectId(stockId)
    ) {

        throw new Error(
            "Invalid stock."
        );
    }


    // ------------------------------------------------------
    // SELLING PRICE
    // ------------------------------------------------------

    const unitSellPrice =
        number(
            body.unitSellPrice,
            "Selling price",
            true
        );


    // ------------------------------------------------------
    // READ SUBSTATION ALLOCATIONS
    //
    // THIS IS NOW THE ONLY SOURCE OF PRODUCT UNITS.
    // ------------------------------------------------------

    const allocations =
        normalizeAllocations(
            body.allocations
        );


    if (!allocations.length) {

        throw new Error(
            "Allocate at least one unit to at least one substation."
        );
    }


    // ------------------------------------------------------
    // CALCULATE TOTAL
    // ------------------------------------------------------
    //
    // Example:
    //
    // Kangemi = 60
    // Kasarani = 60
    // Kitengela = 60
    //
    // total = 180
    //
    // This calculation happens on the server.
    // ------------------------------------------------------

    const allocationTotal =
        allocations.reduce(
            (
                total,
                allocation
            ) => {

                return total +
                    allocation.units;

            },
            0
        );


    if (
        allocationTotal <= 0
    ) {

        throw new Error(
            "Total product units must be greater than zero."
        );
    }


    // ------------------------------------------------------
    // VALIDATE SUBSTATION IDS
    // ------------------------------------------------------

    const substationIds =
        allocations.map(
            (allocation) =>
                allocation.substationId
        );


    if (
        substationIds.some(
            (id) =>
                !mongoose.isValidObjectId(id)
        )
    ) {

        throw new Error(
            "One or more selected substations are invalid."
        );
    }


    // ------------------------------------------------------
    // PREVENT DUPLICATE SUBSTATION ENTRIES
    // ------------------------------------------------------

    if (
        new Set(
            substationIds
        ).size !==
        substationIds.length
    ) {

        throw new Error(
            "Each substation can appear only once in the allocation."
        );
    }


    // ------------------------------------------------------
    // DATABASE TRANSACTION
    // ------------------------------------------------------

    const session =
        await mongoose.startSession();


    try {

        let product = null;


        await session.withTransaction(
            async () => {

                // ==========================================
                // LOAD STOCK
                // ==========================================

                const stock =
                    await Stock.findOne({

                        _id: stockId,

                        isActive: true

                    })
                        .session(session);


                if (!stock) {

                    throw new Error(
                        "Stock subcategory not found."
                    );
                }


                // ==========================================
                // CHECK WAREHOUSE BALANCE
                // ==========================================

                const warehouseUnits =
                    Number(
                        stock.units || 0
                    );


                if (
                    allocationTotal >
                    warehouseUnits
                ) {

                    throw new Error(
                        `Only ${warehouseUnits} units are available in this stock subcategory.`
                    );
                }


                // ==========================================
                // LOAD SUBSTATIONS
                // ==========================================

                const substations =
                    await Substation.find({

                        _id: {
                            $in:
                                substationIds
                        },

                        isActive: true

                    })
                        .session(session);


                const substationMap =
                    new Map(

                        substations.map(
                            (substation) => [

                                String(
                                    substation._id
                                ),

                                substation
                            ]
                        )
                    );


                // ==========================================
                // VERIFY EVERY SUBSTATION
                // ==========================================

                for (
                    const allocation
                    of allocations
                ) {

                    if (
                        !substationMap.has(
                            allocation.substationId
                        )
                    ) {

                        throw new Error(
                            "One or more selected substations were not found or are inactive."
                        );
                    }
                }


                // ==========================================
                // FIND EXISTING PRODUCT
                // ==========================================
                //
                // One marketplace Product represents the
                // Stock/subcategory.
                //
                // Reallocation increases its units.
                // ==========================================

                let existingProduct =
                    await Product.findOne({

                        stock:
                            stock._id,

                        isActive:
                            true

                    })
                        .session(session);


                // ==========================================
                // EXISTING PRODUCT
                // ==========================================

                if (existingProduct) {

                    existingProduct.units =
                        Number(
                            existingProduct.units || 0
                        ) +
                        allocationTotal;


                    existingProduct.unitSellPrice =
                        unitSellPrice;


                    // --------------------------------------
                    // INHERIT STOCK METADATA
                    // --------------------------------------

                    existingProduct.name =
                        stock.name;

                    existingProduct.category =
                        stock.category;

                    existingProduct.subcategory =
                        stock.subcategory;

                    existingProduct.days =
                        Number(
                            stock.days || 0
                        );

                    existingProduct.image =
                        stock.image || "";

                    existingProduct.buyPrice =
                        Number(
                            stock.buyPrice || 0
                        );

                    existingProduct.description =
                        stock.description || "";


                    await existingProduct.save({
                        session
                    });


                    product =
                        existingProduct;
                }


                // ==========================================
                // NEW PRODUCT
                // ==========================================

                else {

                    const created =
                        await Product.create(
                            [
                                {

                                    stock:
                                        stock._id,

                                    name:
                                        stock.name,

                                    category:
                                        stock.category,

                                    subcategory:
                                        stock.subcategory,

                                    days:
                                        Number(
                                            stock.days || 0
                                        ),

                                    image:
                                        stock.image || "",

                                    units:
                                        allocationTotal,

                                    buyPrice:
                                        Number(
                                            stock.buyPrice || 0
                                        ),

                                    unitSellPrice:
                                        unitSellPrice,

                                    description:
                                        stock.description || ""

                                }
                            ],
                            {
                                session
                            }
                        );


                    product =
                        created[0];
                }


                // ==========================================
                // REDUCE STOCK
                // ==========================================
                //
                // THIS IS THE ONLY WAREHOUSE DEDUCTION.
                //
                // Example:
                //
                // Stock = 390
                // Allocated = 180
                // New Stock = 210
                //
                // ==========================================

                stock.units =
                    warehouseUnits -
                    allocationTotal;


                await stock.save({
                    session
                });


                // ==========================================
                // UPDATE EACH SUBSTATION
                // ==========================================
                //
                // Each substation receives its own balance.
                //
                // Example:
                //
                // Kangemi  = 60
                // Kasarani = 60
                // Kitengela = 60
                //
                // Product.units = 180
                //
                // ==========================================

                for (
                    const allocation
                    of allocations
                ) {

                    const substation =
                        substationMap.get(
                            allocation.substationId
                        );


                    if (!substation) {

                        throw new Error(
                            "Substation allocation target not found."
                        );
                    }


                    // --------------------------------------
                    // FIND EXISTING PRODUCT INVENTORY
                    // --------------------------------------

                    const existingInventory =
                        Array.isArray(
                            substation.productInventory
                        )
                            ? substation
                                .productInventory
                                .find(
                                    (entry) =>
                                        String(
                                            entry.productId
                                        ) ===
                                        String(
                                            product._id
                                        )
                                )
                            : null;


                    // --------------------------------------
                    // UPDATE EXISTING BALANCE
                    // --------------------------------------

                    if (
                        existingInventory
                    ) {

                        existingInventory.units =
                            Number(
                                existingInventory.units || 0
                            ) +
                            allocation.units;


                        existingInventory.productName =
                            product.name;


                        existingInventory.category =
                            product.category;


                        existingInventory.subcategory =
                            product.subcategory;


                        existingInventory.days =
                            Number(
                                product.days || 0
                            );


                        existingInventory.updatedAt =
                            new Date();
                    }


                    // --------------------------------------
                    // CREATE NEW BALANCE
                    // --------------------------------------

                    else {

                        if (
                            !Array.isArray(
                                substation.productInventory
                            )
                        ) {

                            substation.productInventory =
                                [];
                        }


                        substation.productInventory.push({

                            productId:
                                product._id,

                            productName:
                                product.name,

                            category:
                                product.category,

                            subcategory:
                                product.subcategory,

                            days:
                                Number(
                                    product.days || 0
                                ),

                            units:
                                allocation.units,

                            updatedAt:
                                new Date()
                        });
                    }


                    await substation.save({
                        session
                    });
                }
            }
        );


        // --------------------------------------------------
        // RETURN UPDATED PRODUCT
        // --------------------------------------------------

        return product;

    }


    finally {

        await session.endSession();
    }
};


// ==========================================================
// EXPORTS
// ==========================================================
//
// All service functions are exported above.
//
// ==========================================================