const Services = require("../../models/services");


/* =========================================================
   GET ACTIVE SERVICES
========================================================= */

exports.getActiveServices = function () {

    return Services
        .find({
            active: true
        })
        .sort({
            createdAt: 1
        });

};


/* =========================================================
   GET SERVICE BY ID
========================================================= */

exports.getServiceById = function (id) {

    return Services.findById(id);

};


/* =========================================================
   CREATE SERVICE
========================================================= */

exports.createService = function (data) {

    return Services.create({

        name: data.name,

        description: data.description,

        price: data.price,

        duration: data.duration,

        active: data.active !== "false"

    });

};
