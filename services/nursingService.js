const NursingBatch = require("../models/NursingBatch");
const Cage = require("../models/Cage");
const EggStock = require("../models/EggStock");
const EggCollectionLog = require("../models/EggCollectionLog");
const financeService = require("./financeService");

// =========================
// CREATE BATCH FROM PURCHASE
// =========================
exports.createFromPurchase = async (data) => {
  return await NursingBatch.create({
    ...data,
    source: "purchase",
    available: data.total
  });
};

// =========================
// GET ACTIVE BATCHES
// =========================
exports.getActiveBatches = async () => {
  return await NursingBatch.find({
    status: "active",
    available: { $gt: 0 }
  });
};

// =========================
// GET SINGLE BATCH
// =========================
exports.getBatchById = async (id) => {
  return await NursingBatch.findById(id);
};

// =========================
// RECORD DEATH
// =========================
exports.recordDeath = async ({ batchId, count, cause, user }) => {
  const batch = await NursingBatch.findById(batchId);
  if (!batch) throw new Error("Batch not found");

  count = Number(count);
  if (!count || count <= 0) throw new Error("Invalid death count");

  batch.available -= count;

  batch.deaths.push({
    count,
    cause,
    recordedBy: user._id,
    profileImage: user.profileImage
  });

  if (batch.available <= 0) {
    batch.available = 0;
    batch.status = "depleted";
  }

  await batch.save();
  return batch;
};

// =========================
// SELL POULTRY
// =========================
exports.sellPoultry = async ({ batchId, count, amount, user }) => {
  const batch = await NursingBatch.findById(batchId);
  if (!batch) throw new Error("Batch not found");

  count = Number(count);
  amount = Number(amount);

  if (!count || count <= 0) throw new Error("Invalid sell count");

  if (count > batch.available) {
    throw new Error("Not enough poultry available");
  }

  batch.available -= count;

  if (batch.available <= 0) {
    batch.available = 0;
    batch.status = "depleted";
  }

  await batch.save();

  await financeService.recordPoultrySale({
    amount,
    quantity: count,
    batchId,
    userId: user._id,
    poultryType: batch.poultryType
  });

  return batch;
};

// =========================
// CAGE BATCH (CHICKEN ONLY)
// =========================
exports.cageBatch = async ({ batchId, perCage }) => {
  const batch = await NursingBatch.findById(batchId);
  if (!batch) throw new Error("Batch not found");

  perCage = Number(perCage);
  if (!perCage || perCage <= 0) {
    throw new Error("Invalid perCage value");
  }

  if (batch.poultryType !== "chicken") {
    throw new Error("Only chicken can be caged");
  }

  const cages = Math.ceil(batch.available / perCage);

  for (let i = 0; i < cages; i++) {
    const count =
      i === cages - 1
        ? batch.available - perCage * i
        : perCage;

    await Cage.create({
      cageName: `Cage ${i + 1}`,
      poultryType: "chicken",
      total: count,
      available: count,
      dob: batch.dob
    });
  }

  batch.available = 0;
  batch.status = "caged";

  await batch.save();
  return true;
};

// =========================
// COLLECT EGGS
// =========================
exports.collectEggs = async ({ batchId, eggs, poultryType }) => {
  const batch = await NursingBatch.findById(batchId);
  if (!batch) throw new Error("Batch not found");

  eggs = Number(eggs);
  if (!eggs || eggs <= 0) {
    throw new Error("Invalid egg count");
  }

  if (!poultryType) {
    throw new Error("Poultry type is required");
  }

  if (batch.poultryType !== poultryType) {
    throw new Error("Poultry type mismatch");
  }

  // Update egg stock
  await EggStock.findOneAndUpdate(
    { poultryType },
    { $inc: { totalAvailable: eggs } },
    { upsert: true }
  );

  // Log egg collection for analytics
  await EggCollectionLog.create({
    poultryType,
    quantity: eggs,
    sourceBatch: batch._id,
    collectedBy: null
  });

  return true;
};