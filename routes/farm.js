const express = require('express');
const router = express.Router();
const farmController = require('../controllers/farmController');

// Form to create a project
router.get('/', farmController.showCreateForm);
router.post('/create', farmController.createProject);

// List of all projects
router.get('/projects', farmController.listProjects);

// Project details page
router.get('/details', farmController.showProjectDetails);

// Mark project as Begun
router.post('/begin', farmController.beginProject);

// Mark project as Completed
router.post('/complete', farmController.completeProject);

// Add additional cost or income
router.post('/add-cost', farmController.addCost);

module.exports = router;