// ==========================================================
// verrah/services/packageService/packageDeliveryService.js
//
// PACKAGE DELIVERY SERVICE
// ==========================================================

const mongoose =
    require("mongoose");

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


// ==========================================================
// AUTH HELPERS
// ==========================================================
//
// Keep using the application's existing authentication helpers.
// No new middleware is introduced here.
// ==========================================================

const {
    roleOf,
    staffIdOf
} = require("./packageHelpers");


// ==========================================================
// PRODUCT FIFO
// ==========================================================

const {
    releaseProductFifo
} = require("../stockService/productFifo");

const {
    productFifoUnits,
    weightedProductBuyPrice
} = require("../stockService/helpers");


// ==========================================================
// HELPERS
// ==========================================================

function number(value) {

    const result =
        Number(value);

    return Number.isFinite(result)
        ? result
        : 0;
}


function wholeNumber(
    value,
    label
) {

    const result =
        Number(value);

    if (
        !Number.isFinite(result) ||
        !Number.isInteger(result) ||
        result < 0
    ) {
        throw new Error(
            `${label} must be a valid whole number.`
        );
    }

    return result;
}


// ==========================================================
// DELIVER PACKAGE
// ==========================================================

async function deliverPackage(
    req,
    id
) {

    if (
        !mongoose.isValidObjectId(id)
    ) {
        throw new Error(
            "Invalid package."
        );
    }


    // ======================================================
    // AUTHORIZATION
    // ======================================================

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


    const actorId =
        staffIdOf(req);

    const actorName =
        String(
            req.user?.name ||
            req.user?.fullName ||
            req.user?.email ||
            (
                role === "admin"
                    ? "Admin"
                    : "Staff"
            )
        ).trim();


    // ======================================================
    // TRANSACTION
    // ======================================================

    const session =
        await mongoose.startSession();

    let delivered;


    try {

        await session.withTransaction(
            async () => {

                // ==================================================
                // PACKAGE
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


                // ==================================================
                // PREVENT DUPLICATE REDUCTION
                // ==================================================

                if (
                    pkg.substationReductionRecorded === true
                ) {
                    throw new Error(
                        "This package has already been delivered."
                    );
                }


                // ==================================================
                // PACKAGE SUBSTATION
                // ==================================================
                //
                // packageSubstation is the ONLY substation used
                // for package delivery.
                //
                // Do not use staff.assignedSubstation.
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
                // ITEMS
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
                // DELIVER EACH PRODUCT
                // ==================================================

                for (
                    const item of items
                ) {

                    const productId =
                        item.productId ||
                        item.product;


                    if (
                        !productId ||
                        !mongoose.isValidObjectId(
                            productId
                        )
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
                    // PRODUCT
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
                    // PRODUCT FIFO UNITS
                    // ==================================================

                    const fifoUnitsBefore =
                        productFifoUnits(
                            product
                        );


                    if (
                        fifoUnitsBefore < qty
                    ) {
                        throw new Error(
                            `Cannot deliver ${qty} units of ${product.name || item.name || "this product"} because Product FIFO contains only ${fifoUnitsBefore} units.`
                        );
                    }


                    // ==================================================
                    // PRODUCT UNITS
                    // ==================================================

                    const productUnits =
                        wholeNumber(
                            product.units || 0,
                            `Product units for ${product.name || item.name || productId}`
                        );


                    if (
                        productUnits < qty
                    ) {
                        throw new Error(
                            `Cannot deliver ${qty} units of ${product.name || item.name || "this product"} because only ${productUnits} Product units are available.`
                        );
                    }


                    // ==================================================
                    // SUBSTATION INVENTORY
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
                                String(
                                    entry.productId
                                ) ===
                                String(
                                    product._id
                                )
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


                    if (
                        substationUnits < qty
                    ) {
                        throw new Error(
                            `Cannot deliver ${qty} units of ${product.name || item.name || "this product"} because the substation has only ${substationUnits} units.`
                        );
                    }


                    // ==================================================
                    // REDUCE PRODUCT FIFO
                    // ==================================================
                    //
                    // IMPORTANT:
                    //
                    // This is NOT a return to Stock.
                    //
                    // The Product FIFO represents units that were
                    // already allocated out of warehouse Stock.
                    //
                    // Delivery therefore removes the delivered
                    // quantity from Product FIFO only.
                    //
                    // ==================================================

                    releaseProductFifo(
                        product,
                        qty
                    );


                    // ==================================================
                    // SYNCHRONIZE PRODUCT UNITS
                    // ==================================================

                    const remainingFifoUnits =
                        productFifoUnits(
                            product
                        );

                    const expectedUnits =
                        productUnits - qty;


                    if (
                        remainingFifoUnits !==
                        expectedUnits
                    ) {
                        throw new Error(
                            `Product FIFO became inconsistent for ${product.name || item.name || productId}. Product should contain ${expectedUnits} units, but Product FIFO contains ${remainingFifoUnits}.`
                        );
                    }


                    product.units =
                        expectedUnits;


                    // ==================================================
                    // SYNCHRONIZE PRODUCT BUY PRICE
                    // ==================================================

                    if (
                        expectedUnits > 0
                    ) {

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
                    // PRODUCT REDUCTION
                    // ==================================================
                    //
                    // This records the physical reduction from the
                    // substation.
                    //
                    // It does NOT return anything to Stock.
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


                    substation.productReductions.push({

                        productId:
                            product._id,

                        productName:
                            product.name ||
                            item.name ||
                            "",

                        units:
                            qty,

                        packageId:
                            pkg._id,

                        reducedAt:
                            new Date(),

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
                // MARK PACKAGE DELIVERED
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
                // ALWAYS packageSubstation
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
                    mongoose.isValidObjectId(
                        clientId
                    )
                ) {

                    client =
                        await User
                            .findById(
                                clientId
                            )
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
                // PAYMENT
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
                        totalAmount -
                        amountPaid
                    );


                // ==================================================
                // DELIVERED PRODUCTS SNAPSHOT
                // ==================================================

                const deliveredProducts =
                    items.map(
                        item => ({
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
                                number(
                                    item.price
                                ),

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
                        })
                    );


                // ==================================================
                // DELIVERED PACKAGE
                // ==================================================

                delivered =
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
                                setDefaultsOnInsert:
                                    true
                            }
                        );
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