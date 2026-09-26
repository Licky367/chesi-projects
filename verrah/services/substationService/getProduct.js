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

            // Keep existing product.category behavior
            // as the category name.

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
    // SUBSTATION STOCK
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
    // RETURN
    // --------------------------------------------------------

    return {

        ...product,

        // Full category document is retained separately
        // so controllers can access businessType.id.

        categoryDocument,

        substationStocks

    };

};

"controllers/substations/productDetail.js"

:::writing{variant="standard" id="82641" title="productDetail.js"}

// ==========================================================
// verrah/controllers/substations/productDetail.js
// PRODUCT DETAIL
// ==========================================================

const service =
    require("../../services/substationService");

const {
    getRole
} = require("./helpers");


// ==========================================================
// PRODUCT DETAIL
// ==========================================================
//
// GET /substations/product/:id
//
// :id = PRODUCT ID
// ==========================================================

exports.productDetail =
async (
    req,
    res
) => {

    try {

        // ----------------------------------------------------
        // PRODUCT ID
        // ----------------------------------------------------

        const productId =
            req.params.id;


        // ----------------------------------------------------
        // GET PRODUCT
        // ----------------------------------------------------

        const product =
            await service.getProduct(
                productId
            );


        // ----------------------------------------------------
        // PRODUCT NOT FOUND
        // ----------------------------------------------------

        if (!product) {

            return res.redirect(
                "/substations?error=Product+not+found"
            );

        }


        // ----------------------------------------------------
        // GET ALL SUBSTATIONS
        // ----------------------------------------------------

        const allSubstations =
            await service.list();


        // ----------------------------------------------------
        // PRODUCT CATEGORY BUSINESS TYPE
        // ----------------------------------------------------

        const businessTypeId =
            product.categoryDocument &&
            product.categoryDocument.businessType &&
            product.categoryDocument.businessType.id
                ? String(
                    product
                        .categoryDocument
                        .businessType
                        .id
                )
                : null;


        // ----------------------------------------------------
        // FILTER SUBSTATIONS
        // ----------------------------------------------------
        //
        // Only substations belonging to the same
        // businessType as the Product's Category.
        //
        // Comparison is done using businessType.id,
        // not businessType.name.
        // ----------------------------------------------------

        const substations =
            businessTypeId
                ? allSubstations.filter(
                    substation => {

                        const substationBusinessTypeId =
                            substation.businessType &&
                            substation.businessType.id
                                ? String(
                                    substation
                                        .businessType
                                        .id
                                )
                                : null;


                        return (
                            substationBusinessTypeId ===
                            businessTypeId
                        );

                    }
                )
                : [];


        // ----------------------------------------------------
        // RENDER PRODUCT DETAIL
        // ----------------------------------------------------

        return res.render(
            "substations/product-detail",
            {
                title:
                    product.name,

                // ------------------------------------------------
                // PRODUCT
                // ------------------------------------------------

                product,

                // ------------------------------------------------
                // SUBSTATIONS
                // ------------------------------------------------

                substations,

                // ------------------------------------------------
                // ROLE
                // ------------------------------------------------

                role:
                    getRole(req),

                // ------------------------------------------------
                // MESSAGES
                // ------------------------------------------------

                error:
                    req.query.error ||
                    null,

                success:
                    req.query.success ||
                    null,

                // ------------------------------------------------
                // USER
                // ------------------------------------------------

                user:
                    req.user

            }
        );


    } catch (e) {

        console.error(
            "PRODUCT DETAIL ERROR:",
            e
        );


        return res.redirect(
            `/substations?error=${encodeURIComponent(
                e.message
            )}`
        );

    }

};