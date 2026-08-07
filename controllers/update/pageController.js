const updateService = require("../../services/update");


/* =========================================================
   🟨 VIEW DAIRY PROFILE PAGE
========================================================= */
exports.viewPage = async (req, res) => {

    try {

        const { id } = req.params;

        const data = await updateService.getDairyPage(id);

        res.render("update", {

            title: "Dairy Profile",

            dairy: data.dairy,

            feed: data.feed || [],

            weeklyFeed: data.weeklyFeed || null,

            commentCount: data.commentCount || 0,

            user: req.session.user || null

        });

    } catch (err) {

        console.error(

            "VIEW PAGE ERROR:",

            err.message

        );

        res
            .status(500)
            .send("Failed to load dairy profile");

    }

};