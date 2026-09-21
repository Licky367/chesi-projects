// ==========================================================
// verrah/services/salesService/staffSales.js
//
// VERRAH COSMETICS
// STAFF SALES / SALES REPORT SERVICE
// ==========================================================

const mongoose = require("mongoose");

const StaffSale =
  require("../../models/staff-sales");

const Substation =
  require("../../models/substations");

const filterService =
  require("./filter");

const VerrahUser =
  mongoose.model("VerrahUser");


// ==========================================================
// SALE SUBSTATION
// ==========================================================

function getSaleSubstation(sale) {

  // --------------------------------------------------------
  // PRIORITY:
  //
  // 1. salesSubstation
  // 2. soldBy.assignedSubstation
  // --------------------------------------------------------

  if (sale.salesSubstation) {
    return sale.salesSubstation;
  }

  if (
    sale.soldBy &&
    sale.soldBy.assignedSubstation
  ) {
    return sale.soldBy.assignedSubstation;
  }

  return null;
}


// ==========================================================
// SALE SUBSTATION ID
// ==========================================================

function getSaleSubstationId(sale) {

  const substation =
    getSaleSubstation(sale);

  if (!substation) {
    return null;
  }

  if (
    typeof substation === "object" &&
    substation._id
  ) {
    return String(substation._id);
  }

  return String(substation);
}


// ==========================================================
// CALCULATE TOTAL
// ==========================================================

function calculateTotal(sales) {

  return sales.reduce(
    (total, sale) =>
      total + Number(sale.totalAmount || 0),
    0
  );
}


// ==========================================================
// GET STAFF IDS FOR SUBSTATION
// ==========================================================

async function getStaffIdsForSubstation(
  substationId
) {

  const staff = await VerrahUser
    .find({
      assignedSubstation: substationId
    })
    .select("_id");

  return staff.map(
    user => user._id
  );
}


// ==========================================================
// BUILD SALES QUERY
// ==========================================================

async function buildSalesQuery(
  filter,
  startDate,
  endDate
) {

  const query = {
    createdAt: {
      $gte: startDate,
      $lte: endDate
    }
  };

  // --------------------------------------------------------
  // SUBSTATION FILTER
  // --------------------------------------------------------

  if (filter.substation) {

    const staffIds =
      await getStaffIdsForSubstation(
        filter.substation
      );

    query.$or = [

      {
        salesSubstation:
          filter.substation
      },

      {
        salesSubstation: {
          $exists: false
        },

        soldBy: {
          $in: staffIds
        }
      }

    ];
  }

  return query;
}


// ==========================================================
// GET SALES FOR RANGE
// ==========================================================

async function getSalesForRange(
  filter,
  startDate,
  endDate
) {

  const query =
    await buildSalesQuery(
      filter,
      startDate,
      endDate
    );

  return StaffSale
    .find(query)

    .select(
      "totalAmount soldBy createdAt products salesName salesSubstation"
    )

    .populate({
      path: "soldBy",
      select:
        "name fullName username assignedSubstation"
    })

    .populate({
      path: "salesSubstation",
      select: "name"
    })

    .sort({
      createdAt: -1
    });
}


// ==========================================================
// CALCULATE SUBSTATION TOTALS
// ==========================================================

function calculateSubstationTotals(
  sales,
  substations
) {

  const totals = {};

  sales.forEach(sale => {

    const substationId =
      getSaleSubstationId(sale);

    if (!substationId) {
      return;
    }

    if (!totals[substationId]) {
      totals[substationId] = 0;
    }

    totals[substationId] +=
      Number(sale.totalAmount || 0);
  });


  return substations
    .map(substation => {

      const id =
        String(substation._id);

      return {
        substation,
        total:
          Number(totals[id] || 0)
      };
    })

    .filter(item =>
      item.total > 0
    );
}


// ==========================================================
// UPDATE DAILY CASH SALES
//
// dailyCashSales is a CUMULATIVE daily total.
//
// It is recalculated from all sales for the day and SET,
// rather than incremented, so refreshing the sales page does
// not double-count the same sales.
// ==========================================================

async function updateDailyCashSales(
  daySales,
  filter,
  substations
) {

  const dailySalesBySubstation = {};


  // --------------------------------------------------------
  // CALCULATE THE CUMULATIVE TOTAL FOR EACH SUBSTATION
  // --------------------------------------------------------

  daySales.forEach(sale => {

    const substationId =
      getSaleSubstationId(sale);

    if (!substationId) {
      return;
    }

    // When a substation filter is active,
    // only update that selected substation.
    if (
      filter.substation &&
      String(filter.substation) !==
        String(substationId)
    ) {
      return;
    }

    if (
      dailySalesBySubstation[substationId] ===
      undefined
    ) {
      dailySalesBySubstation[substationId] = 0;
    }

    dailySalesBySubstation[substationId] +=
      Number(sale.totalAmount || 0);
  });


  // --------------------------------------------------------
  // UPDATE SUBSTATIONS
  // --------------------------------------------------------

  const updates = [];


  for (const substation of substations) {

    const substationId =
      String(substation._id);

    // If a specific substation was selected,
    // update only that substation.
    if (
      filter.substation &&
      String(filter.substation) !==
        substationId
    ) {
      continue;
    }

    const dailyTotal =
      Number(
        dailySalesBySubstation[substationId] || 0
      );


    updates.push(
      Substation.findByIdAndUpdate(
        substation._id,
        {
          $set: {
            dailyCashSales: dailyTotal
          }
        },
        {
          new: true
        }
      )
    );
  }


  await Promise.all(updates);
}


// ==========================================================
// GET STAFF SALES
// ==========================================================

async function getStaffSales(filter) {

  // --------------------------------------------------------
  // LOAD SUBSTATIONS
  // --------------------------------------------------------

  const substations =
    await Substation
      .find()
      .sort({
        name: 1
      });


  // --------------------------------------------------------
  // DISPLAY RANGE
  // --------------------------------------------------------

  const displayRange =
    filterService.getDateRange(
      filter.range
    );


  const sales =
    await getSalesForRange(
      filter,
      displayRange.startDate,
      displayRange.endDate
    );


  // --------------------------------------------------------
  // DAY
  // --------------------------------------------------------

  const dayRange =
    filterService.getDateRange(
      "day"
    );


  const daySales =
    await getSalesForRange(
      filter,
      dayRange.startDate,
      dayRange.endDate
    );


  // --------------------------------------------------------
  // MONTH
  // --------------------------------------------------------

  const monthRange =
    filterService.getDateRange(
      "month"
    );


  const monthSales =
    await getSalesForRange(
      filter,
      monthRange.startDate,
      monthRange.endDate
    );


  // --------------------------------------------------------
  // YEAR
  // --------------------------------------------------------

  const yearRange =
    filterService.getDateRange(
      "year"
    );


  const yearSales =
    await getSalesForRange(
      filter,
      yearRange.startDate,
      yearRange.endDate
    );


  // --------------------------------------------------------
  // UPDATE DAILY CASH SALES
  //
  // This uses the complete day's sales and stores the
  // cumulative total for each substation.
  // --------------------------------------------------------

  await updateDailyCashSales(
    daySales,
    filter,
    substations
  );


  // --------------------------------------------------------
  // TOTALS
  // --------------------------------------------------------

  const totals = {

    day:
      calculateTotal(daySales),

    month:
      calculateTotal(monthSales),

    year:
      calculateTotal(yearSales),

    displayed:
      calculateTotal(sales)
  };


  // --------------------------------------------------------
  // SUBSTATION TOTALS
  // --------------------------------------------------------

  const bySubstation =
    calculateSubstationTotals(
      sales,
      substations
    );


  // --------------------------------------------------------
  // ATTACH TOTALS
  // --------------------------------------------------------

  sales.totals =
    totals;

  sales.bySubstation =
    bySubstation;


  return sales;
}


// ==========================================================
// EXPORT
// ==========================================================

module.exports = {
  getStaffSales,
  getSalesForRange,
  calculateTotal,
  calculateSubstationTotals,
  getSaleSubstation,
  getSaleSubstationId
};