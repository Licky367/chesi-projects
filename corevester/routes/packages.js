const express = require('express');
const router = express.Router();

const controller = require('../controllers/packages');
const requireLogin = require('../middleware/requireLogin');
const requireStaff = require('../middleware/requireStaff');
const requireStaffOrAdmin = requireStaff;

// IMPORTANT: staff routes must be declared before /:id.
router.get('/staff', requireStaffOrAdmin, controller.staffList);
router.get('/staff/:id', requireStaffOrAdmin, controller.staffDetails);
router.post('/staff/:id/confirm', requireStaff, controller.confirm);
router.post('/staff/:id/deliver', requireStaff, controller.deliver);
router.post('/staff/:id/payment', requireStaffOrAdmin, controller.recordPayment);

// Client package history remains user-scoped.
router.get('/', requireLogin, controller.list);
router.get('/:id', requireLogin, controller.details);
router.post('/:id/pay', requireLogin, controller.pay);

module.exports = router;
