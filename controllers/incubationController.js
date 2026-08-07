const incubationService = require("../services/incubationService");

exports.renderIncubationPage = async (req, res) => {
  const incubations = await incubationService.getActiveIncubations();

  res.render("incubation/index", { incubations });
};

exports.createIncubation = async (req, res) => {
  try {
    await incubationService.createIncubation(req.body);
    res.redirect("/incubation");
  } catch (err) {
    res.send(err.message);
  }
};

exports.endIncubation = async (req, res) => {
  try {
    const { id } = req.params;
    const { successfulHatches } = req.body;

    await incubationService.endIncubation({
      id,
      successfulHatches
    });

    res.redirect("/incubation");
  } catch (err) {
    res.send(err.message);
  }
};