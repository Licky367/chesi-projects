const indexService =
    require("../../services/indexService");


/* =========================================================
   ADMIN CHECK
========================================================= */

function requireAdmin(req, res) {

    if (
        !req.user ||
        req.user.role !== "admin"
    ) {

        res.status(403).send("Forbidden");

        return false;
    }

    return true;
}


/* =========================================================
   GET /services/add
========================================================= */

exports.getAddService = function (req, res) {

    if (!requireAdmin(req, res)) {
        return;
    }

    res.render("services/add", {

        title: "Add Service"

    });

};


/* =========================================================
   POST /services/add
========================================================= */

exports.createService = async function (req, res) {

    if (!requireAdmin(req, res)) {
        return;
    }

    try {

        await indexService.createService(
            req.body
        );

        res.redirect("/");

    } catch (error) {

        console.error(
            "CREATE SERVICE ERROR:",
            error
        );

        res.status(500).send(
            "Unable to create service"
        );

    }

};


/* =========================================================
   GET /services/:id
========================================================= */

exports.getService = async function (req, res) {

    try {

        const service =
            await indexService.getServiceById(
                req.params.id
            );

        if (!service) {

            return res.status(404).send(
                "Service not found"
            );

        }

        res.render("services/details", {

            title: service.name,

            service: service

        });

    } catch (error) {

        console.error(
            "GET SERVICE ERROR:",
            error
        );

        res.status(500).send(
            "Internal Server Error"
        );

    }

};


/* =========================================================
   PUT /services/:id
========================================================= */

exports.updateService = async function (req, res) {

    if (!requireAdmin(req, res)) {
        return;
    }

    try {

        const service =
            await indexService.updateService(
                req.params.id,
                req.body
            );

        if (!service) {

            return res.status(404).send(
                "Service not found"
            );

        }

        res.redirect(
            `/services/${service._id}`
        );

    } catch (error) {

        console.error(
            "UPDATE SERVICE ERROR:",
            error
        );

        res.status(500).send(
            "Unable to update service"
        );

    }

};