// ==========================================================
// services/update/projectService.js
// ==========================================================

const Dairy = require("../../models/dairy");

/* ==========================================================
   🟩 GET DAIRY PROJECTS
========================================================= */
exports.getPositiveDairies = async () => {

  return await Dairy.find({

    code: { $gt: 0 }

  })

    .sort({

      code: 1

    })

    .lean();

};


/* ==========================================================
   🟦 GET STRUCTURES
========================================================= */
exports.getNegativeDairies = async () => {

  return await Dairy.find({

    code: { $lt: 0 }

  })

    .sort({

      code: 1

    })

    .lean();

};