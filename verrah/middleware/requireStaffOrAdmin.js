// Access control for the staff/admin package-management area.
module.exports = function requireStaffOrAdmin(req, res, next) {
  if (!req.user) return res.redirect('/auth/login');

  if (req.user.role !== 'staff' && req.user.role !== 'admin') {
    return res.status(403).render('error/403', {
      title: 'Access Denied',
      user: req.user,
      error: 'Only staff and administrators can access package management.'
    });
  }

  next();
};
