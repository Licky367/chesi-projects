// ==========================================================
// verrah/models/substations.js
//
// SUBSTATION MODEL
//
// INVENTORY RULE
// ----------------------------------------------------------
// When a product reduction is applied:
//
// 1. Substation.productInventory.units is reduced.
// 2. Product.units is reduced by the SAME amount.
// 3. productReductions stores the reduction history.
// 4. Only the NEW reduction amount is deducted.
// 5. A reduction cannot make either inventory negative.
//
// IMPORTANT:
// ----------------------------------------------------------
// Use:
//     Substation.applyProductReduction(...)
//
// when recording a reduction.
//
// Do NOT manually decrement Product.units separately.
// ==========================================================

const mongoose = require("mongoose");


// ==========================================================
// PRODUCT INVENTORY SCHEMA
// ==========================================================

const productInventorySchema =
    new mongoose.Schema(
        {
            productId: {
                type:
                    mongoose.Schema.Types.ObjectId,

                ref: "Product",

                required: true
            },

            productName: {
                type: String,

                required: true,

                trim: true
            },

            category: {
                type: String,

                default: "",

                trim: true
            },

            subcategory: {
                type: String,

                default: "",

                trim: true
            },

            days: {
                type: Number,

                min: 0,

                default: 0
            },

            units: {
                type: Number,

                required: true,

                min: 0,

                default: 0
            },

            updatedAt: {
                type: Date,

                default: Date.now
            }
        },
        {
            _id: false
        }
    );


// ==========================================================
// PRODUCT REDUCTION SCHEMA
// ==========================================================
//
// `unitsReduced` represents the amount reduced by THIS
// reduction operation.
//
// Example:
//
// Existing reduction:
//     unitsReduced: 5
//
// New reduction:
//     unitsReduced: 3
//
// Product inventory is reduced by 3, NOT by 8 again.
//
// ==========================================================

const substationProductReductionSchema =
    new mongoose.Schema(
        {
            productId: {
                type:
                    mongoose.Schema.Types.ObjectId,

                ref: "Product",

                required: true
            },

            productName: {
                type: String,

                required: true,

                trim: true
            },

            category: {
                type: String,

                default: "",

                trim: true
            },

            unitsReduced: {
                type: Number,

                required: true,

                min: 0,

                default: 0
            },

            lastReducedAt: {
                type: Date,

                default: null
            }
        },
        {
            _id: false
        }
    );


// ==========================================================
// GPS SCHEMA
// ==========================================================

const gpsSchema =
    new mongoose.Schema(
        {
            latitude: {
                type: Number,

                default: null,

                min: -90,

                max: 90
            },

            longitude: {
                type: Number,

                default: null,

                min: -180,

                max: 180
            }
        },
        {
            _id: false
        }
    );


// ==========================================================
// SUBSTATION SCHEMA
// ==========================================================

const substationSchema =
    new mongoose.Schema(
        {
            // ------------------------------------------------
            // BASIC INFORMATION
            // ------------------------------------------------

            name: {
                type: String,

                required: true,

                trim: true,

                unique: true,

                index: true
            },

            location: {
                type: String,

                trim: true,

                default: ""
            },

            phoneNumber: {
                type: Number,

                default: null
            },


            // ------------------------------------------------
            // SUBSTATION MEDIA
            // ------------------------------------------------

            substationIcon: {
                type: String,

                trim: true,

                default: ""
            },

            images: {
                type: [String],

                default: []
            },


            // ------------------------------------------------
            // DESCRIPTION
            // ------------------------------------------------

            description: {
                type: String,

                default: ""
            },


            // ------------------------------------------------
            // DIRECTIONS
            // ------------------------------------------------

            directions: {
                type: String,

                trim: true,

                default: ""
            },


            // ------------------------------------------------
            // GPS
            // ------------------------------------------------

            gps: {
                type: gpsSchema,

                default: () => ({
                    latitude: null,

                    longitude: null
                })
            },


            // ------------------------------------------------
            // STATUS
            // ------------------------------------------------

            isActive: {
                type: Boolean,

                default: true
            },


            // ------------------------------------------------
            // PRODUCT INVENTORY
            // ------------------------------------------------

            productInventory: {
                type:
                    [productInventorySchema],

                default: []
            },


            // ------------------------------------------------
            // PRODUCT REDUCTIONS
            // ------------------------------------------------

            productReductions: {
                type:
                    [substationProductReductionSchema],

                default: []
            }
        },
        {
            timestamps: true
        }
    );


// ==========================================================
// APPLY PRODUCT REDUCTION
// ==========================================================
//
// This is the ONLY method that should be used when a
// substation consumes/reduces stock.
//
// It updates:
//
//     Substation.productInventory.units
//
// AND:
//
//     Product.units
//
// by exactly the same reduction.
//
// ==========================================================

substationSchema.statics.applyProductReduction =
    async function ({
        substationId,
        productId,
        unitsReduced
    }) {

        // ----------------------------------------------------
        // VALIDATE REDUCTION
        // ----------------------------------------------------

        if (
            !mongoose.Types.ObjectId.isValid(
                substationId
            )
        ) {
            throw new Error(
                "Invalid substation ID."
            );
        }

        if (
            !mongoose.Types.ObjectId.isValid(
                productId
            )
        ) {
            throw new Error(
                "Invalid product ID."
            );
        }

        const reduction =
            Number(unitsReduced);


        if (
            !Number.isFinite(reduction) ||
            reduction <= 0
        ) {
            throw new Error(
                "unitsReduced must be greater than zero."
            );
        }


        // ----------------------------------------------------
        // START TRANSACTION
        // ----------------------------------------------------

        const session =
            await mongoose.startSession();


        try {

            let result;


            await session.withTransaction(
                async () => {

                    // ----------------------------------------
                    // LOAD SUBSTATION
                    // ----------------------------------------

                    const substation =
                        await this.findById(
                            substationId
                        ).session(session);


                    if (!substation) {

                        throw new Error(
                            "Substation not found."
                        );
                    }


                    // ----------------------------------------
                    // FIND PRODUCT IN SUBSTATION INVENTORY
                    // ----------------------------------------

                    const inventoryItem =
                        substation.productInventory
                            .find(
                                item =>
                                    item.productId
                                        .toString() ===
                                    productId.toString()
                            );


                    if (!inventoryItem) {

                        throw new Error(
                            "Product is not available in this substation."
                        );
                    }


                    // ----------------------------------------
                    // CHECK SUBSTATION STOCK
                    // ----------------------------------------

                    if (
                        inventoryItem.units <
                        reduction
                    ) {

                        throw new Error(
                            `Insufficient substation stock for ${inventoryItem.productName}.`
                        );
                    }


                    // ----------------------------------------
                    // LOAD PRODUCT
                    // ----------------------------------------
                    //
                    // Use mongoose.model() instead of requiring
                    // products.js directly. This avoids model
                    // circular-dependency problems.
                    //
                    // ----------------------------------------

                    const Product =
                        mongoose.model(
                            "Product"
                        );


                    const product =
                        await Product.findById(
                            productId
                        ).session(session);


                    if (!product) {

                        throw new Error(
                            "Product not found."
                        );
                    }


                    // ----------------------------------------
                    // CHECK MAIN PRODUCT STOCK
                    // ----------------------------------------

                    const currentProductUnits =
                        Number(product.units || 0);


                    if (
                        currentProductUnits <
                        reduction
                    ) {

                        throw new Error(
                            `Insufficient product stock for ${product.productName || inventoryItem.productName}.`
                        );
                    }


                    // ----------------------------------------
                    // REDUCE SUBSTATION INVENTORY
                    // ----------------------------------------

                    inventoryItem.units =
                        currentProductUnits >= 0
                            ? inventoryItem.units - reduction
                            : inventoryItem.units;

                    inventoryItem.updatedAt =
                        new Date();


                    // ----------------------------------------
                    // REDUCE MAIN PRODUCT INVENTORY
                    // ----------------------------------------

                    product.units =
                        currentProductUnits -
                        reduction;


                    // ----------------------------------------
                    // FIND EXISTING REDUCTION RECORD
                    // ----------------------------------------

                    const existingReduction =
                        substation.productReductions
                            .find(
                                item =>
                                    item.productId
                                        .toString() ===
                                    productId.toString()
                            );


                    if (existingReduction) {

                        // ------------------------------------
                        // ADD ONLY THE NEW REDUCTION
                        // ------------------------------------
                        //
                        // Example:
                        //
                        // Existing:
                        //     unitsReduced = 10
                        //
                        // New:
                        //     reduction = 3
                        //
                        // Result:
                        //     unitsReduced = 13
                        //
                        // Inventory is reduced by ONLY 3.
                        // ------------------------------------

                        existingReduction.unitsReduced +=
                            reduction;

                        existingReduction.lastReducedAt =
                            new Date();

                    } else {

                        // ------------------------------------
                        // CREATE FIRST REDUCTION RECORD
                        // ------------------------------------

                        substation.productReductions.push(
                            {
                                productId:
                                    product._id,

                                productName:
                                    product.productName ||
                                    inventoryItem.productName,

                                category:
                                    product.category ||
                                    inventoryItem.category ||
                                    "",

                                unitsReduced:
                                    reduction,

                                lastReducedAt:
                                    new Date()
                            }
                        );
                    }


                    // ----------------------------------------
                    // SAVE BOTH DOCUMENTS
                    // ----------------------------------------

                    await substation.save({
                        session
                    });

                    await product.save({
                        session
                    });


                    result = {
                        substation,
                        product
                    };
                }
            );


            return result;

        } finally {

            await session.endSession();
        }
    };


// ==========================================================
// INCREASE EXISTING PRODUCT REDUCTION
// ==========================================================
//
// Convenience method.
//
// If an existing reduction changes from:
//
//     10 -> 14
//
// only the increase:
//
//     14 - 10 = 4
//
// is deducted from:
//
//     Substation.productInventory.units
//     Product.units
//
// This prevents the historical 10 units from being deducted
// a second time.
//
// ==========================================================

substationSchema.statics.increaseProductReduction =
    async function ({
        substationId,
        productId,
        newUnitsReduced
    }) {

        if (
            !mongoose.Types.ObjectId.isValid(
                substationId
            )
        ) {
            throw new Error(
                "Invalid substation ID."
            );
        }

        if (
            !mongoose.Types.ObjectId.isValid(
                productId
            )
        ) {
            throw new Error(
                "Invalid product ID."
            );
        }


        const newTotal =
            Number(newUnitsReduced);


        if (
            !Number.isFinite(newTotal) ||
            newTotal < 0
        ) {
            throw new Error(
                "newUnitsReduced must be zero or greater."
            );
        }


        // ----------------------------------------------------
        // FIND CURRENT REDUCTION
        // ----------------------------------------------------

        const substation =
            await this.findById(
                substationId
            );


        if (!substation) {

            throw new Error(
                "Substation not found."
            );
        }


        const existingReduction =
            substation.productReductions
                .find(
                    item =>
                        item.productId
                            .toString() ===
                        productId.toString()
                );


        const previousTotal =
            existingReduction
                ? Number(
                    existingReduction.unitsReduced || 0
                )
                : 0;


        // ----------------------------------------------------
        // CALCULATE ONLY THE INCREASE
        // ----------------------------------------------------

        const increase =
            newTotal -
            previousTotal;


        // ----------------------------------------------------
        // NOTHING TO REDUCE
        // ----------------------------------------------------

        if (increase === 0) {

            return {
                changed: false,

                increase: 0,

                substation
            };
        }


        // ----------------------------------------------------
        // REDUCTION DECREASED
        // ----------------------------------------------------
        //
        // If:
        //
        // old = 10
        // new = 7
        //
        // We do NOT automatically restore 3 units here.
        //
        // A reduction is an inventory-consumption event.
        // Reversals should be handled explicitly so stock
        // cannot accidentally be increased.
        //
        // ----------------------------------------------------

        if (increase < 0) {

            throw new Error(
                "Product reduction cannot be decreased automatically. Use a stock-restoration operation instead."
            );
        }


        // ----------------------------------------------------
        // APPLY ONLY THE INCREASE
        // ----------------------------------------------------

        return this.applyProductReduction({
            substationId,

            productId,

            unitsReduced: increase
        });
    };


// ==========================================================
// EXPORT MODEL
// ==========================================================

module.exports =
    mongoose.model(
        "Substation",
        substationSchema
    );