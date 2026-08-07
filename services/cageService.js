const Cage = require("../models/Cage");
const EggStock = require("../models/EggStock");
const EggCollectionLog = require("../models/EggCollectionLog");
const PoultryFinance = require("../models/PoultryFinance");

const POULTRY_TYPE = "chicken";

// =========================
// GET CAGES
// =========================
exports.getCages = async () => {
  return await Cage.find({ available: { $gt: 0 } });
};

// =========================
// GET CAGE
// =========================
exports.getCageById = async (id) => {
  return await Cage.findById(id);
};

// =========================
// COLLECT EGGS (CHICKEN ONLY)
// =========================
exports.collectEggs = async ({ cageId, eggs }) => {
  const cage = await Cage.findById(cageId);
  if (!cage) throw new Error("Cage not found");

  eggs = Number(eggs);
  if (!eggs || eggs <= 0) throw new Error("Invalid eggs value");

  // ALWAYS chicken
  await EggStock.findOneAndUpdate(
    { poultryType: POULTRY_TYPE },
    { $inc: { totalAvailable: eggs } },
    { upsert: true }
  );

  await EggCollectionLog.create({
    poultryType: POULTRY_TYPE,
    quantity: eggs,
    sourceBatch: null,
    collectedBy: null
  });

  cage.eggsAvailable += eggs;
  await cage.save();

  return cage;
};

// =========================
// SELL CHICKEN
// =========================
exports.sellChicken = async ({ cageId, count, amount, user }) => {
  const cage = await Cage.findById(cageId);
  if (!cage) throw new Error("Cage not found");

  count = Number(count);
  amount = Number(amount);

  if (!count || count <= 0) throw new Error("Invalid chicken count");
  if (amount < 0) throw new Error("Invalid amount");

  if (count > cage.available) {
    throw new Error("Not enough chicken available");
  }

  cage.available -= count;

  if (cage.available <= 0) {
    await Cage.findByIdAndDelete(cageId);
  } else {
    await cage.save();
  }

  await PoultryFinance.create({
    category: "poultry_sale",
    poultryType: POULTRY_TYPE,
    amount,
    quantity: count,
    relatedBatch: null,
    recordedBy: user._id
  });

  return true;
};

// =========================
// DEAD CHICKEN (LOSS)
// =========================
exports.recordDeadChicken = async ({ cageId, count }) => {
  const cage = await Cage.findById(cageId);
  if (!cage) throw new Error("Cage not found");

  count = Number(count);
  if (!count || count <= 0) throw new Error("Invalid dead chicken count");

  if (count > cage.available) {
    throw new Error("Dead count exceeds available chicken");
  }

  cage.available -= count;

  if (cage.available <= 0) {
    await Cage.findByIdAndDelete(cageId);
  } else {
    await cage.save();
  }

  return cage;
};