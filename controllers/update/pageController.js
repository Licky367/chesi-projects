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
       RENDER UPDATE PAGE
    ================================================= */

    res.render("update", {

        title: "Dairy Profile",


        /* =============================================
           CURRENT DAIRY FARM
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