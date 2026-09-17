// ==========================================================
// verrah/services/products/helpers.js
// PRODUCT SERVICE HELPERS
// ==========================================================


// ==========================================================
// CHUNK PRODUCTS
// ==========================================================
//
// Maximum six products in one row.
//
// ==========================================================

function chunk(items, size = 6) {

    const rows = [];

    for (
        let i = 0;
        i < items.length;
        i += size
    ) {

        rows.push({
            products: items.slice(i, i + size)
        });

    }

    return rows;
}


// ==========================================================
// NORMALIZE DIRECTIONS OF USE
// ==========================================================

function normalizeDirections(directions) {

    if (!directions) {
        return undefined;
    }


    const items =
        Array.isArray(directions.items)

            ? directions.items
                .map((item) => {

                    return {
                        subtitle: String(
                            item?.subtitle || ""
                        ).trim(),

                        content: String(
                            item?.content || ""
                        ).trim()
                    };

                })
                .filter((item) => {

                    return (
                        item.subtitle &&
                        item.content
                    );

                })

            : [];


    const title =
        String(
            directions.title || ""
        ).trim();


    if (
        !title &&
        items.length === 0
    ) {

        return undefined;

    }


    return {
        title,
        items
    };
}


// ==========================================================
// PREPARE PRODUCT FOR FRONTEND
// ==========================================================
//
// Removes the MongoDB category field and exposes the
// human-readable category name instead.
//
// ==========================================================

function prepareProduct(product, categoryName) {

    const prepared = {
        ...product,

        categoryName:
            categoryName || "Other"
    };


    delete prepared.category;


    return prepared;
}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    chunk,

    normalizeDirections,

    prepareProduct

};