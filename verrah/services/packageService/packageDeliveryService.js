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
// PACKAGE HELPERS
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
    // ACCESS
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

    try {

        let resultPackage = null;


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
                        "Package was not found or is not confirmed."
                    );
                }


                // ==================================================
                // PREVENT DOUBLE DELIVERY
                // ==================================================

                if (
                    pkg.substationReductionRecorded
                ) {
                    throw new Error(
                        "This package has already been delivered."
                    );
                }


                // ==================================================
                // PACKAGE SUBSTATION
                // ==================================================
                //
                // This is the ONLY substation used for delivery.
                //
                // assignedSubstation is deliberately not used.
                //
                // ==================================================

                if (
                    !pkg.packageSubstation
                ) {
                    throw new Error(
                        "Package substation is missing."
                    );
                }


                const substation =
                    await Substation
                        .findOne({
                            _id:
                                pkg.packageSubstation,
                            isActive:
                                true
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
                        "This package contains no products."
                    );
                }


                // ==================================================
                // PROCESS ITEMS
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
                            "Package contains an invalid product."
                        );
                    }


                    const qty =
                        wholeNumber(
                            item.qty,
                            `Quantity for ${item.name || productId}`
                        );


                    if (qty <= 0) {
                        throw new Error(
                            `Invalid quantity for ${item.name || productId}.`
                        );
                    }


                    // ==================================================
                    // PRODUCT
                    // ==================================================

                    const product =
                        await Product
                            .findById(
                                productId
                            )
                            .session(session);

                    if (!product) {
                        throw new Error(
                            `Product ${item.name || productId} was not found.`
                        );
                    }


                    // ==================================================
                    // PRODUCT UNITS
                    // ==================================================

                    const currentProductUnits =
                        wholeNumber(
                            product.units || 0,
                            `Product units for ${product.name || item.name || productId}`
                        );


                    if (
                        currentProductUnits < qty
                    ) {
                        throw new Error(
                            `Insufficient Product units for ${product.name || item.name || productId}. Available: ${currentProductUnits}, required: ${qty}.`
                        );
                    }


                    // ==================================================
                    // PRODUCT FIFO
                    // ==================================================

                    const currentFifoUnits =
                        productFifoUnits(
                            product
                        );


                    if (
                        currentFifoUnits < qty
                    ) {
                        throw new Error(
                            `Insufficient Product FIFO units for ${product.name || item.name || productId}. FIFO available: ${currentFifoUnits}, required: ${qty}.`
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
                            `Product inventory is missing at ${substation.name || "the package substation"}.`
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
                            `${product.name || item.name || productId} is not available at ${substation.name || "the package substation"}.`
                        );
                    }


                    const currentSubstationUnits =
                        wholeNumber(
                            inventory.units || 0,
                            `Substation units for ${product.name || item.name || productId}`
                        );


                    if (
                        currentSubstationUnits < qty
                    ) {
                        throw new Error(
                            `Insufficient substation units for ${product.name || item.name || productId}. Available: ${currentSubstationUnits}, required: ${qty}.`
                        );
                    }


                    // ==================================================
                    // REMOVE FROM PRODUCT FIFO
                    // ==================================================
                    //
                    // Existing FIFO implementation:
                    //
                    // releaseProductFifo()
                    //
                    // releases the newest Product FIFO layers first.
                    //
                    // NOTHING is returned to Stock.
                    //
                    // ==================================================

                    releaseProductFifo(
                        product,
                        qty
                    );


                    // ==================================================
                    // CALCULATE REMAINING PRODUCT UNITS
                    // ==================================================

                    const newProductUnits =
                        currentProductUnits - qty;

                    const newFifoUnits =
                        productFifoUnits(
                            product
                        );


                    if (
                        newFifoUnits !==
                        newProductUnits
                    ) {
                        throw new Error(
                            `Product FIFO mismatch for ${product.name || item.name || productId}. Product units should be ${newProductUnits}, but FIFO contains ${newFifoUnits}.`
                        );
                    }


                    product.units =
                        newProductUnits;


                    // ==================================================
                    // PRODUCT WEIGHTED BUY PRICE
                    // ==================================================

                    if (
                        newProductUnits > 0
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
                        currentSubstationUnits -
                        qty;

                    inventory.updatedAt =
                        new Date();


                    // ==================================================
                    // PRODUCT REDUCTION
                    // ==================================================

                    if (
                        !Array.isArray(
                            substation.productReductions
                        )
                    ) {
                        substation.productReductions =
                            [];
                    }


                    const reduction =
                        substation.productReductions.find(
                            entry =>
                                String(entry.productId) ===
                                String(product._id)
                        );


                    if (reduction) {

                        reduction.unitsReduced =
                            Number(reduction.unitsReduced || 0) +
                            qty;

                        reduction.productName =
                            product.name ||
                            reduction.productName ||
                            item.name ||
                            "";

                        reduction.category =
                            String(
                                product.category ||
                                reduction.category ||
                                item.category ||
                                ""
                            );

                        reduction.lastReducedAt =
                            new Date();

                    } else {

                        substation.productReductions.push({
                            productId: product._id,
                            productName:
                                product.name ||
                                item.name ||
                                "",
                            category:
                                String(
                                    product.category ||
                                    item.category ||
                                    ""
                                ),
                            unitsReduced: qty,
                            lastReducedAt: new Date()
                        });
                    }


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
                // DELIVERED PACKAGE DATA
                // ==================================================

                const clientId =
                    pkg.user ||
                    pkg.client ||
                    pkg.userId;


                let client = null;


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


                const totalAmount =
                    number(
                        pkg.totalAmount
                    );


                const amountPaid =
                    number(
                        pkg.totalPaid ??
                        pkg.paidAmount
                    );


                const arrearsAmount =
                    Math.max(
                        0,
                        totalAmount -
                        amountPaid
                    );


                // ==================================================
                // DELIVERED PRODUCTS
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
                // DELIVERED PACKAGE RECORD
                // ==================================================

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

                            cleared: false,

                            clearedAt: null,

                            clearedByStaffId: null,

                            clearedByStaffName: ""
                        },
                        {
                            upsert:
                                true,

                            new:
                                true,

                            session,

                            setDefaultsOnInsert:
                                true
                        }
                    );


                // ==================================================
                // MARK PACKAGE DELIVERED
                // ==================================================
                //
                // Do this AFTER all inventory and DeliveredPackage
                // operations have succeeded.
                //
                // If anything above fails, the transaction rolls
                // back and the package remains confirmed.
                //
                // ==================================================

                pkg.status =
                    "delivered";

                pkg.deliveredByStaffId =
                    actorId ||
                    null;

                pkg.deliveredByStaffName =
                    actorName;

                pkg.deliveredAt =
                    new Date();

                pkg.deliveredSubstationId =
                    pkg.packageSubstation;

                pkg.substationReductionRecorded =
                    true;


                await pkg.save({
                    session
                });


                resultPackage =
                    pkg;
            }
        );


        // ======================================================
        // RETURN
        // ======================================================

        return Package
            .findById(
                resultPackage._id
            )
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