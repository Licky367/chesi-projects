// ==========================================================
// verrah/services/salesService/products.js
//
// VERRAH COSMETICS
// PRODUCT ANALYTICS SERVICE
// ==========================================================


const Product =
    require("../../models/products");

const Stock =
    require("../../models/stock");

const Package =
    require("../../models/package");


// ==========================================================
// GET PRODUCT ANALYTICS
// ==========================================================

async function getProductAnalytics(
    filter
) {

    const products =
        await Product.find({

            isActive:
                true

        })

            .select(
                "_id name subcategory units buyPrice stock"
            )

            .lean();


    const stockRecords =
        await Stock.find({

            isActive:
                true

        })

            .select(
                "subcategory units"
            )

            .lean();


    // ======================================================
    // STOCK BY SUBCATEGORY
    // ======================================================

    const stockBySubcategory =
        new Map();


    for (
        const stock
        of stockRecords
    ) {

        const key =
            String(
                stock.subcategory || ""
            )
                .trim()
                .toLowerCase();


        if (!key) {

            continue;

        }


        const existing =
            stockBySubcategory.get(
                key
            ) || 0;


        stockBySubcategory.set(

            key,

            existing +
            Number(
                stock.units || 0
            )

        );

    }


    // ======================================================
    // DELIVERED PACKAGES
    // ======================================================

    const deliveredPackages =
        await Package.find({

            status:
                "delivered",

            createdAt: {

                $gte:
                    filter.startDate,

                $lt:
                    filter.endDate

            }

        })

            .select(
                "items"
            )

            .lean();


    // ======================================================
    // SALES BY PRODUCT
    // ======================================================

    const salesByProduct =
        new Map();


    for (
        const pkg
        of deliveredPackages
    ) {

        for (
            const item
            of pkg.items || []
        ) {

            if (
                !item.productId
            ) {

                continue;

            }


            const key =
                String(
                    item.productId
                );


            salesByProduct.set(

                key,

                (

                    salesByProduct.get(
                        key
                    ) || 0

                ) +

                Number(
                    item.qty || 0
                )

            );

        }

    }


    // ======================================================
    // RETURN PRODUCT ANALYTICS
    // ======================================================

    return products

        .map(

            product => {

                const subcategory =
                    String(
                        product.subcategory || ""
                    )
                        .trim()
                        .toLowerCase();


                return {

                    _id:
                        product._id,

                    name:
                        product.name,

                    stockAvailable:
                        stockBySubcategory.get(
                            subcategory
                        ) || 0,

                    marketAvailable:
                        Number(
                            product.units || 0
                        ),

                    sales:
                        salesByProduct.get(

                            String(
                                product._id
                            )

                        ) || 0

                };

            }

        )

        .sort(

            (a, b) =>
                String(
                    a.name
                ).localeCompare(

                    String(
                        b.name
                    )

                )

        );

}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    getProductAnalytics

};