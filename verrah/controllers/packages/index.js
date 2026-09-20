// =========================================================
// verrah/controllers/packages/index.js
// VERRAH COSMETICS - PACKAGE CONTROLLER INDEX
// =========================================================

const list = require("./list");
const details = require("./details");
const pay = require("./pay");
const staffList = require("./staffList");
const staffDirectSells = require("./staffDirectSells");
const staffDetails = require("./staffDetails");
const confirm = require("./confirm");
const deliver = require("./deliver");
const recordPayment = require("./recordPayment");
const clear = require("./clear");
const cash = require("./cash");


module.exports = {
  list: list.list,
  details: details.details,
  pay: pay.pay,

  staffList: staffList.staffList,
  staffDirectSells: staffDirectSells.staffDirectSells,
  staffDetails: staffDetails.staffDetails,

  confirm: confirm.confirm,
  deliver: deliver.deliver,
  recordPayment: recordPayment.recordPayment,
  clear: clear.clear,

  markCash: cash.markCash
};