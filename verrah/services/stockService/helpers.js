// ==========================================================
// verrah/services/stockService/helpers.js
//
// VERRAH COSMETICS
// STOCK SERVICE HELPERS
// ==========================================================


// ==========================================================
// TEXT
// ==========================================================

const text = (value) =>
    String(value ?? "").trim();


// ==========================================================
// CLEAN SUBCATEGORY
// ==========================================================

const cleanSubcategory = (value) =>
    text(value).replace(/\s+/g, " ");


// ==========================================================
// DISPLAY LABEL
// ==========================================================

const displayLabel = (value) =>
    text(value)
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, (c) =>
            c.toUpperCase()
        );


// ==========================================================
// PRODUCT NAME FROM STOCK
// ==========================================================

function productNameFromStock(stock) {

    const stockName =
        text(stock?.name);

    if (stockName) {
        return stockName;
    }

    return cleanSubcategory(
        stock?.subcategory
    );
}


// ==========================================================
// FIFO DATE
// ==========================================================

function fifoDate(value) {

    const date =
        value instanceof Date
            ? value
            : new Date(
                value || Date.now()
            );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return new Date();
    }

    return date;
}


// ==========================================================
// NUMBER
// ==========================================================

function number(
    value,
    label,
    required = false
) {

    /*
     * Empty value
     */

    if (
        value === "" ||
        value === null ||
        value === undefined
    ) {

        if (!required) {
            return 0;
        }

        throw new Error(
            `${label} is required.`
        );
    }


    /*
     * Convert to clean string.
     */

    const raw =
        text(value);


    if (!raw) {

        if (!required) {
            return 0;
        }

        throw new Error(
            `${label} is required.`
        );
    }


    /*
     * Allow comma-separated numbers.
     *
     * Example:
     *
     * 1,000
     *
     * becomes:
     *
     * 1000
     */

    const normalized =
        raw.replace(/,/g, "");


    const result =
        Number(normalized);


    /*
     * Validate number.
     */

    if (
        !Number.isFinite(result) ||
        result < 0
    ) {

        throw new Error(
            `${label} must be zero or greater.`
        );
    }


    return result;
}


// ==========================================================
// WHOLE NUMBER
// ==========================================================

function wholeNumber(
    value,
    label,
    required = false
) {

    /*
     * Empty value.
     */

    if (
        value === "" ||
        value === null ||
        value === undefined
    ) {

        if (!required) {
            return 0;
        }

        throw new Error(
            `${label} is required.`
        );
    }


    /*
     * Convert the submitted value
     * to a trimmed string.
     */

    const raw =
        text(value);


    if (!raw) {

        if (!required) {
            return 0;
        }

        throw new Error(
            `${label} is required.`
        );
    }


    /*
     * Remove thousands separators.
     *
     * 1,000 -> 1000
     */

    const normalized =
        raw.replace(/,/g, "");


    /*
     * A whole number must contain
     * digits only.
     *
     * Accepted:
     *
     * 1
     * 10
     * 100
     * "10"
     * " 10 "
     * "1,000"
     *
     * Rejected:
     *
     * 1.5
     * 10.2
     * -1
     * abc
     * 10abc
     */

    if (
        !/^\d+$/.test(
            normalized
        )
    ) {

        throw new Error(
            `${label} must be a whole number.`
        );
    }


    const result =
        Number(normalized);


    /*
     * Prevent unsafe integers.
     */

    if (
        !Number.isSafeInteger(
            result
        )
    ) {

        throw new Error(
            `${label} must be a valid whole number.`
        );
    }


    /*
     * When required=true,
     * zero is not allowed.
     */

    if (
        required &&
        result <= 0
    ) {

        throw new Error(
            `${label} must be greater than zero.`
        );
    }


    return result;
}


// ==========================================================
// BATCH UNITS
// ==========================================================

function batchUnits(batch) {

    return wholeNumber(
        batch?.units ?? 0,
        "FIFO batch units"
    );
}


// ==========================================================
// BATCH BUY PRICE
// ==========================================================

function batchBuyPrice(batch) {

    return number(
        batch?.buyPrice ?? 0,
        "FIFO batch buy price"
    );
}


// ==========================================================
// TOTAL BATCH UNITS
// ==========================================================

function totalBatchUnits(stock) {

    const batches =
        Array.isArray(
            stock?.purchaseBatches
        )
            ? stock.purchaseBatches
            : [];


    return batches.reduce(
        (
            total,
            batch
        ) => {

            return (
                total +
                batchUnits(batch)
            );

        },
        0
    );
}


// ==========================================================
// FIFO VALUE
// ==========================================================

function calculateFifoValue(stock) {

    const batches =
        Array.isArray(
            stock?.purchaseBatches
        )
            ? stock.purchaseBatches
            : [];


    return batches.reduce(
        (
            total,
            batch
        ) => {

            const units =
                batchUnits(batch);

            const buyPrice =
                batchBuyPrice(batch);


            return (
                total +
                (
                    units *
                    buyPrice
                )
            );

        },
        0
    );
}


// ==========================================================
// FIFO UNIT BUY PRICE
// ==========================================================

function calculateUnitBuyPrice(stock) {

    const units =
        totalBatchUnits(
            stock
        );


    if (units <= 0) {
        return 0;
    }


    const value =
        calculateFifoValue(
            stock
        );


    const result =
        value / units;


    if (
        !Number.isFinite(
            result
        ) ||
        result < 0
    ) {

        throw new Error(
            "Unable to calculate the unit buy price from FIFO stock."
        );
    }


    return result;
}


// ==========================================================
// SET CALCULATED UNIT BUY PRICE
// ==========================================================

function setCalculatedUnitBuyPrice(
    stock
) {

    const unitBuyPrice =
        calculateUnitBuyPrice(
            stock
        );


    stock.unitBuyPrice =
        unitBuyPrice;


    return unitBuyPrice;
}


// ==========================================================
// SORT FIFO BATCHES
// ==========================================================

function sortFifoBatches(
    batches
) {

    return [...batches].sort(
        (
            a,
            b
        ) => {

            const aDate =
                fifoDate(
                    a?.purchasedAt ||
                    a?.createdAt
                ).getTime();


            const bDate =
                fifoDate(
                    b?.purchasedAt ||
                    b?.createdAt
                ).getTime();


            return (
                aDate -
                bDate
            );
        }
    );
}


// ==========================================================
// PRODUCT FIFO UNITS
// ==========================================================

function productFifoUnits(
    product
) {

    const batches =
        Array.isArray(
            product?.fifoBatches
        )
            ? product.fifoBatches
            : [];


    return batches.reduce(
        (
            total,
            batch
        ) => {

            return (
                total +
                batchUnits(batch)
            );

        },
        0
    );
}


// ==========================================================
// PRODUCT FIFO VALUE
// ==========================================================

function productFifoValue(
    product
) {

    const batches =
        Array.isArray(
            product?.fifoBatches
        )
            ? product.fifoBatches
            : [];


    return batches.reduce(
        (
            total,
            batch
        ) => {

            const units =
                batchUnits(batch);

            const buyPrice =
                batchBuyPrice(batch);


            return (
                total +
                (
                    units *
                    buyPrice
                )
            );

        },
        0
    );
}


// ==========================================================
// WEIGHTED PRODUCT BUY PRICE
// ==========================================================

function weightedProductBuyPrice(
    product
) {

    const units =
        productFifoUnits(
            product
        );


    if (units <= 0) {
        return 0;
    }


    return (
        productFifoValue(product) /
        units
    );
}


// ==========================================================
// SORT PRODUCT FIFO
// ==========================================================

function sortProductFifo(
    batches
) {

    return [...batches].sort(
        (
            a,
            b
        ) => {

            const aDate =
                fifoDate(
                    a?.receivedAt ||
                    a?.createdAt
                ).getTime();


            const bDate =
                fifoDate(
                    b?.receivedAt ||
                    b?.createdAt
                ).getTime();


            return (
                aDate -
                bDate
            );
        }
    );
}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    text,

    cleanSubcategory,

    displayLabel,

    productNameFromStock,

    fifoDate,

    number,

    wholeNumber,

    batchUnits,

    batchBuyPrice,

    totalBatchUnits,

    calculateFifoValue,

    calculateUnitBuyPrice,

    setCalculatedUnitBuyPrice,

    sortFifoBatches,

    productFifoUnits,

    productFifoValue,

    weightedProductBuyPrice,

    sortProductFifo

};