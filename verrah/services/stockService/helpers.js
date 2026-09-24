const text = (value) =>
    String(value ?? "").trim();


const cleanSubcategory = (value) =>
    text(value).replace(/\s+/g, " ");


const displayLabel = (value) =>
    text(value)
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());


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


/* ==========================================================
   NUMBER
========================================================== */

function number(
    value,
    label,
    required = false
) {

    if (
        value === "" ||
        value == null
    ) {

        if (!required) {
            return 0;
        }

        throw new Error(
            `${label} is required.`
        );
    }

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
     * Accept normal numeric input and
     * numeric strings containing commas.
     *
     * Example:
     *
     * 1000
     * "1000"
     * " 1000 "
     * "1,000"
     *
     * All become 1000.
     */
    const normalized =
        raw.replace(/,/g, "");


    const result =
        Number(normalized);


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


/* ==========================================================
   WHOLE NUMBER
========================================================== */

function wholeNumber(
    value,
    label,
    required = false
) {

    if (
        value === "" ||
        value == null
    ) {

        if (!required) {
            return 0;
        }

        throw new Error(
            `${label} is required.`
        );
    }


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
     * IMPORTANT
     *
     * Do not rely only on
     * Number.isInteger(Number(value)).
     *
     * Normalize the submitted form value first.
     */
    const normalized =
        raw.replace(/,/g, "");


    /*
     * A whole-number field must contain
     * digits only.
     *
     * This rejects:
     *
     * 1.5
     * 1.0
     * 10abc
     * -10
     *
     * while accepting:
     *
     * 10
     * "10"
     * " 10 "
     * "1,000"
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


    if (
        !Number.isSafeInteger(
            result
        )
    ) {

        throw new Error(
            `${label} must be a valid whole number.`
        );
    }


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


/* ==========================================================
   FIFO HELPERS
========================================================== */

function batchUnits(batch) {

    return wholeNumber(
        batch?.units ?? 0,
        "FIFO batch units"
    );
}


function batchBuyPrice(batch) {

    return number(
        batch?.buyPrice ?? 0,
        "FIFO batch buy price"
    );
}


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
        ) =>
            total +
            batchUnits(batch),
        0
    );
}


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
                units * buyPrice
            );

        },
        0
    );
}


function calculateUnitBuyPrice(stock) {

    const units =
        totalBatchUnits(stock);


    if (units <= 0) {
        return 0;
    }


    const value =
        calculateFifoValue(stock);


    const result =
        value / units;


    if (
        !Number.isFinite(result) ||
        result < 0
    ) {

        throw new Error(
            "Unable to calculate the unit buy price from FIFO stock."
        );
    }


    return result;
}


function setCalculatedUnitBuyPrice(stock) {

    const unitBuyPrice =
        calculateUnitBuyPrice(
            stock
        );


    stock.unitBuyPrice =
        unitBuyPrice;


    if (
        Object.prototype.hasOwnProperty.call(
            stock.toObject
                ? stock.toObject()
                : stock,
            "buyPrice"
        )
    ) {

        stock.buyPrice =
            unitBuyPrice;
    }


    return unitBuyPrice;
}


function sortFifoBatches(batches) {

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


function productFifoUnits(product) {

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
        ) =>
            total +
            batchUnits(batch),
        0
    );
}


function productFifoValue(product) {

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
                units * buyPrice
            );

        },
        0
    );
}


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