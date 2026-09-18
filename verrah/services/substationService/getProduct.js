// ==========================================================
// verrah/services/substationService/getProduct.js
// GET PRODUCT AND SUBSTATION STOCK
// ==========================================================

const mongoose = require("mongoose");

const Substation = require("../../models/substations");
const Product = require("../../models/products");
const Category = require("../../models/category");

exports.getProduct = async (id) => {
    if (!mongoose.isValidObjectId(id)) {
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

    if (
        product.category &&
        mongoose.isValidObjectId(
            product.category
        )
    ) {
        const category =
            await Category
                .findById(product.category)
                .select("name")
                .lean();

        if (category) {
            product.category = category.name;
        }
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
        substations.map(substation => {
            const inventory =
                (
                    substation.productInventory ||
                    []
                ).find(
                    entry =>
                        String(entry.productId) ===
                        String(product._id)
                );

            return {
                _id: substation._id,
                name: substation.name,
                location: substation.location,
                units: Number(
                    inventory?.units || 0
                )
            };
        });

    return {
        ...product,
        substationStocks
    };
};
