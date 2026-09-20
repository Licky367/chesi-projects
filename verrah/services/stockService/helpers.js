const mongoose = require("mongoose");

function text(value) {
  return String(value ?? "").trim();
}

function cleanSubcategory(value) {
  return text(value).toLowerCase();
}

function displayLabel(value) {
  const raw = text(value);
  if (!raw) return "";

  return raw
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function productNameFromStock(stock) {
  const categoryName =
    stock.categoryName ||
    (stock.category && stock.category.name) ||
    "";

  const subcategory = stock.subcategory || "";

  return [displayLabel(categoryName), displayLabel(subcategory)]
    .filter(Boolean)
    .join(" ");
}

function fifoDate(batch) {
  const value =
    batch?.purchaseDate ||
    batch?.date ||
    batch?.createdAt ||
    batch?.updatedAt;

  const date = value ? new Date(value) : new Date(0);

  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

function number(value, fieldName = "Value", allowZero = false) {
  const n = Number(value);

  if (!Number.isFinite(n) || (!allowZero && n <= 0) || (allowZero && n < 0)) {
    throw new Error(`${fieldName} must be a valid number.`);
  }

  return n;
}

function wholeNumber(value, fieldName = "Value", allowZero = false) {
  const n = number(value, fieldName, allowZero);

  if (!Number.isInteger(n)) {
    throw new Error(`${fieldName} must be a whole number.`);
  }

  return n;
}

function batchUnits(batch) {
  return Math.max(0, Number(batch?.units) || 0);
}

function batchBuyPrice(batch) {
  const value =
    batch?.buyPrice ??
    batch?.unitBuyPrice ??
    batch?.price ??
    0;

  return Math.max(0, Number(value) || 0);
}

function totalBatchUnits(batches = []) {
  return batches.reduce((sum, batch) => sum + batchUnits(batch), 0);
}

function calculateFifoValue(batches = []) {
  return batches.reduce(
    (sum, batch) => sum + batchUnits(batch) * batchBuyPrice(batch),
    0
  );
}

function calculateUnitBuyPrice(batches = []) {
  const units = totalBatchUnits(batches);
  if (units <= 0) return 0;

  return calculateFifoValue(batches) / units;
}

function setCalculatedUnitBuyPrice(stock) {
  stock.unitBuyPrice = calculateUnitBuyPrice(stock.purchaseBatches || []);
  return stock;
}

function sortFifoBatches(batches = []) {
  return [...batches].sort((a, b) => {
    const dateDifference = fifoDate(a).getTime() - fifoDate(b).getTime();

    if (dateDifference !== 0) return dateDifference;

    const aId = String(a?._id || "");
    const bId = String(b?._id || "");

    return aId.localeCompare(bId);
  });
}

module.exports = {
  mongoose,
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
  sortFifoBatches
};
