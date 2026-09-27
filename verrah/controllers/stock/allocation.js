// ==========================================================
// verrah/controllers/stock/allocation.js
//
// STOCK ENTRY / PRODUCT ALLOCATION
// ==========================================================

const service =
    require("../../services/stockService");

const {
    getProductsForAllocation
} = require("./helpers");


// ==========================================================
// FILTER SUBSTATIONS BY BUSINESS TYPE
// ==========================================================
//
// Category:
//
// categoryDocument.businessType.id
//
// Substation:
//
// substation.businessType.id
//
// Both are ObjectIds.
// ==========================================================

function filterSubstationsByBusinessType(
    stock,
    allSubstations
) {

    const stockBusinessTypeId =
        stock &&
        stock.categoryDocument &&
        stock.categoryDocument.businessType &&
        stock.categoryDocument.businessType.id;


    if (!stockBusinessTypeId) {

        return [];
    }


    return (allSubstations || []).filter(
        substation => {

            const substationBusinessTypeId =
                substation &&
                substation.businessType &&
                substation.businessType.id;


            if (!substationBusinessTypeId) {

                return false;
            }


            return (
                String(
                    substationBusinessTypeId
                ) ===
                String(
                    stockBusinessTypeId
                )
            );

        }
    );
}


// ==========================================================
// LOAD ENTRY DATA
// ==========================================================

async function loadEntryData(
    stockId
) {

    const [
        stock,
        products,
        allSubstations
    ] =
        await Promise.all([

            service.getStock(
                stockId
            ),

            getProductsForAllocation(),

            service.getSubstations()

        ]);


    if (!stock) {

        return {

            stock: null,

            products: [],

            substations: []

        };
    }


    const substations =
        filterSubstationsByBusinessType(
            stock,
            allSubstations
        );


    return {

        stock,

        products,

        substations

    };
}


// ==========================================================
// ENTRY
// ==========================================================

async function entry(
    req,
    res
) {

    try {

        const {
            stock,
            products,
            substations
        } =
            await loadEntryData(
                req.params.id
            );


        if (!stock) {

            return res.redirect(
                "/stock?error=Stock+not+found"
            );
        }


        return res.render(
            "stock/stock-entry",
            {

                title:
                    "Allocate Product",

                stock,

                products,

                substations,

                error:
                    req.query.error ||
                    null,

                old:
                    {},

                saved:
                    req.query.saved ||
                    ""

            }
        );


    } catch (error) {

        console.error(
            "Stock entry error:",
            error
        );


        return res.redirect(
            `/stock?error=${encodeURIComponent(
                error.message
            )}`
        );
    }
}


// ==========================================================
// CREATE PRODUCT FROM STOCK
// ==========================================================

async function createProduct(
    req,
    res
) {

    try {

        await service.createProductFromStock(
            req.params.id,
            req.body
        );


        return res.redirect(
            `/stock/${req.params.id}?saved=1`
        );


    } catch (error) {

        console.error(
            "Create product from stock error:",
            error
        );


        try {

            const {
                stock,
                products,
                substations
            } =
                await loadEntryData(
                    req.params.id
                );


            if (!stock) {

                return res.redirect(
                    "/stock"
                );
            }


            return res.status(400).render(
                "stock/stock-entry",
                {

                    title:
                        "Allocate Product",

                    stock,

                    products,

                    substations,

                    error:
                        error.message,

                    old:
                        req.body,

                    saved:
                        ""

                }
            );


        } catch (reloadError) {

            console.error(
                "Stock entry reload error:",
                reloadError
            );


            return res.redirect(
                `/stock?error=${encodeURIComponent(
                    error.message
                )}`
            );
        }
    }
}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    entry,

    createProduct

};