// ==========================================================
// verrah/services/substationService/getWithProducts.js
// GET SUBSTATION WITH PRODUCTS
// ==========================================================

const mongoose = require("mongoose");

const Substation = require("../models/substations");
const Product = require("../models/products");
const Category = require("../models/category");

const {
    prepareSubstation
} = require("./helpers");

exports.getWithProducts = async (id) => {
    if (!mongoose.isValidObjectId(id)) {
        return null;
    }

    const substation =
        await Substation
            .findById(id)
            .select(
                "name location phoneNumber substationIcon description directions gps isActive productInventory images"
            )
            .lean();

    if (!substation) {
        return null;
    }

    const inventory =
        Array.isArray(substation.productInventory)
            ? substation.productInventory
            : [];

    const productIds =
        inventory
            .map(item => item.productId)
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

    const categoryIds =
        products
            .map(product => product.category)
            .filter(category =>
                mongoose.isValidObjectId(category)
            );

    const categories =
        categoryIds.length
            ? await Category
                .find({
                    _id: {
                        $in: categoryIds
                    }
                })
                .select("name")
                .lean()
            : [];

    const categoryMap =
        new Map(
            categories.map(category => [
                String(category._id),
                category.name
            ])
        );

    const productMap =
        new Map(
            products.map(product => {
                const categoryId =
                    product.category;

                const categoryName =
                    categoryId &&
                    categoryMap.has(
                        String(categoryId)
                    )
                        ? categoryMap.get(
                            String(categoryId)
                        )
                        : (
                            typeof categoryId === "string"
                                ? categoryId
                                : ""
                        );

                return [
                    String(product._id),
                    {
                        ...product,
                        category: categoryName
                    }
                ];
            })
        );

    const physicalProducts =
        inventory
            .map(item => {
                const product =
                    productMap.get(
                        String(item.productId)
                    );

                if (!product) {
                    return null;
                }

                return {
                    ...product,

                    substationUnits:
                        Number(item.units || 0),

                    substationInventoryId:
                        item.productId
                };
            })
            .filter(Boolean);

    return {
        ...prepareSubstation(substation),
        products: physicalProducts
    };
};
