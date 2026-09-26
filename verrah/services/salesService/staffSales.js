// ==========================================================
// verrah/services/salesService/staffSales.js
//
// VERRAH COSMETICS
// STAFF SALES / SALES REPORT SERVICE
// ==========================================================
//
// SUBSTATION SOURCE:
//
//     StaffSale.salesSubstation
//
// IMPORTANT:
//
//     salesSubstation is the ONLY authoritative substation
//     for staff sales.
//
//     soldBy.assignedSubstation is NOT used for sales records.
//
// BUSINESS TYPE FILTERING:
//
//     STAFF
//         user.assignedSubstation
//              ↓
//         substation.businessType
//              ↓
//         categories.businessType
//              ↓
//         products.category
//
//     ADMIN + SELECTED SUBSTATION
//         filter.substation
//              ↓
//         substation.businessType
//              ↓
//         categories.businessType
//              ↓
//         products.category
//
//     ADMIN + NO SELECTED SUBSTATION
//         Existing category/product logic remains unchanged.
//
// ==========================================================


const StaffSale =
    require("../../models/staff-sales");

const Substation =
    require("../../models/substations");

const Category =
    require("../../models/category");

const Product =
    require("../../models/products");

const substationService =
    require("../substationService");

const filterService =
    require("./filter");


// ==========================================================
// GET SALE SUBSTATION
// ==========================================================
//
// The authoritative source is:
//
//     sale.salesSubstation
//
// No fallback to:
//
//     sale.soldBy.assignedSubstation
//
// ==========================================================

function getSaleSubstation(
    sale
) {

    if (
        !sale ||
        !sale.salesSubstation
    ) {

        return null;

    }


    return sale.salesSubstation;

}


// ==========================================================
// GET SALE SUBSTATION ID
// ==========================================================
//
// Handles both:
//
//     salesSubstation: ObjectId
//
// and populated:
//
//     salesSubstation: {
//         _id,
//         name
//     }
//
// ==========================================================

function getSaleSubstationId(
    sale
) {

    const substation =
        getSaleSubstation(
            sale
        );


    if (!substation) {

        return null;

    }


    if (
        typeof substation === "object" &&
        substation._id
    ) {

        return String(
            substation._id
        );

    }


    return String(
        substation
    );

}


// ==========================================================
// GET USER ROLE
// ==========================================================

function getUserRole(
    user
) {

    if (
        !user
    ) {

        return "";

    }


    return String(
        user.role || ""
    ).toLowerCase();

}


// ==========================================================
// GET ID VALUE
// ==========================================================
//
// Handles:
//
//     ObjectId
//     String
//     populated object
//
// ==========================================================

function getIdValue(
    value
) {

    if (
        !value
    ) {

        return null;

    }


    if (
        typeof value === "object" &&
        value._id
    ) {

        return String(
            value._id
        );

    }


    return String(
        value
    );

}


// ==========================================================
// GET APPLICABLE SUBSTATION ID
// ==========================================================
//
// STAFF:
//
//     user.assignedSubstation
//
// ADMIN:
//
//     filter.substation
//
// ADMIN WITHOUT SELECTED SUBSTATION:
//
//     null
//
// ==========================================================

function getApplicableSubstationId(
    filter,
    user
) {

    const role =
        getUserRole(
            user
        );


    // ======================================================
    // STAFF
    // ======================================================

    if (
        role === "staff"
    ) {

        return getIdValue(
            user.assignedSubstation
        );

    }


    // ======================================================
    // ADMIN WITH SELECTED SUBSTATION
    // ======================================================

    if (
        role === "admin" &&
        filter &&
        filter.substation
    ) {

        return getIdValue(
            filter.substation
        );

    }


    // ======================================================
    // ADMIN WITHOUT SELECTED SUBSTATION
    // ======================================================

    return null;

}


// ==========================================================
// GET APPLICABLE BUSINESS TYPE
// ==========================================================
//
// Returns:
//
//     {
//         id,
//         name
//     }
//
// or null.
//
// ==========================================================

async function getApplicableBusinessType(
    filter,
    user
) {

    const substationId =
        getApplicableSubstationId(
            filter,
            user
        );


    // ======================================================
    // NO BUSINESS-TYPE RESTRICTION
    // ======================================================
    //
    // This preserves the existing admin behaviour when
    // admin has not selected a substation.
    //
    // ======================================================

    if (
        !substationId
    ) {

        return null;

    }


    const substation =
        await Substation.findById(
            substationId
        )

            .select(
                "businessType"
            )

            .lean();


    if (
        !substation ||
        !substation.businessType
    ) {

        return null;

    }


    const businessTypeId =
        substation.businessType.id;


    if (
        !businessTypeId
    ) {

        return null;

    }


    return {

        id:
            businessTypeId,

        name:
            substation.businessType.name || ""

    };

}


// ==========================================================
// GET CATEGORIES AND PRODUCTS
// ==========================================================
//
// STAFF:
//
//     Only categories whose businessType.id matches the
//     assigned substation businessType.id.
//
//     Products are then restricted to those categories.
//
// ADMIN + SELECTED SUBSTATION:
//
//     Same business-type restriction.
//
// ADMIN + NO SELECTED SUBSTATION:
//
//     Existing behaviour:
//
//         all categories
//         all products
//
// ==========================================================

async function getBusinessTypeCatalog(
    filter,
    user
) {

    const businessType =
        await getApplicableBusinessType(
            filter,
            user
        );


    // ======================================================
    // ADMIN WITHOUT SELECTED SUBSTATION
    // ======================================================
    //
    // No business-type restriction.
    //
    // ======================================================

    if (
        !businessType
    ) {

        const [
            categories,
            products
        ] = await Promise.all([

            Category.find({})
                .sort({
                    name: 1
                })
                .lean(),

            Product.find({})
                .sort({
                    name: 1
                })
                .lean()

        ]);


        return {

            businessType:
                null,

            categories,

            products

        };

    }


    // ======================================================
    // FIND CATEGORIES BELONGING TO BUSINESS TYPE
    // ======================================================

    const categories =
        await Category.find({

            "businessType.id":
                businessType.id

        })

            .sort({

                name:
                    1

            })

            .lean();


    // ======================================================
    // GET CATEGORY IDS
    // ======================================================

    const categoryIds =
        categories.map(

            category =>
                category._id

        );


    // ======================================================
    // FIND PRODUCTS WHOSE CATEGORY BELONGS TO THE
    // BUSINESS TYPE
    // ======================================================

    let products = [];


    if (
        categoryIds.length > 0
    ) {

        products =
            await Product.find({

                category: {
                    $in:
                        categoryIds
                }

            })

                .sort({

                    name:
                        1

                })

                .lean();

    }


    // ======================================================
    // RETURN FILTERED CATALOG
    // ======================================================

    return {

        businessType,

        categories,

        products

    };

}


// ==========================================================
// CALCULATE TOTAL
// ==========================================================

function calculateTotal(
    sales
) {

    return sales.reduce(

        (
            total,
            sale
        ) => {

            return total +
                Number(
                    sale.totalAmount || 0
                );

        },

        0

    );

}


// ==========================================================
// BUILD SALES QUERY
// ==========================================================
//
// Substation filtering uses ONLY:
//
//     StaffSale.salesSubstation
//
// There is NO:
//
//     User lookup
//     soldBy.assignedSubstation fallback
//
// ==========================================================

function buildSalesQuery(
    filter,
    startDate,
    endDate
) {

    const query = {

        createdAt: {

            $gte:
                startDate,

            $lt:
                endDate

        }

    };


    // ======================================================
    // SUBSTATION FILTER
    // ======================================================

    if (
        filter &&
        filter.substation
    ) {

        query.salesSubstation =
            filter.substation;

    }


    return query;

}


// ==========================================================
// GET SALES FOR DATE RANGE
// ==========================================================

async function getSalesForRange(
    filter,
    startDate,
    endDate
) {

    const query =
        buildSalesQuery(

            filter,

            startDate,

            endDate

        );


    return StaffSale.find(
        query
    )

        .select(
            "totalAmount soldBy createdAt products salesName salesSubstation"
        )

        .populate({

            path:
                "soldBy",

            select:
                "name fullName username"

        })

        .populate({

            path:
                "salesSubstation",

            select:
                "name"

        })

        .sort({

            createdAt:
                -1

        })

        .lean();

}


// ==========================================================
// CALCULATE TOTALS PER SUBSTATION
// ==========================================================
//
// Uses ONLY:
//
//     sale.salesSubstation
//
// No fallback is used.
//
// ==========================================================

function calculateSubstationTotals(
    sales,
    substations
) {

    const totals =
        new Map();


    // ======================================================
    // GROUP SALES
    // ======================================================

    sales.forEach(

        sale => {

            const substationId =
                getSaleSubstationId(
                    sale
                );


            if (
                !substationId
            ) {

                return;

            }


            const currentTotal =
                totals.get(
                    substationId
                ) || 0;


            totals.set(

                substationId,

                currentTotal +
                    Number(
                        sale.totalAmount || 0
                    )

            );

        }

    );


    // ======================================================
    // ATTACH SUBSTATION NAMES
    // ======================================================

    return substations

        .map(

            substation => {

                const substationId =
                    String(
                        substation._id
                    );


                return {

                    substationId:
                        substation._id,

                    substationName:
                        substation.name,

                    total:
                        Number(
                            totals.get(
                                substationId
                            ) || 0
                        )

                };

            }

        )

        .filter(

            item =>
                item.total > 0

        );

}


// ==========================================================
// UPDATE DAILY CASH SALES
// ==========================================================
//
// DATABASE UPDATE ONLY.
//
// For each substation:
//
//     dailyCashSales = [
//         {
//             _id: auto-generated,
//             amount: cumulative sales for the day,
//             date: selected day,
//             isDeposited: existing value / false for new record
//         }
//     ]
//
// The frontend sales data is NOT modified.
//
// Existing daily records are preserved. Only the amount for
// the matching date is updated.
//
// ==========================================================

async function updateDailyCashSales(
    daySales,
    filter,
    substations
) {

    const dailySalesBySubstation =
        new Map();


    // ======================================================
    // CALCULATE CUMULATIVE DAY TOTAL PER SUBSTATION
    // ======================================================

    daySales.forEach(

        sale => {

            const substationId =
                getSaleSubstationId(
                    sale
                );


            if (
                !substationId
            ) {

                return;

            }


            const currentTotal =
                dailySalesBySubstation.get(
                    substationId
                ) || 0;


            dailySalesBySubstation.set(

                substationId,

                currentTotal +
                    Number(
                        sale.totalAmount || 0
                    )

            );

        }

    );


    // ======================================================
    // DETERMINE SUBSTATIONS TO UPDATE
    // ======================================================

    let substationsToUpdate =
        substations;


    if (
        filter &&
        filter.substation
    ) {

        const selectedId =
            String(
                filter.substation
            );


        substationsToUpdate =
            substations.filter(

                substation =>
                    String(
                        substation._id
                    ) === selectedId

            );

    }


    // ======================================================
    // UPDATE DATABASE ONLY
    // ======================================================

    await Promise.all(

        substationsToUpdate.map(

            async substation => {

                const substationId =
                    String(
                        substation._id
                    );


                const amount =
                    Number(
                        dailySalesBySubstation.get(
                            substationId
                        ) || 0
                    );


                const existingSubstation =
                    await Substation.findById(
                        substation._id
                    );


                if (
                    !existingSubstation
                ) {

                    return;

                }


                // ==================================================
                // USE THE DATE OF THE SELECTED DAY
                // ==================================================

                const selectedDate =
                    filter &&
                    filter.date
                        ? new Date(
                            filter.date
                        )
                        : new Date();


                selectedDate.setHours(
                    0,
                    0,
                    0,
                    0
                );


                // ==================================================
                // FIND EXISTING RECORD FOR THIS DAY
                // ==================================================

                const existingDailySale =
                    existingSubstation.dailyCashSales.find(

                        dailySale => {

                            const dailyDate =
                                new Date(
                                    dailySale.date
                                );

                            dailyDate.setHours(
                                0,
                                0,
                                0,
                                0
                            );

                            return (
                                dailyDate.getTime() ===
                                selectedDate.getTime()
                            );

                        }

                    );


                if (
                    existingDailySale
                ) {

                    // ----------------------------------------------
                    // UPDATE ONLY THE CUMULATIVE AMOUNT.
                    //
                    // _id remains unchanged.
                    // isDeposited remains unchanged.
                    // ----------------------------------------------

                    existingDailySale.amount =
                        amount;

                } else {

                    // ----------------------------------------------
                    // CREATE ONE DAILY RECORD.
                    //
                    // Mongoose automatically generates _id.
                    // ----------------------------------------------

                    existingSubstation.dailyCashSales.push({

                        amount:
                            amount,

                        date:
                            selectedDate,

                        isDeposited:
                            false

                    });

                }


                // ==================================================
                // SAVE ONLY THE SUBSTATION DOCUMENT
                // ==================================================

                await existingSubstation.save();

            }

        )

    );

}


// ==========================================================
// GET STAFF SALES
// ==========================================================

async function getStaffSales(
    filter,
    user = {}
) {

    // ======================================================
    // LOAD SUBSTATIONS
    // ======================================================

    const substations =
        await substationService.list();


    // ======================================================
    // FETCH BUSINESS-TYPE FILTERED CATALOG
    // ======================================================
    //
    // This is independent of StaffSale filtering.
    //
    // Staff:
    //     assignedSubstation businessType
    //
    // Admin + selected substation:
    //     selected substation businessType
    //
    // Admin + no selected substation:
    //     existing behaviour
    //
    // ======================================================

    const catalog =
        await getBusinessTypeCatalog(
            filter,
            user
        );


    // ======================================================
    // FETCH DISPLAY SALES
    // ======================================================

    const salesQuery =
        buildSalesQuery(

            filter,

            filter.startDate,

            filter.endDate

        );


    const sales =
        await StaffSale.find(
            salesQuery
        )

            .populate({

                path:
                    "soldBy",

                select:
                    "name fullName username"

            })

            .populate({

                path:
                    "salesSubstation",

                select:
                    "name"

            })

            .sort({

                createdAt:
                    -1

            })

            .lean();


    // ======================================================
    // DATE RANGES
    // ======================================================

    const dayRange =
        filterService.getDateRange(

            filter.date,

            "day"

        );


    const monthRange =
        filterService.getDateRange(

            filter.date,

            "month"

        );


    const yearRange =
        filterService.getDateRange(

            filter.date,

            "year"

        );


    // ======================================================
    // FETCH PERIOD TOTALS
    // ======================================================

    const [

        daySales,

        monthSales,

        yearSales

    ] = await Promise.all([

        getSalesForRange(

            filter,

            dayRange.startDate,

            dayRange.endDate

        ),

        getSalesForRange(

            filter,

            monthRange.startDate,

            monthRange.endDate

        ),

        getSalesForRange(

            filter,

            yearRange.startDate,

            yearRange.endDate

        )

    ]);


    // ======================================================
    // UPDATE DAILY CASH SALES
    // ======================================================
    //
    // Only the "day" period is used here.
    //
    // The same salesSubstation source is used throughout.
    //
    // ======================================================

    await updateDailyCashSales(

        daySales,

        filter,

        substations

    );


    // ======================================================
    // CALCULATE TOTALS
    // ======================================================

    const totals = {

        day:
            calculateTotal(
                daySales
            ),

        month:
            calculateTotal(
                monthSales
            ),

        year:
            calculateTotal(
                yearSales
            ),

        bySubstation: {

            day:
                calculateSubstationTotals(
                    daySales,
                    substations
                ),

            month:
                calculateSubstationTotals(
                    monthSales,
                    substations
                ),

            year:
                calculateSubstationTotals(
                    yearSales,
                    substations
                )

        }

    };


    // ======================================================
    // ATTACH TOTALS
    // ======================================================

    sales.totals =
        totals;


    // ======================================================
    // ATTACH BUSINESS TYPE
    // ======================================================

    sales.businessType =
        catalog.businessType;


    // ======================================================
    // ATTACH FILTERED CATEGORIES
    // ======================================================

    sales.categories =
        catalog.categories;


    // ======================================================
    // ATTACH FILTERED PRODUCTS
    // ======================================================

    sales.products =
        catalog.products;


    // ======================================================
    // RETURN
    // ======================================================

    return sales;

}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    getStaffSales

};