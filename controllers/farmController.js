const farmService = require('../services/farmService');

/**
 * Show form to create new project
 */
exports.showCreateForm = (req, res) => {
  res.render('farm', { title: 'Create Farm Project' });
};

/**
 * Create a new project
 */
exports.createProject = async (req, res) => {
  try {
    await farmService.createProject(req.body);
    res.redirect('/farm/projects');
  } catch (err) {
    res.status(500).send(err.message);
  }
};

/**
 * List all projects
 */
exports.listProjects = async (req, res) => {
  const projects = await farmService.getAllProjects();
  res.render('farmProjects', { title: 'Farm Projects', projects });
};

/**
 * Show project details along with finances
 */
exports.showProjectDetails = async (req, res) => {
  const project = await farmService.getProjectById(req.query.id);
  if (!project) return res.status(404).send('Project not found');

  const finances = await farmService.getProjectFinance(project._id);
  res.render('farmDetails', { title: 'Project Details', project, finances });
};

/**
 * Mark project as Begun
 */
exports.beginProject = async (req, res) => {
  try {
    const project = await farmService.markProjectBegun(req.body.id);
    res.redirect(`/farm/details?id=${project._id}`);
  } catch (err) {
    res.status(500).send(err.message);
  }
};

/**
 * Mark project as Completed
 */
exports.completeProject = async (req, res) => {
  try {
    const project = await farmService.markProjectCompleted(req.body.id);
    res.redirect(`/farm/details?id=${project._id}`);
  } catch (err) {
    res.status(500).send(err.message);
  }
};

/**
 * Add additional cost or income
 */
exports.addCost = async (req, res) => {
  try {
    const { projectId, costDescription, amount, type } = req.body;
    await farmService.addAdditionalCost(projectId, costDescription, Number(amount), type);
    res.redirect(`/farm/details?id=${projectId}`);
  } catch (err) {
    res.status(500).send(err.message);
  }
};