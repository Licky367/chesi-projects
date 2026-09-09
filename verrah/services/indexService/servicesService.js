const Services =
    require("../../models/services");


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

        image: data.image || "",

        active: data.active !== "false"

    });

};


/* =========================================================
   UPDATE SERVICE
========================================================= */

exports.updateService = async function (
    id,
    data
) {

    const service =
        await Services.findById(id);

    if (!service) {
        return null;
    }


    /* -----------------------------------------------------
       UPDATE BASIC INFORMATION
    ----------------------------------------------------- */

    service.name =
        data.name;

    service.description =
        data.description;

    service.price =
        data.price;

    service.duration =
        data.duration;


    /* -----------------------------------------------------
       IMAGE
       
       Only replace the existing image when a new
       image URL has been provided.
    ----------------------------------------------------- */

    if (
        data.image !== undefined &&
        data.image !== null &&
        String(data.image).trim() !== ""
    ) {

        service.image =
            String(data.image).trim();

    }


    /* -----------------------------------------------------
       ACTIVE STATUS
    ----------------------------------------------------- */

    service.active =
        data.active !== "false";


    /* -----------------------------------------------------
       SAVE
    ----------------------------------------------------- */

    return service.save();

};