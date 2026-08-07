const Farm = require('../models/farm');
const FarmFinance = require('../models/farmFinance');

/**
 * Create a new farm project
 */
exports.createProject = async (data) => {
  const project = new Farm(data);
  return await project.save();
};

/**
 * Get all farm projects
 */
exports.getAllProjects = async () => {
  return await Farm.find().sort({ createdAt: -1 });
};

/**
 * Get project by ID
 */
exports.getProjectById = async (id) => {
  return await Farm.findById(id);
};

/**
 * Mark project as Begun
 * Also saves initial cost as Cash Outflow
 */
exports.markProjectBegun = async (id) => {
  const project = await Farm.findById(id);
  if (!project) throw new Error('Project not found');

  project.status = 'Begun';
  await project.save();

  // Save initial cost in farmFinance as outflow
  await FarmFinance.create({
    project: project._id,
    costDescription: 'Initial Cost',
    amount: project.initialCost,
    type: 'outflow', // <-- NEW
  });

  return project;
};

/**
 * Mark project as Completed
 */
exports.markProjectCompleted = async (id) => {
  const project = await Farm.findById(id);
  if (!project) throw new Error('Project not found');
  if (project.status !== 'Begun') throw new Error('Only Begun projects can be completed');

  project.status = 'Completed';
  await project.save();

  return project;
};

/**
 * Add additional cost or income
 */
exports.addAdditionalCost = async (projectId, costDescription, amount, type) => {
  // Validate type
  if (!['inflow', 'outflow'].includes(type)) {
    throw new Error('Invalid type. Must be inflow or outflow');
  }

  return await FarmFinance.create({
    project: projectId,
    costDescription,
    amount,
    type, // <-- NEW
  });
};

/**
 * Get all finance records for a project
 */
exports.getProjectFinance = async (projectId) => {
  return await FarmFinance.find({ project: projectId });
};