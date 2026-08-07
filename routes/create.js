const express = require("express");
const router = express.Router();

const createController = require("../controllers/createController");

// Render page
router.get("/", createController.renderCreatePage);

// Handle form submission
router.post("/", createController.createInvitation);

module.exports = router;