const updateService = require("../../services/update");


/* ==========================================================
   🟩 VIEW DAIRY PROJECTS
========================================================= */
exports.viewDairyProjects = async (req, res) => {

    try {

        const dairies = await updateService.getPositiveDairies();

        res.render("dairy/dairyProjects/index", {

            title: "Dairy Projects",

            dairies,

            user: req.session.user || null

        });

    } catch (err) {

        console.error(

            "VIEW DAIRY PROJECTS ERROR:",

            err.message

        );

        res
            .status(500)
            .send("Failed to load dairy projects");

    }

};


/* ==========================================================
   🟦 VIEW STRUCTURES
========================================================= */
exports.viewStructures = async (req, res) => {

    try {

        const dairies = await updateService.getNegativeDairies();

        res.render("dairy/structures/index", {

            title: "Structures",

            dairies,

            user: req.session.user || null

        });

    } catch (err) {

        console.error(

            "VIEW STRUCTURES ERROR:",

            err.message

        );

        res
            .status(500)
            .send("Failed to load structures");

    }

};