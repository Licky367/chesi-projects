// =========================================================
// verrah/services/packageService.js
//
// VERRAH COSMETICS
// PACKAGE SERVICE
//
// FACADE / PUBLIC API
//
// The package logic is split into smaller service files.
// Existing controllers can continue requiring:
//
//     require("../services/packageService")
//
// without changing their imports.
// =========================================================

const {
  getPaymentStatus,
  getConfirmedPaymentTotal
} = require("./packageHelpers");

const {
  createPackageFromCart,
  createPackageFromPayment
} = require("./packageCreationService");

const {
  getUserPackages,
  getUserPackage
} = require("./packageCustomerService");

const {
  getStaffPackages,
  getStaffPackage,
  confirmPackage
} = require("./packageStaffService");

const {
  deliverPackage
} = require("./packageDeliveryService");

const {
  recordPayment,
  confirmPackagePayment,
  releasePaymentReservation
} = require("./packagePaymentService");


// =========================================================
// PUBLIC EXPORTS
// =========================================================
//
// This preserves the original packageService.js API.
// Controllers do not need to know that the implementation
// is now split across multiple files.
// =========================================================

module.exports = {
  getPaymentStatus,
  getConfirmedPaymentTotal,

  createPackageFromCart,
  createPackageFromPayment,

  getUserPackages,
  getUserPackage,

  getStaffPackages,
  getStaffPackage,

  confirmPackage,
  deliverPackage,

  recordPayment,
  confirmPackagePayment,

  releasePaymentReservation
};
