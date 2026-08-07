const updateService = require("../../services/update");


/* =========================================================
   🟦 UPDATE PROFILE IMAGE
========================================================= */
exports.image = async (req, res) => {

    try {

        const { id } = req.params;

        const user = req.session.user;

        if (!user) {

            return res
                .status(401)
                .send("Unauthorized");

        }

        if (!req.file) {

            return res
                .status(400)
                .send("No image uploaded");

        }

        const update = await updateService.updateImage({

            dairyId: id,

            userId: user._id,

            image: req.file.filename

        });

        const payload = {

            dairyId: id,

            image: `/uploads/${req.file.filename}`,

            userName: user.name,

            userImage:
                `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`,

            dateText: new Date(update.createdAt).toLocaleString()

        };

        const io = req.app.get("io");

        if (io) {

            io.to(id).emit("imageUpdated", payload);

        }

        res.redirect(`/dairy/${id}`);

    } catch (err) {

        console.error(

            "IMAGE UPDATE ERROR:",

            err.message

        );

        res
            .status(500)
            .send("Failed to update image");

    }

};


/* =========================================================
   🗑 DELETE DAIRY PROFILE
========================================================= */
exports.deleteProfile = async (req, res) => {

    try {

        const { id } = req.params;

        const user = req.session.user;

        if (!user) {

            return res
                .status(401)
                .send("Unauthorized");

        }

        if (user.role !== "admin") {

            return res
                .status(403)
                .send("Only admin can delete dairy profiles");

        }

        await updateService.deleteProfile(id);

        const io = req.app.get("io");

        if (io) {

            io.emit("dairyDeleted", {

                dairyId: id

            });

        }

        res.json({

            success: true,

            message: "Dairy profile deleted successfully."

        });

    } catch (err) {

        console.error(

            "DELETE PROFILE ERROR:",

            err.message

        );

        res
            .status(500)
            .send("Failed to delete dairy profile");

    }

};


/* =========================================================
   📝 UPDATE PROFILE INFO
========================================================= */
exports.updateProfile = async (req, res) => {

    try {

        await updateService.updateProfile(

            req.params.id,

            req.body

        );

        res.json({

            success: true

        });

    } catch (err) {

        console.error(

            "UPDATE PROFILE ERROR:",

            err.message

        );

        res.status(500).json({

            success: false,

            message: "Failed to update profile."

        });

    }

};