/*

* ==========================================================
* routes/contact.js
* COREVESTER CONTACT ROUTES
* ==========================================================
  */

const express = require("express");

const router = express.Router();

// ==========================================================
// GET /contact
// ==========================================================

router.get("/", (req, res) => {

res.render("contact", {

    title: "Contact | CoreVester",

    success: null,

    error: null,

    formData: null

});

});

// ==========================================================
// POST /contact
// ==========================================================

router.post("/", (req, res) => {

const name =
    String(req.body?.name || "").trim();

const email =
    String(req.body?.email || "").trim();

const subject =
    String(req.body?.subject || "").trim();

const message =
    String(req.body?.message || "").trim();


// ======================================================
// VALIDATION
// ======================================================

if (
    !name ||
    !email ||
    !subject ||
    !message
) {

    return res.status(400).render("contact", {

        title: "Contact | CoreVester",

        success: null,

        error: "Please complete all fields.",

        formData: {
            name,
            email,
            subject,
            message
        }

    });

}


const emailPattern =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


if (!emailPattern.test(email)) {

    return res.status(400).render("contact", {

        title: "Contact | CoreVester",

        success: null,

        error: "Please enter a valid email address.",

        formData: {
            name,
            email,
            subject,
            message
        }

    });

}


if (name.length > 100) {

    return res.status(400).render("contact", {

        title: "Contact | CoreVester",

        success: null,

        error: "Name is too long.",

        formData: {
            name,
            email,
            subject,
            message
        }

    });

}


if (subject.length > 150) {

    return res.status(400).render("contact", {

        title: "Contact | CoreVester",

        success: null,

        error: "Subject is too long.",

        formData: {
            name,
            email,
            subject,
            message
        }

    });

}


if (message.length > 3000) {

    return res.status(400).render("contact", {

        title: "Contact | CoreVester",

        success: null,

        error: "Message is too long.",

        formData: {
            name,
            email,
            subject,
            message
        }

    });

}


// ======================================================
// CONTACT MESSAGE
// ======================================================
//
// This is the point where the message can later be
// connected to email delivery or database storage.
//
// For now, keep the route functional without pretending
// that an email has actually been delivered.
// ======================================================

console.log(
    "COREVESTER CONTACT MESSAGE",
    {
        name,
        email,
        subject,
        message
    }
);


// ======================================================
// SUCCESS
// ======================================================

return res.render("contact", {

    title: "Contact | CoreVester",

    success:
        "Your message has been received. Thank you for contacting us.",

    error: null,

    formData: null

});

});

// ==========================================================
// EXPORT
// ==========================================================

module.exports = router;