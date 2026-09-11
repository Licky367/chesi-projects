// ==========================================================
// verrah/services/branchService.js
// VERRAH COSMETICS
// PUBLIC BRANCH / SUBSTATION SERVICE
// ==========================================================

const mongoose =
    require("mongoose");

const Substation =
    require("../models/substations");

const Product =
    require("../models/products");


// ==========================================================
// GET ALL ACTIVE SUBSTATIONS
// ==========================================================

async function getSubstations() {

    const substations =
        await Substation
            .find({
                isActive: true
            })
            .select([
                "_id",
                "name",
                "location",
                "phoneNumber",
                "directions",
                "substationIcon",
                "images",
                "description",
                "productInventory",
                "isActive"
            ].join(" "))
            .sort({
                name: 1
            })
            .lean();

    return substations || [];
}


// ==========================================================
// GET BRANCH BY ID
//
// Returns the selected substation with its products,
// including category and subcategory names.
// ==========================================================

async function getBranchById(id) {

    // --------------------------------------------------------
    // VALIDATE ID
    // --------------------------------------------------------

    if (
        !mongoose.Types.ObjectId.isValid(id)
    ) {
        return null;
    }


    // --------------------------------------------------------
    // GET SUBSTATION
    // --------------------------------------------------------

    const substation =
        await Substation
            .findOne({
                _id: id,
                isActive: true
            })
            .select([
                "_id",
                "name",
                "location",
                "phoneNumber",
                "directions",
                "substationIcon",
                "images",
                "description",
                "productInventory",
                "isActive"
            ].join(" "))
            .lean();


    if (!substation) {
        return null;
    }


    // --------------------------------------------------------
    // INVENTORY
    // --------------------------------------------------------

    const inventory =
        Array.isArray(
            substation.productInventory
        )
            ? substation.productInventory
            : [];


    // --------------------------------------------------------
    // PRODUCT IDS
    // --------------------------------------------------------

    const productIds =
        inventory
            .map((item) => {

                if (!item) {
                    return null;
                }

                return (
                    item.product ||
                    item.productId ||
                    null
                );

            })
            .filter((id) =>
                id &&
                mongoose.Types.ObjectId.isValid(id)
            );


    const uniqueProductIds =
        [
            ...new Set(
                productIds.map((id) =>
                    String(id)
                )
            )
        ];


    // --------------------------------------------------------
    // GET PRODUCTS
    //
    // Populate category and subcategory so the view receives
    // their actual names.
    // --------------------------------------------------------

    let products = [];


    if (uniqueProductIds.length) {

        products =
            await Product
                .find({
                    _id: {
                        $in: uniqueProductIds
                    }
                })
                .select([
                    "_id",
                    "name",
                    "image",
                    "category",
                    "subcategory"
                ].join(" "))

                // --------------------------------------------
                // CATEGORY
                // --------------------------------------------

                .populate({
                    path: "category",
                    select: "name"
                })

                // --------------------------------------------
                // SUBCATEGORY
                // --------------------------------------------

                .populate({
                    path: "subcategory",
                    select: "name"
                })

                .lean();
    }


    // --------------------------------------------------------
    // PRODUCT LOOKUP
    // --------------------------------------------------------

    const productMap =
        new Map(
            products.map((product) => [
                String(product._id),
                product
            ])
        );


    // --------------------------------------------------------
    // BUILD PRODUCTS FOR THE VIEW
    // --------------------------------------------------------

    substation.products =
        inventory
            .map((item) => {

                if (!item) {
                    return null;
                }


                const productId =
                    item.product ||
                    item.productId ||
                    null;


                if (
                    !productId ||
                    !mongoose.Types.ObjectId.isValid(
                        productId
                    )
                ) {
                    return null;
                }


                const product =
                    productMap.get(
                        String(productId)
                    );


                if (!product) {
                    return null;
                }


                return {

                    ...product,


                    // ----------------------------------------
                    // CATEGORY NAME
                    // ----------------------------------------

                    categoryName:
                        product.category?.name ||
                        "Other",


                    // ----------------------------------------
                    // SUBCATEGORY NAME
                    // ----------------------------------------

                    subcategoryName:
                        product.subcategory?.name ||
                        "Other",


                    // ----------------------------------------
                    // UNITS AT THIS SUBSTATION
                    // ----------------------------------------

                    substationUnits:
                        Number(
                            item.units ??
                            item.quantity ??
                            item.substationUnits ??
                            0
                        )

                };

            })
            .filter(Boolean);


    return substation;
}


// ==========================================================
// GET BRANCH PAGE DATA
// ==========================================================

async function getBranchPageData(id) {

    const [
        substation,
        substations
    ] = await Promise.all([
        getBranchById(id),
        getSubstations()
    ]);


    if (!substation) {
        return null;
    }


    return {
        substation,
        substations
    };
}


// ==========================================================
// EXPORT
// ==========================================================

module.exports = {

    getBranchById,

    getSubstations,

    getBranchPageData

};