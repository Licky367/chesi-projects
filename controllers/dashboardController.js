// ================================
// DAIRY DASHBOARD
// ================================
exports.getDairyDashboard = (req, res) => {
  res.render("dairyDashboard", {
    title: "Dairy Dashboard",
    user: req.user
  });
};

// ================================
// POULTRY DASHBOARD
// ================================
exports.getPoultryDashboard = (req, res) => {
  res.render("poultryDashboard", {
    title: "Poultry Dashboard",
    user: req.user
  });
};

// ================================
// AGRICULTURE DASHBOARD
// ================================
exports.getAgricultureDashboard = (req, res) => {
  res.render("agricultureDashboard", {
    title: "Agriculture Dashboard",
    user: req.user
  });
};