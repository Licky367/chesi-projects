const indexService = require("../../services/indexService");

/* =========================================================
   GET HOME PAGE
========================================================= */

exports.getHome = async function (req, res) {

    try {

        const services =
            await indexService.getActiveServices();

        res.render("index", {

            title: "VERAH COSMETICS",

            services: services

        });

    } catch (error) {

        console.error("GET HOME ERROR:", error);

        res.status(500).send("Internal Server Error");

    }

};
