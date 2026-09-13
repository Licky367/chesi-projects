// ==========================================================
// verrah/middleware/checkoutSubstation.js
//
// Loads substations for checkout and persists the customer's
// latest pickup-station selection.
// ==========================================================

const mongoose = require("mongoose");

const Substation = require("../models/substations");
const User = require("../models/user");

async function getCurrentUser(req) {
    const userId =
        req.user?._id ||
        req.user?.id;

    if (!userId) {
        throw new Error("Login is required.");
    }

    const user =
        await User.findById(userId)
            .select("_id name email phone role pickupStation")
            .lean();

    if (!user) {
        throw new Error("User account was not found.");
    }

    return user;
}


// ==========================================================
// GET /carts/:id
//
// Makes substations and the user's saved pickupStation
// available to the EJS checkout page.
// ==========================================================

exports.load = async (req, res, next) => {
    try {
        const [substations, user] =
            await Promise.all([
                Substation.find({})
                    .select("_id name location phoneNumber")
                    .sort({ name: 1 })
                    .lean(),

                getCurrentUser(req)
            ]);

        res.locals.substations =
            Array.isArray(substations)
                ? substations
                : [];

        res.locals.pickupStation =
            user.pickupStation
                ? String(user.pickupStation)
                : "";

        next();
    } catch (err) {
        console.error(
            "Checkout substation load error:",
            err
        );

        res.locals.substations = [];
        res.locals.pickupStation = "";

        next(err);
    }
};


// ==========================================================
// POST /carts/checkout
//
// Validates the selected substation and updates User.pickupStation
// BEFORE either Pay Now or Pay Upon Delivery is processed.
// ==========================================================

exports.saveSelection = async (req, res, next) => {
    try {
        const selected =
            String(
                req.body.packageSubstation || ""
            ).trim();

        if (
            !selected ||
            !mongoose.isValidObjectId(selected)
        ) {
            return res.redirect(
                `/carts/${encodeURIComponent(
                    req.body.productId || ""
                )}?error=${encodeURIComponent(
                    "Please select a pickup substation before checkout."
                )}`
            );
        }

        const substation =
            await Substation.findById(selected)
                .select("_id name location")
                .lean();

        if (!substation) {
            return res.redirect(
                `/carts/${encodeURIComponent(
                    req.body.productId || ""
                )}?error=${encodeURIComponent(
                    "The selected pickup substation could not be found."
                )}`
            );
        }

        const userId =
            req.user?._id ||
            req.user?.id;

        if (!userId) {
            return res.redirect(
                "/login"
            );
        }

        await User.updateOne(
            { _id: userId },
            {
                $set: {
                    pickupStation:
                        substation._id
                }
            }
        );

        // Keep the current request/session user in sync.
        if (req.user) {
            req.user.pickupStation =
                substation._id;
        }

        next();

    } catch (err) {
        console.error(
            "Checkout substation selection error:",
            err
        );

        const productId =
            String(
                req.body.productId || ""
            ).trim();

        return res.redirect(
            productId
                ? `/carts/${encodeURIComponent(productId)}?error=${encodeURIComponent(
                    err.message ||
                    "Unable to save the selected pickup substation."
                )}`
                : `/carts?error=${encodeURIComponent(
                    err.message ||
                    "Unable to save the selected pickup substation."
                )}`
        );
    }
};
