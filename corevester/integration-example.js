// Example only — merge into your existing app rather than replacing it.

const express = require("express");
const path = require("path");
const expressLayouts = require("express-ejs-layouts");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(expressLayouts);
app.set("layout", "layout");

// Your existing authentication middleware MUST run before cartContext
// if you want req.user to be available.
app.use(existingAuthenticationMiddleware);

app.use(require("./middleware/cartContext"));

app.use("/products", require("./routes/products"));
app.use("/carts", require("./routes/carts"));
app.use("/packages", require("./routes/packages"));
app.use("/stock", require("./routes/stock"));
app.use("/mpesa", require("./routes/mpesa"));

module.exports = app;
