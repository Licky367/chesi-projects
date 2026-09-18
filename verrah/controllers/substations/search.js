// ==========================================================
// verrah/controllers/substations/search.js
// SUBSTATION PRODUCT SEARCH CONTROLLER
// ==========================================================
//
// Renders the search page for products belonging to a
// particular substation.
//
// Search fields:
//     - Product name
//     - Category name
//
// ==========================================================

const service =
    require("../../services/substationService");


// ==========================================================
// SEARCH PAGE
// ==========================================================

exports.searchProductPage =
async (
    req,
    res
) => {
    try {

        const substation =
            await service.getById(
                req.params.id
            );


        if (!substation) {
            return res.redirect(
                "/substations?error=Substation+not+found"
            );
        }


        const query =
            String(
                req.query.q || ""
            ).trim();


        let products = [];


        if (query) {
            products =
                await service.search(
                    req.params.id,
                    query
                );
        }


        return res.render(
            "substations/searchProduct",
            {
                title:
                    `Search Products - ${substation.name}`,

                substation,

                products,

                query,

                error:
                    req.query.error || null,

                user:
                    req.user
            }
        );


    } catch (e) {

        console.error(
            "SUBSTATION PRODUCT SEARCH ERROR:",
            e
        );


        return res.redirect(
            `/substations?error=${encodeURIComponent(
                e.message
            )}`
        );
    }
};
