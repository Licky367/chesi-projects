// ==========================================================
// controllers/update/pageController.js
// ==========================================================

const updateService = require("../../services/update");

/* =========================================================
🟨 VIEW DAIRY PROFILE PAGE
========================================================= */

exports.viewPage = async (req, res) => {

try {

const { id } = req.params;


/* =================================================
   GET COMPLETE DAIRY PAGE DATA
================================================= */

const data =
    await updateService.getDairyPage(id);


/* =================================================
   DETERMINE PAGE FROM CODE
   
   NEGATIVE CODE:
       Dairy Farm
       → update.ejs

   POSITIVE CODE:
       Animal
       → dairySet.ejs

   NULL CODE:
       Structure / Facility
       → dairySet.ejs
================================================= */

const isDairyFarm =
    data.dairy &&
    data.dairy.code !== null &&
    data.dairy.code !== undefined &&
    Number(data.dairy.code) < 0;


/* =================================================
   SELECT VIEW
================================================= */

const view =
    isDairyFarm
        ? "update"
        : "dairy/dairySet";


/* =================================================
   RENDER SELECTED PAGE
================================================= */

res.render(view, {

    title: "Dairy Profile",


    /* =============================================
       CURRENT DAIRY
    ============================================== */

    dairy:
        data.dairy,


    /* =============================================
       FEED
    ============================================== */

    feed:
        data.feed || [],


    /* =============================================
       WEEKLY MILK FEEDS

       pageService returns:
           weeklyFeeds

       Keep the existing view variable:
           weeklyFeed
    ============================================== */

    weeklyFeed:
        data.weeklyFeeds || null,


    /* =============================================
       COMMENT COUNT
    ============================================== */

    commentCount:
        data.commentCount || 0,


    /* =============================================
       ASSETS BELONGING TO CURRENT DAIRY FARM

       These have already been filtered by
       pageService using:

           assetCode === dairy.code
    ============================================== */

    assetDairies:
        data.assetDairies || [],


    /* =============================================
       LOGGED-IN USER
    ============================================== */

    user:
        req.session.user || null

});

} catch (err) {

console.error(

    "VIEW PAGE ERROR:",

    err.message

);


res
    .status(500)
    .send(
        "Failed to load dairy profile"
    );

}

};