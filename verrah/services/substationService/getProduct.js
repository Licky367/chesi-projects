// ==========================================================
// verrah/services/substationService/getProduct.js
// GET PRODUCT AND SUBSTATION STOCK
// ==========================================================

const mongoose =
    require("mongoose");

const Substation =
    require("../../models/substations");

const Product =
    require("../../models/products");

const Category =
    require("../../models/category");


// ==========================================================
// GET PRODUCT
// ==========================================================

exports.getProduct =
async (
    id
) => {

    if (
        !mongoose.isValidObjectId(
            id
        )
    ) {
        return null;
    }


    // --------------------------------------------------------
    // GET PRODUCT
    // --------------------------------------------------------

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


    // --------------------------------------------------------
    // GET CATEGORY
    // --------------------------------------------------------

    let categoryDocument =
        null;


    if (
        product.category &&
        mongoose.isValidObjectId(
            product.category
        )
    ) {

        categoryDocument =
            await Category
                .findById(
                    product.category
                )
                .select(
                    "name businessType"
                )
                .lean();


        if (categoryDocument) {

            // Preserve the existing behavior:
            // product.category remains the category name.

            product.category =
                categoryDocument.name;

        }

    }


    // --------------------------------------------------------
    // GET SUBSTATIONS CONTAINING THIS PRODUCT
    // --------------------------------------------------------

    const substations =
        await Substation
            .find({
                isActive: true,
                "productInventory.productId":
                    product._id
            })
            .select(
                "name location productInventory businessType"
            )
            .lean();


    // --------------------------------------------------------
    // BUILD SUBSTATION STOCK
    // --------------------------------------------------------

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
                            inventory?.units ||
                            0
                        )

                };

            }
        );


    // --------------------------------------------------------
    // RETURN PRODUCT
    // --------------------------------------------------------

    return {

        ...product,

        categoryDocument,

        substationStocks

    };

};