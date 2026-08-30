const packageService = require('../services/packageService');
const paymentService = require('../services/paymentService');

exports.list = async (req, res) => {
  try {
    const packages = await packageService.getUserPackages(req);
    res.render('packages/packages', {
      title: 'My Packages | CoreVester',
      packages,
      error: null
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('packages/packages', {
      title: 'My Packages | CoreVester',
      packages: [],
      error: 'Unable to load your packages.'
    });
  }
};

exports.details = async (req, res) => {
  try {
    const packageDoc = await packageService.getUserPackage(req, req.params.id);
    if (!packageDoc) {
      return res.status(404).render('packages/package-details', {
        title: 'Package not found | CoreVester',
        packageDoc: null,
        error: 'Package not found.'
      });
    }
    res.render('packages/package-details', {
      title: `Package ${String(packageDoc._id).slice(-8)} | CoreVester`,
      packageDoc,
      error: req.query.error || null
    });
  } catch (err) {
    console.error(err);
    res.status(404).redirect('/packages');
  }
};

exports.pay = async (req, res) => {
  try {
    const result = await paymentService.initiatePackageStkPush(req, req.params.id, req.body.phoneNumber);
    return res.redirect(`/carts/payment/${result.paymentId}`);
  } catch (err) {
    console.error('Package M-Pesa payment error:', err);
    return res.redirect(`/packages/${req.params.id}?error=${encodeURIComponent(err.message)}`);
  }
};

exports.staffList = async (req, res) => {
  const status = String(req.query.status || 'all').toLowerCase();
  try {
    const result = await packageService.getStaffPackages(req, status);
    res.render('packages/staff', {
      title: 'Package Management | CoreVester',
      packages: result.packages,
      status: ['all', 'pending', 'confirmed', 'delivered'].includes(status) ? status : 'all',
      role: req.user.role,
      counts: result.counts,
      error: req.query.error || null,
      success: req.query.success || null
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('packages/staff', {
      title: 'Package Management | CoreVester',
      packages: [],
      status: ['all', 'pending', 'confirmed', 'delivered'].includes(status) ? status : 'all',
      role: req.user.role,
      counts: { all: 0, pending: 0, confirmed: 0, delivered: 0 },
      error: err.message,
      success: null
    });
  }
};

exports.staffDetails = async (req, res) => {
  try {
    const packageDoc = await packageService.getStaffPackage(req, req.params.id);
    if (!packageDoc) {
      return res.status(404).render('packages/staff-details', {
        title: 'Package not found | CoreVester',
        packageDoc: null,
        role: req.user.role,
        error: 'Package not found or not assigned to you.'
      });
    }
    res.render('packages/staff-details', {
      title: `Package ${String(packageDoc._id).slice(-8)} | Package Management`,
      packageDoc,
      role: req.user.role,
      error: req.query.error || null,
      success: req.query.success || null
    });
  } catch (err) {
    console.error(err);
    res.status(404).redirect('/packages/staff');
  }
};

exports.confirm = async (req, res) => {
  try {
    await packageService.confirmPackage(req, req.params.id);
    return res.redirect(`/packages/staff/${req.params.id}?success=${encodeURIComponent('Package confirmed and assigned to you.')}`);
  } catch (err) {
    console.error(err);
    return res.redirect(`/packages/staff/${req.params.id}?error=${encodeURIComponent(err.message)}`);
  }
};

exports.deliver = async (req, res) => {
  try {
    await packageService.deliverPackage(req, req.params.id);
    return res.redirect(`/packages/staff/${req.params.id}?success=${encodeURIComponent('Package marked as delivered and the substation delivery ledger was updated.')}`);
  } catch (err) {
    console.error(err);
    return res.redirect(`/packages/staff/${req.params.id}?error=${encodeURIComponent(err.message)}`);
  }
};

exports.recordPayment = async (req, res) => {
  try {
    await packageService.recordPayment(req, req.params.id, req.body.amountPaid);
    return res.redirect(`/packages/staff/${req.params.id}?success=${encodeURIComponent('Amount paid updated.')}`);
  } catch (err) {
    console.error(err);
    return res.redirect(`/packages/staff/${req.params.id}?error=${encodeURIComponent(err.message)}`);
  }
};
