// ==========================================================
// services/update/commentService.js
// ==========================================================

const Update = require("../../models/Update");

const {
  formatDate
} = require("./helpers");


/* ==========================================================
   💬 GENERAL COMMENT
========================================================= */
exports.comment = async ({

  dairyId,

  userId,

  userName,

  text

}) => {

  const update = await Update.create({

    dairy: dairyId,

    user: userId,

    userName,

    type: "comment",

    comment: text

  });

  return {

    _id: update._id,

    text: update.comment,

    createdAt: update.createdAt,

    dateText: formatDate(update.createdAt)

  };

};