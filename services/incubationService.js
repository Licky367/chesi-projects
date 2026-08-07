const Incubation = require("../models/Incubation");
const NursingBatch = require("../models/NursingBatch");

exports.createIncubation = async (data) => {
  return await Incubation.create(data);
};

exports.getActiveIncubations = async () => {
  return await Incubation.find({ status: "active" });
};

exports.endIncubation = async ({ id, successfulHatches }) => {
  const incubation = await Incubation.findById(id);

  if (!incubation) throw new Error("Incubation not found");

  incubation.status = "completed";
  incubation.successfulHatches = successfulHatches;
  incubation.endDate = new Date();
  incubation.dob = incubation.endDate;

  await incubation.save();

  // Move to nursing
  if (successfulHatches > 0) {
    await NursingBatch.create({
      groupName: incubation.groupName,
      poultryType: incubation.poultryType,
      source: "incubation",
      total: successfulHatches,
      available: successfulHatches,
      dob: incubation.dob
    });
  }

  return incubation;
};