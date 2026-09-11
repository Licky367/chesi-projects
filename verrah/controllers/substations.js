// ==========================================================
// verrah/controllers/substations.js
// SUBSTATION CONTROLLER
// ==========================================================

const service =
  require("../services/substationService");


// ==========================================================
// HELPERS
// ==========================================================

function getRole(req) {
  return String(
    req.user?.role || ""
  ).toLowerCase();
}


// ----------------------------------------------------------
// NORMALIZE PHONE NUMBER
// ----------------------------------------------------------

function normalizePhoneNumber(value) {

  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ""
  ) {
    return null;
  }

  const cleaned =
    String(value)
      .trim()
      .replace(/[^\d+]/g, "");

  if (!cleaned) {
    return null;
  }

  const number =
    Number(cleaned);

  return Number.isFinite(number)
    ? number
    : null;
}


// ----------------------------------------------------------
// NORMALIZE GPS COORDINATE
// ----------------------------------------------------------

function normalizeCoordinate(
  value,
  min,
  max
) {

  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ""
  ) {
    return null;
  }

  const number =
    Number(value);

  if (
    !Number.isFinite(number) ||
    number < min ||
    number > max
  ) {
    throw new Error(
      `Invalid GPS coordinate. Value must be between ${min} and ${max}.`
    );
  }

  return number;
}


// ----------------------------------------------------------
// BUILD SUBSTATION DATA
// ----------------------------------------------------------

function buildSubstationData(
  req,
  existingSubstation = null
) {

  const body =
    req.body || {};

  const data = {
    name:
      body.name,

    location:
      body.location || "",

    phoneNumber:
      normalizePhoneNumber(
        body.phoneNumber
      ),

    directions:
      body.directions || "",

    description:
      body.description || "",

    gps: {
      latitude:
        normalizeCoordinate(
          body.latitude,
          -90,
          90
        ),

      longitude:
        normalizeCoordinate(
          body.longitude,
          -180,
          180
        )
    }
  };


  // --------------------------------------------------------
  // ICON
  // --------------------------------------------------------

  /*
   * Uploaded image takes priority over URL.
   *
   * If editing and neither a new upload nor URL is supplied,
   * keep the existing icon.
   */

  if (req.file) {

    data.substationIcon =
      `/uploads/substations/${req.file.filename}`;

  } else if (
    body.substationIconUrl &&
    String(
      body.substationIconUrl
    ).trim()
  ) {

    data.substationIcon =
      String(
        body.substationIconUrl
      ).trim();

  } else if (
    existingSubstation &&
    existingSubstation.substationIcon
  ) {

    data.substationIcon =
      existingSubstation.substationIcon;
  }


  return data;
}


// ==========================================================
// LIST SUBSTATIONS
// ==========================================================

exports.list = async (
  req,
  res
) => {

  try {

    res.render(
      "substations/index",
      {
        title:
          "Substations",

        substations:
          await service.list(),

        error:
          req.query.error || null,

        saved:
          req.query.saved || "",

        user:
          req.user
      }
    );

  } catch (e) {

    console.error(
      "SUBSTATION LIST ERROR:",
      e
    );

    res.status(500).render(
      "substations/index",
      {
        title:
          "Substations",

        substations: [],

        error:
          e.message,

        saved: "",

        user:
          req.user
      }
    );
  }
};


// ==========================================================
// NEW SUBSTATION FORM
// ==========================================================

exports.newForm = (
  req,
  res
) => {

  res.render(
    "substations/new",
    {
      title:
        "New Substation",

      error:
        null,

      old: {},

      user:
        req.user
    }
  );
};


// ==========================================================
// CREATE SUBSTATION
// ==========================================================

exports.create = async (
  req,
  res
) => {

  try {

    const data =
      buildSubstationData(req);


    await service.create(
      data
    );


    return res.redirect(
      "/substations?saved=1"
    );

  } catch (e) {

    console.error(
      "CREATE SUBSTATION ERROR:",
      e
    );

    /*
     * Rebuild the form data so that fields such as GPS,
     * phone number and directions are not lost after an error.
     */

    let old = {
      ...(req.body || {})
    };


    if (req.file) {

      old.substationIcon =
        `/uploads/substations/${req.file.filename}`;
    }


    return res.status(400).render(
      "substations/new",
      {
        title:
          "New Substation",

        error:
          e.message,

        old,

        user:
          req.user
      }
    );
  }
};


// ==========================================================
// SUBSTATION DETAIL
// ==========================================================

exports.detail = async (
  req,
  res
) => {

  try {

    const substation =
      await service.getWithProducts(
        req.params.id
      );


    if (!substation) {

      return res.redirect(
        "/substations?error=Substation+not+found"
      );
    }


    return res.render(
      "substations/detail",
      {
        title:
          substation.name,

        substation,

        user:
          req.user
      }
    );

  } catch (e) {

    console.error(
      "SUBSTATION DETAIL ERROR:",
      e
    );

    return res.redirect(
      `/substations?error=${encodeURIComponent(
        e.message
      )}`
    );
  }
};


// ==========================================================
// PRODUCT DETAIL
// ==========================================================

exports.productDetail =
async (
  req,
  res
) => {

  try {

    const product =
      await service.getProduct(
        req.params.id
      );


    if (!product) {

      return res.redirect(
        "/substations?error=Product+not+found"
      );
    }


    return res.render(
      "substations/product-detail",
      {
        title:
          product.name,

        product,

        role:
          getRole(req),

        error:
          req.query.error || null,

        success:
          req.query.success || null,

        user:
          req.user
      }
    );

  } catch (e) {

    console.error(
      "PRODUCT DETAIL ERROR:",
      e
    );

    return res.redirect(
      `/substations?error=${encodeURIComponent(
        e.message
      )}`
    );
  }
};


// ==========================================================
// UPDATE PRODUCT UNITS
// ==========================================================

exports.updateProductUnits =
async (
  req,
  res
) => {

  try {

    if (
      getRole(req) !== "admin"
    ) {

      throw new Error(
        "Admin access required."
      );
    }


    await service.updateProductUnits(
      req.params.id,
      req.body
    );


    return res.redirect(
      `/substations/product/${req.params.id}?success=${encodeURIComponent(
        "Product units updated successfully."
      )}`
    );

  } catch (e) {

    console.error(
      "UPDATE PRODUCT UNITS ERROR:",
      e
    );


    return res.redirect(
      `/substations/product/${req.params.id}?error=${encodeURIComponent(
        e.message
      )}`
    );
  }
};


// ==========================================================
// EDIT SUBSTATION
// ==========================================================

exports.editForm =
async (
  req,
  res
) => {

  try {

    const substation =
      await service.getById(
        req.params.id
      );


    if (!substation) {

      return res.redirect(
        "/substations?error=Substation+not+found"
      );
    }


    return res.render(
      "substations/new",
      {
        title:
          "Edit Substation",

        substation,

        error:
          null,

        old: {},

        user:
          req.user
      }
    );

  } catch (e) {

    console.error(
      "EDIT SUBSTATION ERROR:",
      e
    );


    return res.redirect(
      `/substations?error=${encodeURIComponent(
        e.message
      )}`
    );
  }
};


// ==========================================================
// UPDATE SUBSTATION
// ==========================================================

exports.update =
async (
  req,
  res
) => {

  try {

    const existingSubstation =
      await service.getById(
        req.params.id
      );


    if (!existingSubstation) {

      throw new Error(
        "Substation not found."
      );
    }


    const data =
      buildSubstationData(
        req,
        existingSubstation
      );


    await service.update(
      req.params.id,
      data
    );


    return res.redirect(
      `/substations/branch/${req.params.id}/edit?saved=1`
    );

  } catch (e) {

    console.error(
      "UPDATE SUBSTATION ERROR:",
      e
    );


    /*
     * Preserve the user's submitted values when the update
     * fails validation.
     */

    const substation = {
      ...(req.body || {}),

      _id:
        req.params.id
    };


    /*
     * Keep the existing icon available when no new icon
     * was uploaded.
     */

    try {

      const existing =
        await service.getById(
          req.params.id
        );


      if (
        existing &&
        existing.substationIcon &&
        !req.file &&
        !req.body?.substationIconUrl
      ) {

        substation.substationIcon =
          existing.substationIcon;
      }

    } catch (iconError) {

      console.error(
        "LOAD EXISTING ICON ERROR:",
        iconError
      );
    }


    if (req.file) {

      substation.substationIcon =
        `/uploads/substations/${req.file.filename}`;
    }


    return res.status(400).render(
      "substations/new",
      {
        title:
          "Edit Substation",

        substation,

        error:
          e.message,

        old:
          req.body || {},

        user:
          req.user
      }
    );
  }
};


// ==========================================================
// EDIT ICON FORM
// ==========================================================

exports.editIconForm =
async (
  req,
  res
) => {

  try {

    const substation =
      await service.getById(
        req.params.id
      );


    if (!substation) {

      return res.redirect(
        "/substations?error=Substation+not+found"
      );
    }


    return res.render(
      "branch-partials/icon",
      {
        title:
          `Edit Icon - ${substation.name}`,

        substation,

        editMode:
          true,

        error:
          req.query.error || null,

        success:
          req.query.success || null,

        user:
          req.user
      }
    );

  } catch (e) {

    console.error(
      "EDIT ICON FORM ERROR:",
      e
    );


    return res.redirect(
      `/substations?error=${encodeURIComponent(
        e.message
      )}`
    );
  }
};


// ==========================================================
// UPDATE ICON
// ==========================================================

exports.updateIcon =
async (
  req,
  res
) => {

  try {

    if (
      getRole(req) !== "admin"
    ) {

      throw new Error(
        "Admin access required."
      );
    }


    const substation =
      await service.getById(
        req.params.id
      );


    if (!substation) {

      throw new Error(
        "Substation not found."
      );
    }


    /*
     * Dedicated icon management requires an uploaded
     * image.
     */

    if (!req.file) {

      return res.redirect(
        `/substations/branch/icon/${req.params.id}?error=${encodeURIComponent(
          "Please select an icon image."
        )}`
      );
    }


    const imagePath =
      `/uploads/substations/${req.file.filename}`;


    await service.updateIcon(
      req.params.id,
      imagePath
    );


    return res.redirect(
      `/substations/branch/icon/${req.params.id}?success=${encodeURIComponent(
        "Substation icon updated successfully."
      )}`
    );

  } catch (e) {

    console.error(
      "UPDATE ICON ERROR:",
      e
    );


    return res.redirect(
      `/substations/branch/icon/${req.params.id}?error=${encodeURIComponent(
        e.message
      )}`
    );
  }
};


// ==========================================================
// EDIT IMAGES FORM
// ==========================================================

exports.editImagesForm =
async (
  req,
  res
) => {

  try {

    const substation =
      await service.getById(
        req.params.id
      );


    if (!substation) {

      return res.redirect(
        "/substations?error=Substation+not+found"
      );
    }


    return res.render(
      "branch-partials/images",
      {
        title:
          `Manage Images - ${substation.name}`,

        substation,

        editMode:
          true,

        error:
          req.query.error || null,

        success:
          req.query.success || null,

        user:
          req.user
      }
    );

  } catch (e) {

    console.error(
      "EDIT IMAGES FORM ERROR:",
      e
    );


    return res.redirect(
      `/substations?error=${encodeURIComponent(
        e.message
      )}`
    );
  }
};


// ==========================================================
// UPDATE IMAGES
// ==========================================================

exports.updateImages =
async (
  req,
  res
) => {

  try {

    if (
      getRole(req) !== "admin"
    ) {

      throw new Error(
        "Admin access required."
      );
    }


    const substation =
      await service.getById(
        req.params.id
      );


    if (!substation) {

      throw new Error(
        "Substation not found."
      );
    }


    // ------------------------------------------------------
    // EXISTING IMAGES TO KEEP
    // ------------------------------------------------------

    let keepImages =
      req.body.keepImages || [];


    if (
      !Array.isArray(
        keepImages
      )
    ) {

      keepImages =
        [keepImages];
    }


    const existingImages =
      Array.isArray(
        substation.images
      )
        ? substation.images
        : [];


    keepImages =
      keepImages.filter(
        image =>
          existingImages.includes(
            image
          )
      );


    // ------------------------------------------------------
    // NEWLY UPLOADED IMAGES
    // ------------------------------------------------------

    const uploadedImages =
      Array.isArray(
        req.files
      )
        ? req.files
            .map(
              file =>
                `/uploads/substations/${file.filename}`
            )
        : [];


    // ------------------------------------------------------
    // FINAL IMAGE LIST
    // ------------------------------------------------------

    const images = [
      ...keepImages,
      ...uploadedImages
    ];


    if (
      images.length > 20
    ) {

      throw new Error(
        "A substation can have a maximum of 20 images."
      );
    }


    // ------------------------------------------------------
    // SAVE
    // ------------------------------------------------------

    await service.updateImages(
      req.params.id,
      images
    );


    return res.redirect(
      `/substations/branch/images/${req.params.id}?success=${encodeURIComponent(
        "Substation images updated successfully."
      )}`
    );

  } catch (e) {

    console.error(
      "UPDATE IMAGES ERROR:",
      e
    );


    return res.redirect(
      `/substations/branch/images/${req.params.id}?error=${encodeURIComponent(
        e.message
      )}`
    );
  }
};