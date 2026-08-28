<% /*

PRODUCTS PAGE

FILE:
views/products.ejs

PURPOSE:
Marketplace products page.

This page only includes:

    products-patials/cards.ejs

PRODUCT DATA:
products

Passed by:
    controllers/corevester/productsController.js

The controller renders:

    res.render("products", {
        products: filtered,
        ...
    });

=========================================================
*/ %>

<%- include("products-patials/cards") %>