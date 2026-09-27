// ==========================================================
// FILE:
// services/packageService/packageDeliveryService.js
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

const {
    roleOf,
    staffIdOf
} = require("./packageHelpers");

const {
    releaseProductFifo
} = require("../stockService/productFifo");

const {
    productFifoUnits,
    weightedProductBuyPrice
} = require("../stockService/helpers");


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


    const role =
        roleOf(req);

    if (
        role !== "staff" &&
        role !== "admin"
    ) {
        throw new Error(
            "Staff or admin access required."
        );
    }


    const actorId =
        staffIdOf(req);

    const actorName =
        String(
            req.user?.name ||
            req.user?.email ||
            (
                role === "admin"
                    ? "Admin"
                    : "Staff"
            )
        ).trim();


    const session =
        await mongoose.startSession();


    try {

        let resultPackage;


        await session.withTransaction(
            async () => {

                // ==================================================
                // CONFIRMED PACKAGE
                // ==================================================

                const pkg =
                    await Package.findOne({
                        _id:
                            id,

                        status:
                            "confirmed"
                    })
                        .session(
                            session
                        );


                if (!pkg) {

                    throw new Error(
                        "Package was not found or is not confirmed."
                    );
                }


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

                if (
                    !pkg.packageSubstation
                ) {

                    throw new Error(
                        "Package substation is missing."
                    );
                }


                const substation =
                    await Substation.findOne({

                        _id:
                            pkg.packageSubstation,

                        isActive:
                            true

                    })
                        .session(
                            session
                        );


                if (!substation) {

                    throw new Error(
                        "The package substation was not found or is inactive."
                    );
                }


                const items =
                    Array.isArray(
                        pkg.items
                    )
                        ? pkg.items
                        : [];


                if (!items.length) {

                    throw new Error(
                        "This package contains no products."
                    );
                }


                // ==================================================
                // PROCESS PRODUCTS
                // ==================================================

                for (
                    const item
                    of items
                ) {

                    const productId =
                        item.productId;


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
                        await Product.findById(
                            productId
                        )
                            .session(
                                session
                            );


                    if (!product) {

                        throw new Error(
                            `Product ${item.name || productId} was not found.`
                        );
                    }


                    const productUnits =
                        wholeNumber(
                            product.units || 0,
                            `Product units for ${product.name || item.name || productId}`
                        );


                    if (
                        productUnits < qty
                    ) {

                        throw new Error(
                            `Insufficient Product units for ${product.name || item.name || productId}. Available: ${productUnits}, required: ${qty}.`
                        );
                    }


                    // ==================================================
                    // PRODUCT FIFO
                    // ==================================================

                    const fifoUnits =
                        productFifoUnits(
                            product
                        );


                    if (
                        fifoUnits < qty
                    ) {

                        throw new Error(
                            `Insufficient Product FIFO units for ${product.name || item.name || productId}. Available: ${fifoUnits}, required: ${qty}.`
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


                    const substationUnits =
                        wholeNumber(
                            inventory.units || 0,
                            `Substation units for ${product.name || item.name || productId}`
                        );


                    if (
                        substationUnits < qty
                    ) {

                        throw new Error(
                            `Insufficient substation units for ${product.name || item.name || productId}. Available: ${substationUnits}, required: ${qty}.`
                        );
                    }


                    // ==================================================
                    // REMOVE FROM PRODUCT FIFO
                    // ==================================================
                    //
                    // IMPORTANT:
                    //
                    // Nothing goes back to Stock.
                    //
                    // These units were already allocated out of Stock.
                    //
                    // ==================================================

                    releaseProductFifo(
                        product,
                        qty
                    );


                    // ==================================================
                    // PRODUCT UNITS
                    // ==================================================

                    const newProductUnits =
                        productUnits -
                        qty;


                    const newFifoUnits =
                        productFifoUnits(
                            product
                        );


                    if (
                        newFifoUnits !==
                        newProductUnits
                    ) {

                        throw new Error(
                            `Product FIFO mismatch for ${product.name || item.name || productId}. Expected ${newProductUnits}, found ${newFifoUnits}.`
                        );
                    }


                    product.units =
                        newProductUnits;


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
                    // SUBSTATION INVENTORY REDUCTION
                    // ==================================================

                    inventory.units =
                        substationUnits -
                        qty;

                    inventory.updatedAt =
                        new Date();


                    // ==================================================
                    // PRODUCT REDUCTION LEDGER
                    // ==================================================
                    //
                    // Actual schema:
                    //
                    // productId
                    // productName
                    // category
                    // unitsReduced
                    // lastReducedAt
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


                    const existingReduction =
                        substation.productReductions.find(
                            reduction =>
                                String(
                                    reduction.productId
                                ) ===
                                String(
                                    product._id
                                )
                        );


                    if (existingReduction) {

                        existingReduction.unitsReduced =
                            number(
                                existingReduction.unitsReduced
                            ) +
                            qty;

                        existingReduction.productName =
                            product.name ||
                            item.name ||
                            "";

                        existingReduction.category =
                            String(
                                product.category ||
                                item.category ||
                                ""
                            );

                        existingReduction.lastReducedAt =
                            new Date();

                    } else {

                        substation.productReductions.push({

                            productId:
                                product._id,

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

                            unitsReduced:
                                qty,

                            lastReducedAt:
                                new Date()
                        });
                    }


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
                // CLIENT
                // ==================================================

                let client =
                    null;


                if (
                    pkg.clientId &&
                    mongoose.isValidObjectId(
                        pkg.clientId
                    )
                ) {

                    client =
                        await User.findById(
                            pkg.clientId
                        )
                            .session(
                                session
                            );
                }


                const clientName =
                    String(
                        client?.name ||
                        client?.fullName ||
                        "Client"
                    ).trim();


                // ==================================================
                // PAYMENT SNAPSHOT
                // ==================================================

                const amountPaid =
                    number(
                        pkg.paidAmount
                    );


                const totalAmount =
                    number(
                        pkg.totalAmount
                    );


                const arrearsAmount =
                    Math.max(
                        0,
                        totalAmount -
                        amountPaid
                    );


                // ==================================================
                // DELIVERED PACKAGE
                // ==================================================
                //
                // Clearing is a separate action.
                //
                // Therefore the delivered record starts with:
                //
                //     cleared = false
                //
                // ==================================================

                const deliveredProducts =
                    items.map(
                        item => ({

                            productId:
                                item.productId,

                            name:
                                item.name,

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


                await DeliveredPackage.findOneAndUpdate(

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
                            false,

                        clearedAt:
                            null,

                        clearedByStaffId:
                            null,

                        clearedByStaffName:
                            ""
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
                // IMPORTANT:
                //
                // Use the actual Package schema field names.
                //
                // ==================================================

                pkg.status =
                    "delivered";

                pkg.deliveredByStaffId =
                    actorId;

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


        return Package
            .findById(
                resultPackage._id
            )
            .lean();

    } finally {

        await session.endSession();
    }
}


module.exports = {
    deliverPackage
};


// ==========================================================
// FILE:
// controllers/packages/staffDetails.js
// ==========================================================

const packageService =
    require("../../services/packageService");

const confirmationService =
    require("../../services/packageConfirmationService");

const DeliveredPackage =
    require("../../models/delivered");

const getEnrichedStaffPackages =
    require("./helpers/enrichStaffPackages");


exports.staffDetails =
    async (req, res) => {

        try {

            const packageDoc =
                await packageService.getStaffPackage(
                    req,
                    req.params.id
                );


            if (!packageDoc) {

                return res.status(404).render(
                    "packages/staff-details",
                    {
                        title:
                            "Package not found | CoreVester",

                        packageDoc:
                            null,

                        role:
                            req.user.role,

                        user:
                            req.user,

                        canConfirm:
                            false,

                        canClear:
                            false,

                        cleared:
                            false,

                        confirmationError:
                            "Package not found.",

                        error:
                            "Package not found."
                    }
                );
            }


            const {
                packages:
                    enrichedPackages
            } =
                await getEnrichedStaffPackages(
                    req,
                    "all"
                );


            const enrichedPackage =
                enrichedPackages.find(
                    pkg =>
                        String(pkg._id) ===
                        String(packageDoc._id)
                );


            if (enrichedPackage) {

                packageDoc.isDirectSell =
                    enrichedPackage.isDirectSell;

                packageDoc.clientRole =
                    enrichedPackage.clientRole;
            }


            const confirmationState =
                packageDoc.status === "pending"
                    ? await confirmationService.getConfirmationState(
                        req,
                        packageDoc._id
                    )
                    : {
                        ok:
                            false,

                        message:
                            ""
                    };


            const deliveredRecord =
                await DeliveredPackage.findOne({
                    packageId:
                        packageDoc._id
                })
                    .select(
                        "cleared clearedAt clearedByStaffId clearedByStaffName"
                    )
                    .lean();


            const cleared =
                Boolean(
                    deliveredRecord?.cleared
                );


            const arrears =
                Math.max(
                    0,
                    Number(
                        packageDoc.totalAmount ||
                        0
                    ) -
                    Number(
                        packageDoc.paidAmount ||
                        0
                    )
                );


            const role =
                String(
                    req.user?.role ||
                    ""
                ).toLowerCase();


            const staffId =
                String(
                    req.user?._id ||
                    req.user?.id ||
                    ""
                );


            const canClear =
                packageDoc.status === "delivered" &&
                !cleared &&
                arrears <= 0 &&
                (
                    role === "admin" ||
                    String(
                        packageDoc.deliveredByStaffId ||
                        ""
                    ) === staffId
                );


            return res.render(
                "packages/staff-details",
                {
                    title:
                        `Package ${String(packageDoc._id).slice(-8)} | Package Management`,

                    packageDoc,

                    role:
                        req.user.role,

                    user:
                        req.user,

                    canConfirm:
                        confirmationState.ok,

                    confirmationError:
                        confirmationState.ok
                            ? null
                            : confirmationState.message,

                    canClear,

                    cleared,

                    clearedAt:
                        deliveredRecord?.clearedAt ||
                        null,

                    clearedByStaffName:
                        deliveredRecord?.clearedByStaffName ||
                        "",

                    error:
                        req.query.error ||
                        null,

                    success:
                        req.query.success ||
                        null
                }
            );

        } catch (err) {

            console.error(err);

            return res.status(404).redirect(
                "/packages/staff"
            );
        }
    };


// ==========================================================
// FILE:
// controllers/packages/clear.js
// ==========================================================

const packageService =
    require("../../services/packageService");

const DeliveredPackage =
    require("../../models/delivered");


exports.clear =
    async (req, res) => {

        try {

            const role =
                String(
                    req.user?.role ||
                    ""
                ).toLowerCase();


            const staffId =
                String(
                    req.user?._id ||
                    req.user?.id ||
                    ""
                );


            if (
                role !== "staff" &&
                role !== "admin"
            ) {

                throw new Error(
                    "Staff or admin access required."
                );
            }


            const packageDoc =
                await packageService.getStaffPackage(
                    req,
                    req.params.id
                );


            if (!packageDoc) {

                throw new Error(
                    "Package not found."
                );
            }


            if (
                packageDoc.status !==
                "delivered"
            ) {

                throw new Error(
                    "Only delivered packages can be cleared."
                );
            }


            const arrears =
                Math.max(
                    0,
                    Number(
                        packageDoc.totalAmount ||
                        0
                    ) -
                    Number(
                        packageDoc.paidAmount ||
                        0
                    )
                );


            if (arrears > 0) {

                throw new Error(
                    "This package cannot be cleared while it has outstanding arrears."
                );
            }


            // --------------------------------------------------
            // Staff can only clear a package they delivered.
            // Admin can clear any delivered package.
            // --------------------------------------------------

            if (
                role === "staff" &&
                String(
                    packageDoc.deliveredByStaffId ||
                    ""
                ) !== staffId
            ) {

                throw new Error(
                    "Only the staff member who delivered this package can clear it."
                );
            }


            const deliveredRecord =
                await DeliveredPackage.findOne({
                    packageId:
                        packageDoc._id
                });


            if (!deliveredRecord) {

                throw new Error(
                    "Delivered package record was not found."
                );
            }


            if (
                deliveredRecord.cleared
            ) {

                throw new Error(
                    "This package has already been cleared."
                );
            }


            deliveredRecord.cleared =
                true;

            deliveredRecord.clearedAt =
                new Date();

            deliveredRecord.clearedByStaffId =
                staffId;

            deliveredRecord.clearedByStaffName =
                String(
                    req.user?.name ||
                    req.user?.email ||
                    "Staff"
                ).trim();


            await deliveredRecord.save();


            return res.redirect(
                `/packages/staff/${req.params.id}?success=${encodeURIComponent(
                    "Package marked as cleared."
                )}`
            );

        } catch (err) {

            console.error(err);

            return res.redirect(
                `/packages/staff/${req.params.id}?error=${encodeURIComponent(
                    err.message
                )}`
            );
        }
    };