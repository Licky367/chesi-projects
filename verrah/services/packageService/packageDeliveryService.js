// ==========================================================
// verrah/services/packageService/packageDeliveryService.js
//
// PACKAGE DELIVERY SERVICE
// ==========================================================
//
// DELIVERY FLOW
// ----------------------------------------------------------
//
// Package
//     ↓
// packageSubstation
//     ↓
// Substation.productInventory reduction
//     ↓
// Product FIFO reduction
//     ↓
// Product.units / unitBuyPrice synchronization
//     ↓
// productReductions ledger
//     ↓
// DeliveredPackage record
//
// IMPORTANT
// ----------------------------------------------------------
//
// Delivery DOES NOT return anything to Stock.
//
// Stock.purchaseBatches are only involved when stock is
// allocated into Product FIFO.
//
// Once units have been allocated to a Product and moved into
// substations, delivery removes those units from the Product
// FIFO and the physical substation inventory.
//
// ==========================================================

const mongoose = require("mongoose");

const Package =
    require("../../models/package");

const Product =
    require("../../models/products");

const User =
    require("../../models/user");

const DeliveredPackage =
    require("../../models/delivered");

const Substation =
    require("../../models/substations");

const {
    roleOf,
    staffIdOf
} = require("../../middleware/auth");

const {
    releaseProductFifo
} = require("../stockService/productFifo");

const {
    productFifoUnits,
    weightedProductBuyPrice,
    batchUnits
} = require("../stockService/helpers");


// ==========================================================
// HELPERS
// ==========================================================

function number(value) {
    const parsed =
        Number(value);

    return Number.isFinite(parsed)
        ? parsed
        : 0;
}


// ----------------------------------------------------------
// WHOLE NUMBER
// ----------------------------------------------------------

function wholeNumber(value, label) {

    const parsed =
        Number(value);

    if (
        !Number.isFinite(parsed) ||
        !Number.isInteger(parsed) ||
        parsed < 0
    ) {
        throw new Error(
            `${label} must be a valid whole number.`
        );
    }

    return parsed;
}


// ==========================================================
// DELIVERY
// ==========================================================

async function deliverPackage(req, id) {

    if (!mongoose.isValidObjectId(id)) {
        throw new Error("Invalid package.");
    }


    // ------------------------------------------------------
    // ACCESS
    // ------------------------------------------------------

    const role =
        roleOf(req);

    if (
        role !== "staff" &&
        role !== "admin"
    ) {
        throw new Error(
            "You are not authorized to deliver packages."
        );
    }


    // ------------------------------------------------------
    // ACTOR
    // ------------------------------------------------------

    const actorId =
        staffIdOf(req);

    const actorName =
        String(
            req.user?.name ||
            req.user?.fullName ||
            req.user?.email ||
            (role === "admin" ? "Admin" : "Staff")
        ).trim();


    // ------------------------------------------------------
    // START TRANSACTION
    // ------------------------------------------------------

    const session =
        await mongoose.startSession();

    let delivered;


    try {

        await session.withTransaction(
            async () => {

                // ==================================================
                // LOAD PACKAGE
                // ==================================================

                const pkg =
                    await Package
                        .findOne({
                            _id: id,
                            status: "confirmed"
                        })
                        .session(session);

                if (!pkg) {
                    throw new Error(
                        "Confirmed package not found."
                    );
                }


                // --------------------------------------------------
                // PREVENT DOUBLE DELIVERY
                // --------------------------------------------------

                if (
                    pkg.substationReductionRecorded === true
                ) {
                    throw new Error(
                        "This package has already been delivered."
                    );
                }


                // ==================================================
                // OPERATIONAL SUBSTATION
                // ==================================================
                //
                // packageSubstation is the authoritative
                // substation for delivery.
                //
                // NEVER use staff.assignedSubstation here.
                //
                // ==================================================

                const packageSubstation =
                    pkg.packageSubstation;

                if (!packageSubstation) {
                    throw new Error(
                        "This package does not have a package substation."
                    );
                }


                const substation =
                    await Substation
                        .findOne({
                            _id: packageSubstation,
                            isActive: true
                        })
                        .session(session);

                if (!substation) {
                    throw new Error(
                        "The package substation was not found or is inactive."
                    );
                }


                // ==================================================
                // PACKAGE ITEMS
                // ==================================================

                const items =
                    Array.isArray(pkg.items)
                        ? pkg.items
                        : [];

                if (!items.length) {
                    throw new Error(
                        "This package has no products to deliver."
                    );
                }


                // ==================================================
                // PROCESS EACH PRODUCT
                // ==================================================

                for (const item of items) {

                    const productId =
                        item.productId ||
                        item.product;

                    if (
                        !productId ||
                        !mongoose.isValidObjectId(productId)
                    ) {
                        throw new Error(
                            "A package item contains an invalid Product."
                        );
                    }


                    const qty =
                        wholeNumber(
                            item.qty,
                            `Quantity for ${item.name || "package product"}`
                        );

                    if (qty <= 0) {
                        throw new Error(
                            `Invalid delivery quantity for ${item.name || "package product"}.`
                        );
                    }


                    // ==================================================
                    // LOAD PRODUCT
                    // ==================================================

                    const product =
                        await Product
                            .findOne({
                                _id: productId,
                                isActive: true
                            })
                            .session(session);

                    if (!product) {
                        throw new Error(
                            `Product ${item.name || productId} was not found or is inactive.`
                        );
                    }


                    // ==================================================
                    // CURRENT PRODUCT FIFO
                    // ==================================================

                    const currentFifoUnits =
                        productFifoUnits(product);

                    const productUnits =
                        wholeNumber(
                            product.units || 0,
                            `Product units for ${product.name || item.name || productId}`
                        );


                    // --------------------------------------------------
                    // FIFO MUST HAVE ENOUGH UNITS
                    // --------------------------------------------------

                    if (currentFifoUnits < qty) {
                        throw new Error(
                            `Cannot deliver ${qty} units of ${product.name || item.name || "this product"} because Product FIFO contains only ${currentFifoUnits} units.`
                        );
                    }


                    // --------------------------------------------------
                    // PRODUCT.UNITS MUST NOT BE LESS THAN DELIVERY
                    // --------------------------------------------------

                    if (productUnits < qty) {
                        throw new Error(
                            `Cannot deliver ${qty} units of ${product.name || item.name || "this product"} because only ${productUnits} Product units are available.`
                        );
                    }


                    // ==================================================
                    // SUBSTATION PHYSICAL INVENTORY
                    // ==================================================

                    if (
                        !Array.isArray(
                            substation.productInventory
                        )
                    ) {
                        throw new Error(
                            `No product inventory exists at ${substation.name || "the package substation"}.`
                        );
                    }


                    const inventory =
                        substation.productInventory.find(
                            entry =>
                                String(entry.productId) ===
                                String(product._id)
                        );


                    if (!inventory) {
                        throw new Error(
                            `${product.name || item.name || "Product"} is not available at ${substation.name || "the package substation"}.`
                        );
                    }


                    const substationUnits =
                        wholeNumber(
                            inventory.units || 0,
                            `Substation units for ${product.name || item.name || productId}`
                        );


                    if (substationUnits < qty) {
                        throw new Error(
                            `Cannot deliver ${qty} units of ${product.name || item.name || "this product"} because the substation has only ${substationUnits} units.`
                        );
                    }


                    // ==================================================
                    // REDUCE PRODUCT FIFO
                    // ==================================================
                    //
                    // Existing FIFO implementation releases the
                    // newest Product FIFO layers first.
                    //
                    // NOTHING is returned to Stock.
                    //
                    // ==================================================

                    releaseProductFifo(
                        product,
                        qty
                    );


                    // ==================================================
                    // SYNCHRONIZE PRODUCT FIFO / UNITS
                    // ==================================================

                    const remainingProductFifoUnits =
                        productFifoUnits(product);


                    const expectedProductUnits =
                        productUnits - qty;


                    if (
                        remainingProductFifoUnits !==
                        expectedProductUnits
                    ) {
                        throw new Error(
                            `Product FIFO became inconsistent for ${product.name || item.name || productId}. Product should contain ${expectedProductUnits} units, but Product FIFO contains ${remainingProductFifoUnits}.`
                        );
                    }


                    product.units =
                        expectedProductUnits;


                    // --------------------------------------------------
                    // PRODUCT WEIGHTED BUY PRICE
                    // --------------------------------------------------

                    if (expectedProductUnits > 0) {

                        const unitBuyPrice =
                            weightedProductBuyPrice(
                                product
                            );

                        product.unitBuyPrice =
                            unitBuyPrice;

                        product.buyPrice =
                            unitBuyPrice;

                    } else {

                        product.unitBuyPrice =
                            0;

                        product.buyPrice =
                            0;
                    }


                    // ==================================================
                    // REDUCE SUBSTATION INVENTORY
                    // ==================================================

                    inventory.units =
                        substationUnits - qty;

                    inventory.updatedAt =
                        new Date();


                    // ==================================================
                    // PRODUCT REDUCTION LEDGER
                    // ==================================================
                    //
                    // This records the physical reduction from the
                    // substation.
                    //
                    // It does NOT move anything back to Stock.
                    //
                    // ==================================================

                    if (
                        !Array.isArray(
                            substation.productReductions
                        )
                    ) {
                        substation.productReductions = [];
                    }


                    const reductionDate =
                        new Date();


                    substation.productReductions.push({
                        productId:
                            product._id,

                        productName:
                            product.name ||
                            item.name ||
                            "",

                        units:
                            qty,

                        substationId:
                            substation._id,

                        packageId:
                            pkg._id,

                        reducedAt:
                            reductionDate,

                        recordedBy:
                            actorId ||
                            null,

                        recordedByName:
                            actorName
                    });


                    // ==================================================
                    // SAVE PRODUCT
                    // ==================================================

                    await product.save({
                        session
                    });
                }


                // ==================================================
                // SAVE SUBSTATION
                // ==================================================

                await substation.save({
                    session
                });


                // ==================================================
                // PACKAGE DELIVERY STATUS
                // ==================================================

                pkg.status =
                    "delivered";

                pkg.deliveredBy =
                    actorId ||
                    null;

                pkg.deliveredByName =
                    actorName;

                pkg.deliveredAt =
                    new Date();

                // --------------------------------------------------
                // Delivery is always tied to packageSubstation.
                // --------------------------------------------------

                pkg.deliveredSubstationId =
                    pkg.packageSubstation;

                pkg.substationReductionRecorded =
                    true;


                await pkg.save({
                    session
                });


                // ==================================================
                // CLIENT
                // ==================================================

                const clientId =
                    pkg.user ||
                    pkg.client ||
                    pkg.userId;

                let client =
                    null;

                if (
                    clientId &&
                    mongoose.isValidObjectId(clientId)
                ) {
                    client =
                        await User
                            .findById(clientId)
                            .session(session);
                }


                const clientName =
                    String(
                        client?.name ||
                        client?.fullName ||
                        pkg.clientName ||
                        pkg.customerName ||
                        "Client"
                    ).trim();


                // ==================================================
                // PAYMENT VALUES
                // ==================================================

                const amountPaid =
                    number(
                        pkg.totalPaid ??
                        pkg.paidAmount ??
                        0
                    );

                const totalAmount =
                    number(
                        pkg.totalAmount ||
                        0
                    );

                const arrearsAmount =
                    Math.max(
                        0,
                        totalAmount - amountPaid
                    );


                // ==================================================
                // DELIVERED PACKAGE RECORD
                // ==================================================

                const deliveredProducts =
                    items.map(item => ({
                        productId:
                            item.productId ||
                            item.product,

                        name:
                            item.name ||
                            "",

                        category:
                            item.category ||
                            "",

                        price:
                            number(item.price),

                        qty:
                            wholeNumber(
                                item.qty,
                                "Delivered product quantity"
                            ),

                        image:
                            item.image ||
                            "",

                        substationId:
                            pkg.packageSubstation
                    }));


                const deliveredRecord =
                    await DeliveredPackage
                        .findOneAndUpdate(
                            {
                                packageId:
                                    pkg._id
                            },
                            {
                                packageId:
                                    pkg._id,

                                products:
                                    deliveredProducts,

                                clientName:
                                    clientName,

                                staffName:
                                    actorName,

                                substationId:
                                    pkg.packageSubstation,

                                amountPaid:
                                    amountPaid,

                                arrearsAmount:
                                    arrearsAmount,

                                cleared:
                                    arrearsAmount <= 0,

                                clearedAt:
                                    arrearsAmount <= 0
                                        ? new Date()
                                        : null,

                                clearedByStaffId:
                                    arrearsAmount <= 0
                                        ? (
                                            actorId ||
                                            null
                                        )
                                        : null,

                                clearedByStaffName:
                                    arrearsAmount <= 0
                                        ? actorName
                                        : ""
                            },
                            {
                                upsert: true,
                                new: true,
                                session,
                                setDefaultsOnInsert: true
                            }
                        );


                delivered =
                    deliveredRecord;
            }
        );


        // ======================================================
        // RETURN UPDATED PACKAGE
        // ======================================================

        return Package
            .findById(id)
            .lean();

    } finally {

        await session.endSession();
    }
}


// ==========================================================
// EXPORT
// ==========================================================

module.exports = {
    deliverPackage
};