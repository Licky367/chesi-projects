const service =
require("../../services/stockService");

const {
getProductsForAllocation
} = require("./helpers");

async function entry(
req,
res
) {

try {

    const [
        stock,
        products,
        allSubstations
    ] = await Promise.all([

        service.getStock(
            req.params.id
        ),

        getProductsForAllocation(),

        service.getSubstations()

    ]);


    if (!stock) {

        return res.redirect(
            "/stock?error=Stock+not+found"
        );
    }


    // ==================================================
    // FILTER SUBSTATIONS BY STOCK CATEGORY BUSINESS TYPE
    // ==================================================

    const businessTypeId =
        stock.categoryDocument &&
        stock.categoryDocument.businessType &&
        stock.categoryDocument.businessType.id
            ? String(
                stock.categoryDocument
                    .businessType
                    .id
            )
            : null;


    const substations =
        businessTypeId
            ? allSubstations.filter(
                substation =>
                    substation.businessType &&
                    substation.businessType.id &&
                    String(
                        substation.businessType.id
                    ) ===
                    businessTypeId
            )
            : [];


    return res.render(
        "stock/stock-entry",
        {
            title:
                "Allocate Product",

            stock,

            products,

            substations,

            error:
                req.query.error || null,

            old:
                {},

            saved:
                req.query.saved || ""
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


    const [
        stock,
        products,
        allSubstations
    ] = await Promise.all([

        service.getStock(
            req.params.id
        ),

        getProductsForAllocation(),

        service.getSubstations()

    ]);


    if (!stock) {

        return res.redirect(
            "/stock"
        );
    }


    // ==================================================
    // FILTER SUBSTATIONS BY STOCK CATEGORY BUSINESS TYPE
    // ==================================================

    const businessTypeId =
        stock.categoryDocument &&
        stock.categoryDocument.businessType &&
        stock.categoryDocument.businessType.id
            ? String(
                stock.categoryDocument
                    .businessType
                    .id
            )
            : null;


    const substations =
        businessTypeId
            ? allSubstations.filter(
                substation =>
                    substation.businessType &&
                    substation.businessType.id &&
                    String(
                        substation.businessType.id
                    ) ===
                    businessTypeId
            )
            : [];


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
}

}

module.exports = {
entry,
createProduct
};