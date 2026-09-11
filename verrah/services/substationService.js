// ==========================================================
// verrah/services/substationService.js
// SUBSTATION SERVICE
// ==========================================================

const mongoose = require("mongoose");

const Substation = require("../models/substations");
const Product = require("../models/products");
const Stock = require("../models/stock");


// ==========================================================
// HELPERS
// ==========================================================

const text = (value) =>
    String(value ?? "").trim();


// ----------------------------------------------------------
// PHONE NUMBER
// ----------------------------------------------------------

const normalizePhoneNumber = (value) => {

    if (
        value === undefined ||
        value === null ||
        String(value).trim() === ""
    ) {
        return null;
    }

    const cleaned =
        String(value)
            .trim()
            .replace(/[^\d+]/g, "");

    if (!cleaned) {
        return null;
    }

    const number =
        Number(cleaned);

    if (!Number.isFinite(number)) {
        throw new Error(
            "Invalid phone number."
        );
    }

    return number;
};


// ----------------------------------------------------------
// GPS COORDINATE
// ----------------------------------------------------------

const normalizeCoordinate = (
    value,
    min,
    max,
    fieldName
) => {

    if (
        value === undefined ||
        value === null ||
        String(value).trim() === ""
    ) {
        return null;
    }

    const number =
        Number(value);

    if (
        !Number.isFinite(number) ||
        number < min ||
        number > max
    ) {
        throw new Error(
            `${fieldName} must be between ${min} and ${max}.`
        );
    }

    return number;
};


// ----------------------------------------------------------
// BUILD GPS OBJECT
// ----------------------------------------------------------

const buildGPS = (body) => {

    const latitude =
        normalizeCoordinate(
            body.latitude,
            -90,
            90,
            "Latitude"
        );

    const longitude =
        normalizeCoordinate(
            body.longitude,
            -180,
            180,
            "Longitude"
        );


    /*
     * GPS must either contain both coordinates or neither.
     */

    if (
        (latitude === null && longitude !== null) ||
        (latitude !== null && longitude === null)
    ) {
        throw new Error(
            "Both latitude and longitude are required for a GPS location."
        );
    }


    return {
        latitude,
        longitude
    };
};


// ==========================================================
// LIST SUBSTATIONS
// ==========================================================

exports.list = () =>
    Substation
        .find({
            isActive: true
        })
        .sort({
            name: 1
        })
        .lean();


// ==========================================================
// CREATE SUBSTATION
// ==========================================================

exports.create = async (
    body
) => {

    const name =
        text(body.name);


    if (!name) {
        throw new Error(
            "Substation name is required."
        );
    }


    if (
        await Substation.findOne({
            name
        })
    ) {
        throw new Error(
            "A substation with that name already exists."
        );
    }


    const gps =
        buildGPS(body);


    const phoneNumber =
        normalizePhoneNumber(
            body.phoneNumber
        );


    const substationData = {

        name,

        location:
            text(body.location),

        phoneNumber,

        substationIcon:
            text(body.substationIcon),

        description:
            text(body.description),

        directions:
            text(body.directions),

        gps,

        isActive:
            body.isActive === undefined
                ? true
                : (
                    body.isActive === true ||
                    body.isActive === "true" ||
                    body.isActive === "on"
                )
    };


    return Substation.create(
        substationData
    );
};


// ==========================================================
// GET SUBSTATION BY ID
// ==========================================================

exports.getById = async (
    id
) => {

    if (
        !mongoose.isValidObjectId(id)
    ) {
        return null;
    }


    return Substation
        .findById(id)
        .lean();
};


// ==========================================================
// GET SUBSTATION WITH PRODUCTS
// ==========================================================

exports.getWithProducts = async (
    id
) => {

    if (
        !mongoose.isValidObjectId(id)
    ) {
        return null;
    }


    const substation =
        await Substation
            .findById(id)
            .lean();


    if (!substation) {
        return null;
    }


    const inventory =
        Array.isArray(
            substation.productInventory
        )
            ? substation.productInventory
            : [];


    const productIds =
        inventory
            .map(
                item =>
                    item.productId
            )
            .filter(Boolean);


    const products =
        await Product
            .find({
                _id: {
                    $in: productIds
                },

                isActive: true
            })
            .sort({
                name: 1
            })
            .lean();


    const productMap =
        new Map(
            products.map(
                product => [
                    String(product._id),
                    product
                ]
            )
        );


    const physicalProducts =
        inventory
            .map(
                item => {

                    const product =
                        productMap.get(
                            String(
                                item.productId
                            )
                        );


                    if (!product) {
                        return null;
                    }


                    return {
                        ...product,

                        substationUnits:
                            Number(
                                item.units || 0
                            ),

                        substationInventoryId:
                            item.productId
                    };
                }
            )
            .filter(Boolean);


    return {
        ...substation,

        products:
            physicalProducts
    };
};


// ==========================================================
// GET PRODUCT
// ==========================================================

exports.getProduct = async (
    id
) => {

    if (
        !mongoose.isValidObjectId(id)
    ) {
        return null;
    }


    const product =
        await Product
            .findOne({
                _id: id,

                isActive: true
            })
            .populate(
                "stock",
                "name category subcategory days units buyPrice"
            )
            .lean();


    if (!product) {
        return null;
    }


    const substations =
        await Substation
            .find({
                isActive: true,

                "productInventory.productId":
                    product._id
            })
            .select(
                "name location productInventory"
            )
            .lean();


    const substationStocks =
        substations.map(
            substation => {

                const inventory =
                    (
                        substation.productInventory ||
                        []
                    ).find(
                        entry =>
                            String(
                                entry.productId
                            ) ===
                            String(
                                product._id
                            )
                    );


                return {

                    _id:
                        substation._id,

                    name:
                        substation.name,

                    location:
                        substation.location,

                    units:
                        Number(
                            inventory?.units || 0
                        )
                };
            }
        );


    return {
        ...product,

        substationStocks
    };
};


// ==========================================================
// UPDATE SUBSTATION
// ==========================================================

exports.update = async (
    id,
    body
) => {

    if (
        !mongoose.isValidObjectId(id)
    ) {
        throw new Error(
            "Invalid substation ID."
        );
    }


    const existing =
        await Substation.findById(
            id
        );


    if (!existing) {
        throw new Error(
            "Substation not found."
        );
    }


    const name =
        text(body.name);


    if (!name) {
        throw new Error(
            "Substation name is required."
        );
    }


    const duplicate =
        await Substation.findOne({
            name,

            _id: {
                $ne: id
            }
        });


    if (duplicate) {
        throw new Error(
            "A substation with that name already exists."
        );
    }


    const gps =
        buildGPS(body);


    const phoneNumber =
        normalizePhoneNumber(
            body.phoneNumber
        );


    const updateData = {

        name,

        location:
            text(body.location),

        phoneNumber,

        description:
            text(body.description),

        directions:
            text(body.directions),

        gps,

        isActive:
            body.isActive === undefined
                ? existing.isActive
                : (
                    body.isActive === true ||
                    body.isActive === "true" ||
                    body.isActive === "on"
                )
    };


    /*
     * Only change the icon when the controller actually
     * supplies a new icon.
     *
     * This prevents an edit of name/location/GPS/etc.
     * from deleting the existing icon.
     */

    if (
        body.substationIcon !== undefined
    ) {

        const icon =
            text(
                body.substationIcon
            );


        if (icon) {

            updateData.substationIcon =
                icon;

        } else {

            updateData.substationIcon =
                existing.substationIcon || "";
        }
    }


    return Substation.findByIdAndUpdate(
        id,

        {
            $set:
                updateData
        },

        {
            new: true,

            runValidators: true
        }
    ).lean();
};


// ==========================================================
// UPDATE ICON
// ==========================================================

exports.updateIcon = async (
    id,
    imagePath
) => {

    if (
        !mongoose.isValidObjectId(id)
    ) {
        throw new Error(
            "Invalid substation ID."
        );
    }


    if (!imagePath) {
        throw new Error(
            "Icon image path is required."
        );
    }


    return Substation.findByIdAndUpdate(
        id,

        {
            $set: {
                substationIcon:
                    imagePath
            }
        },

        {
            new: true,

            runValidators: true
        }
    ).lean();
};


// ==========================================================
// UPDATE IMAGES
// ==========================================================

exports.updateImages = async (
    id,
    images
) => {

    if (
        !mongoose.isValidObjectId(id)
    ) {
        throw new Error(
            "Invalid substation ID."
        );
    }


    if (!Array.isArray(images)) {
        images = [];
    }


    images =
        images
            .filter(Boolean)
            .map(
                image =>
                    String(image).trim()
            )
            .filter(Boolean);


    if (
        images.length > 20
    ) {
        throw new Error(
            "A substation can have a maximum of 20 images."
        );
    }


    return Substation.findByIdAndUpdate(
        id,

        {
            $set: {
                images
            }
        },

        {
            new: true,

            runValidators: true
        }
    ).lean();
};


// ==========================================================
// UPDATE PRODUCT UNITS
// ==========================================================

exports.updateProductUnits = async (
    productId,
    body
) => {

    if (
        !mongoose.isValidObjectId(
            productId
        )
    ) {
        throw new Error(
            "Invalid product."
        );
    }


    if (
        !mongoose.isValidObjectId(
            body.substationId
        )
    ) {
        throw new Error(
            "Invalid substation."
        );
    }


    const newUnits =
        Number(body.units);


    if (
        !Number.isInteger(newUnits) ||
        newUnits < 0
    ) {
        throw new Error(
            "Units must be a whole number greater than or equal to zero."
        );
    }


    const session =
        await mongoose.startSession();


    try {

        let result;


        await session.withTransaction(
            async () => {

                const product =
                    await Product
                        .findOne({
                            _id: productId,

                            isActive: true
                        })
                        .session(session);


                if (!product) {
                    throw new Error(
                        "Product not found."
                    );
                }


                const stock =
                    await Stock
                        .findOne({
                            _id:
                                product.stock,

                            isActive:
                                true
                        })
                        .session(session);


                if (!stock) {
                    throw new Error(
                        "The source stock subcategory was not found."
                    );
                }


                const substation =
                    await Substation
                        .findOne({
                            _id:
                                body.substationId,

                            isActive:
                                true
                        })
                        .session(session);


                if (!substation) {
                    throw new Error(
                        "Substation not found or inactive."
                    );
                }


                const inventory =
                    substation
                        .productInventory
                        .find(
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
                        "This product is not allocated to the selected substation."
                    );
                }


                const oldUnits =
                    Number(
                        inventory.units || 0
                    );


                const delta =
                    newUnits -
                    oldUnits;


                if (
                    delta > 0 &&
                    Number(
                        stock.units || 0
                    ) < delta
                ) {

                    throw new Error(
                        `Only ${Number(
                            stock.units || 0
                        )} units remain in the source stock. You need ${delta} additional units.`
                    );
                }


                inventory.units =
                    newUnits;


                inventory.updatedAt =
                    new Date();


                inventory.productName =
                    product.name;


                inventory.category =
                    product.category;


                inventory.subcategory =
                    product.subcategory;


                inventory.days =
                    Number(
                        product.days || 0
                    );


                await substation.save({
                    session
                });


                product.units =
                    Math.max(
                        0,

                        Number(
                            product.units || 0
                        ) + delta
                    );


                product.updatedAt =
                    new Date();


                await product.save({
                    session
                });


                stock.units =
                    Math.max(
                        0,

                        Number(
                            stock.units || 0
                        ) - delta
                    );


                stock.totalsUpdatedAt =
                    new Date();


                await stock.save({
                    session
                });


                const allStocks =
                    await Stock
                        .find({
                            isActive: true
                        })
                        .select(
                            "_id category units buyPrice"
                        )
                        .session(session)
                        .lean();


                const categoryTotals =
                    new Map();


                let overall = 0;


                for (
                    const item of allStocks
                ) {

                    const value =
                        Number(
                            item.units || 0
                        ) *
                        Number(
                            item.buyPrice || 0
                        );


                    categoryTotals.set(
                        item.category,

                        (
                            categoryTotals.get(
                                item.category
                            ) || 0
                        ) + value
                    );


                    overall +=
                        value;
                }


                const now =
                    new Date();


                for (
                    const item of allStocks
                ) {

                    const value =
                        Number(
                            item.units || 0
                        ) *
                        Number(
                            item.buyPrice || 0
                        );


                    await Stock.updateOne(
                        {
                            _id:
                                item._id
                        },

                        {
                            $set: {

                                cashOutflow:
                                    value,

                                categoryOveral:
                                    categoryTotals.get(
                                        item.category
                                    ) || 0,

                                overal:
                                    overall,

                                totalsUpdatedAt:
                                    now
                            }
                        },

                        {
                            session,

                            timestamps:
                                true
                        }
                    );
                }


                result = {

                    productId:
                        product._id,

                    substationId:
                        substation._id,

                    units:
                        newUnits,

                    delta
                };
            }
        );


        return result;

    } finally {

        await session.endSession();

    }
};