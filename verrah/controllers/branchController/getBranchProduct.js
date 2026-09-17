// ==========================================================
// controllers/branch/getBranchProduct.js
// VERRAH COSMETICS
// BRANCH / SUBSTATION PRODUCT CONTROLLER
// ==========================================================
//
// RESPONSIBILITIES:
//
//     • Load a product belonging to a specific substation
//     • Ensure the product belongs to that substation
//     • Provide substation-specific units
//     • Render branch/product-specific.ejs
//
// ==========================================================

const substationService =
    require("../../services/substationService");


// ==========================================================
// GET PRODUCT FROM BRANCH / SUBSTATION
// ==========================================================

exports.getBranchProduct = async function (req, res) {

    try {

        const substationId =
            req.params.id;

        const productId =
            req.params.productId;


        // ----------------------------------------------------
        // LOAD SUBSTATION WITH ITS PRODUCTS
        // ----------------------------------------------------

        const substation =
            await substationService.getWithProducts(
                substationId
            );


        // ----------------------------------------------------
        // SUBSTATION NOT FOUND
        // ----------------------------------------------------

        if (!substation) {

            return res.status(404).render(
                "branch-partials/product-specific",
                {
                    title:
                        "Location Not Found | Verrah Cosmetics",

                    substation: null,

                    product: null,

                    currentUser:
                        req.session?.user || null,

                    error:
                        "The requested Verrah Cosmetics location could not be found."
                }
            );
        }


        // ----------------------------------------------------
        // FIND PRODUCT INSIDE THIS SUBSTATION
        // ----------------------------------------------------
        //
        // IMPORTANT:
        //
        // Do NOT use product.units here.
        //
        // product.units = global product stock
        //
        // product.substationUnits =
        // units available at THIS substation
        //
        // ----------------------------------------------------

        const product =
            (substation.products || []).find(
                item =>
                    String(item._id) ===
                    String(productId)
            );


        // ----------------------------------------------------
        // PRODUCT NOT FOUND AT THIS SUBSTATION
        // ----------------------------------------------------

        if (!product) {

            return res.status(404).render(
                "branch-partials/product-specific",
                {
                    title:
                        "Product Not Found | Verrah Cosmetics",

                    substation,

                    product: null,

                    currentUser:
                        req.session?.user || null,

                    error:
                        "This product is not available at this location."
                }
            );
        }


        // ----------------------------------------------------
        // SUBSTATION-SPECIFIC UNITS
        // ----------------------------------------------------

        const substationUnits =
            Number(
                product.substationUnits || 0
            );


        // ----------------------------------------------------
        // RENDER PRODUCT-SPECIFIC PAGE
        // ----------------------------------------------------

        return res.render(
            "branch-partials/product-specific",
            {
                title:
                    `${product.name} | ${substation.name} | Verrah Cosmetics`,

                substation,

                product,

                // Explicitly expose the correct stock
                // for the selected substation.
                substationUnits,

                currentUser:
                    req.session?.user || null,

                error: null
            }
        );


    } catch (error) {

        console.error(
            "GET BRANCH PRODUCT ERROR:",
            error
        );


        // ----------------------------------------------------
        // SERVER ERROR
        // ----------------------------------------------------

        return res.status(500).render(
            "branch-partials/product-specific",
            {
                title:
                    "Product | Verrah Cosmetics",

                substation: null,

                product: null,

                substationUnits: 0,

                currentUser:
                    req.session?.user || null,

                error:
                    "Unable to load this product."
            }
        );
    }
};