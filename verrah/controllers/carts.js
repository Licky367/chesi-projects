// ==========================================================
// verrah/controllers/carts.js
//
// CART CONTROLLER
// ==========================================================

const cartService =
    require("../services/cartService");

const paymentService =
    require("../services/paymentService");

const packageService =
    require("../services/packageService");


// ==========================================================
// CART ERROR HELPER
// ==========================================================

function getCartErrorMessage(err, fallback) {
    const message =
        String(
            err?.message || ""
        ).trim();

    if (
        /reserved\s*quantity|reservedquantity|reservation/i.test(
            message
        )
    ) {
        return "Insufficient stock for one or more products.";
    }

    return message || fallback;
}


// ==========================================================
// CART LIST
// GET /carts
// ==========================================================

exports.list = async (req, res) => {
    try {
        const cart =
            await cartService.getCart(req);

        const total =
            cartService.calculateTotal(cart);

        return res.render(
            "cart/carts",
            {
                title:
                    "Your Cart | Verrah Cosmetics",

                cart,

                total,

                error:
                    req.query.error ||
                    null,

                user:
                    req.user
            }
        );

    } catch (err) {

        console.error(
            "Cart list error:",
            err
        );

        return res.status(500).render(
            "cart/carts",
            {
                title:
                    "Your Cart | Verrah Cosmetics",

                cart:
                    null,

                total:
                    0,

                error:
                    "Unable to load your cart.",

                user:
                    req.user
            }
        );
    }
};


// ==========================================================
// CHECKOUT PAGE
// GET /carts/:id
//
// IMPORTANT:
//
// This route renders:
//
//     cart/cart-checkout.ejs
//
// The checkoutSubstation middleware runs BEFORE this
// controller and places:
//
//     res.locals.substations
//     res.locals.pickupStation
//
// into the request.
//
// We explicitly pass those values to the checkout view.
// ==========================================================

exports.checkoutPage = async (req, res) => {
    try {

        const cart =
            await cartService.getCart(req);

        if (
            !cart ||
            !Array.isArray(cart.items) ||
            cart.items.length === 0
        ) {
            return res.redirect(
                "/carts"
            );
        }


        // --------------------------------------------------
        // Find the cart item being checked out.
        // --------------------------------------------------

        const item =
            cart.items.find(
                currentItem =>
                    String(
                        currentItem.productId
                    ) ===
                    String(
                        req.params.id
                    )
            );


        if (!item) {
            return res.redirect(
                "/carts"
            );
        }


        // --------------------------------------------------
        // IMPORTANT:
        //
        // checkoutSubstation.load has already loaded
        // these values into res.locals.
        //
        // Do NOT load them through the details controller.
        // --------------------------------------------------

        const substations =
            Array.isArray(
                res.locals.substations
            )
                ? res.locals.substations
                : [];


        const pickupStation =
            res.locals.pickupStation ||
            (
                req.user?.pickupStation
                    ? String(
                        req.user.pickupStation
                    )
                    : ""
            );


        const total =
            cartService.calculateTotal(
                cart
            );


        // --------------------------------------------------
        // CHECKOUT VIEW
        // --------------------------------------------------

        return res.render(
            "cart/cart-checkout",
            {
                title:
                    `Checkout | ${item.name} | Verrah Cosmetics`,

                cart,

                item,

                total,

                substations,

                pickupStation,

                error:
                    req.query.error ||
                    null,

                user:
                    req.user
            }
        );

    } catch (err) {

        console.error(
            "Checkout page error:",
            err
        );

        const message =
            getCartErrorMessage(
                err,
                "Unable to load checkout."
            );


        return res.redirect(
            `/carts/${encodeURIComponent(
                req.params.id
            )}?error=${encodeURIComponent(
                message
            )}`
        );
    }
};


// ==========================================================
// CART ITEM DETAILS
// GET /carts/:id/details
//
// IMPORTANT:
//
// This route renders ONLY:
//
//     cart/cart-details.ejs
//
// It does NOT render checkout.
// It does NOT own the checkout substation data.
// ==========================================================

exports.details = async (req, res) => {
    try {

        const cart =
            await cartService.getCart(req);

        if (
            !cart ||
            !Array.isArray(cart.items) ||
            cart.items.length === 0
        ) {
            return res.redirect(
                "/carts"
            );
        }


        const item =
            cart.items.find(
                currentItem =>
                    String(
                        currentItem.productId
                    ) ===
                    String(
                        req.params.id
                    )
            );


        if (!item) {
            return res.redirect(
                "/carts"
            );
        }


        const total =
            cartService.calculateTotal(
                cart
            );


        // --------------------------------------------------
        // DETAILS VIEW ONLY
        // --------------------------------------------------

        return res.render(
            "cart/cart-details",
            {
                title:
                    `${item.name} | Cart | Verrah Cosmetics`,

                cart,

                item,

                total,

                error:
                    req.query.error ||
                    null,

                user:
                    req.user
            }
        );

    } catch (err) {

        console.error(
            "Cart details error:",
            err
        );

        return res.redirect(
            `/carts/${encodeURIComponent(
                req.params.id
            )}/details?error=${encodeURIComponent(
                getCartErrorMessage(
                    err,
                    "Unable to load cart item."
                )
            )}`
        );
    }
};


// ==========================================================
// REMOVE CART ITEM
// POST /carts/:id/remove
// ==========================================================

exports.remove = async (req, res) => {
    try {

        await cartService.removeItem(
            req,
            req.params.id
        );

        return res.redirect(
            "/carts"
        );

    } catch (err) {

        console.error(
            "Cart remove error:",
            err
        );

        const message =
            getCartErrorMessage(
                err,
                "Unable to remove item."
            );


        return res.redirect(
            `/carts/${encodeURIComponent(
                req.params.id
            )}/details?error=${encodeURIComponent(
                message
            )}`
        );
    }
};


// ==========================================================
// CHECKOUT PROCESS
// POST /carts/checkout
//
// checkoutSubstation.saveSelection runs BEFORE this
// controller.
//
// Therefore, by the time this function runs:
//
//     req.user.pickupStation
//
// has already been updated.
// ==========================================================

exports.checkout = async (req, res) => {

    const method =
        String(
            req.body.paymentMethod ||
            ""
        ).trim();


    const productId =
        String(
            req.body.productId ||
            ""
        ).trim();


    try {

        // --------------------------------------------------
        // PAY UPON DELIVERY
        // --------------------------------------------------

        if (
            method ===
            "pay_on_delivery"
        ) {

            await packageService.createPackageFromCart(
                req,
                {
                    paymentMethod:
                        "pay_on_delivery",

                    paymentStatus:
                        "unpaid",

                    paidAmount:
                        0,

                    phoneNumber:
                        ""
                }
            );


            return res.redirect(
                "/packages"
            );
        }


        // --------------------------------------------------
        // M-PESA
        // --------------------------------------------------

        if (
            method ===
            "mpesa"
        ) {

            const result =
                await paymentService.initiateStkPush(
                    req,
                    req.body.phoneNumber
                );


            return res.redirect(
                `/carts/payment/${result.paymentId}`
            );
        }


        // --------------------------------------------------
        // NO PAYMENT METHOD
        // --------------------------------------------------

        const error =
            encodeURIComponent(
                "Choose a checkout method."
            );


        return res.redirect(
            productId
                ? `/carts/${encodeURIComponent(
                    productId
                )}?error=${error}`
                : `/carts?error=${error}`
        );

    } catch (err) {

        console.error(
            "Checkout error:",
            err
        );


        const message =
            getCartErrorMessage(
                err,
                "Checkout failed."
            );


        return res.redirect(
            productId
                ? `/carts/${encodeURIComponent(
                    productId
                )}?error=${encodeURIComponent(
                    message
                )}`
                : `/carts?error=${encodeURIComponent(
                    message
                )}`
        );
    }
};


// ==========================================================
// STAFF SALE
// POST /carts/staff-sale
// ==========================================================

exports.staffSale = async (req, res) => {
    try {

        if (!req.user) {
            return res.redirect(
                "/login"
            );
        }


        const role =
            String(
                req.user.role ||
                ""
            )
                .trim()
                .toLowerCase();


        if (
            role !== "staff"
        ) {
            return res.status(403).send(
                "Only staff can complete staff sales."
            );
        }


        const assignedSubstation =
            req.user.assignedSubstation;


        if (!assignedSubstation) {
            return res.status(400).send(
                "You are not assigned to a substation."
            );
        }


        const salesName =
            String(
                req.body.salesName ||
                ""
            ).trim();


        if (!salesName) {
            return res.status(400).send(
                "Sales name is required."
            );
        }


        if (
            salesName.length > 150
        ) {
            return res.status(400).send(
                "Sales name is too long."
            );
        }


        await cartService.createStaffSale(
            req,
            salesName
        );


        return res.redirect(
            `/branch/${assignedSubstation}`
        );

    } catch (err) {

        console.error(
            "Staff sale error:",
            err
        );


        const message =
            getCartErrorMessage(
                err,
                "Unable to complete staff sale."
            );


        return res.status(400).send(
            message
        );
    }
};


// ==========================================================
// PAYMENT PAGE
// GET /carts/payment/:id
// ==========================================================

exports.paymentPage = async (req, res) => {
    try {

        const payment =
            await paymentService.getPaymentForUser(
                req,
                req.params.id
            );


        if (!payment) {
            return res.redirect(
                "/carts"
            );
        }


        return res.render(
            "cart/payment-status",
            {
                title:
                    "Payment Status | Verrah Cosmetics",

                payment,

                user:
                    req.user
            }
        );

    } catch (err) {

        console.error(
            "Payment page error:",
            err
        );

        return res.redirect(
            "/carts"
        );
    }
};


// ==========================================================
// PAYMENT STATUS
// GET /carts/payment/:id/status
// ==========================================================

exports.paymentStatus = async (req, res) => {
    try {

        const payment =
            await paymentService.getPaymentForUser(
                req,
                req.params.id
            );


        if (!payment) {
            return res.status(404).json(
                {
                    ok:
                        false,

                    error:
                        "Payment not found."
                }
            );
        }


        return res.json(
            {
                ok:
                    true,

                status:
                    payment.status,

                receipt:
                    payment.receipt ||
                    "",

                description:
                    payment.description ||
                    "",

                packageId:
                    payment.packageId ||
                    null
            }
        );

    } catch (err) {

        console.error(
            "Payment status error:",
            err
        );

        return res.status(500).json(
            {
                ok:
                    false,

                error:
                    "Unable to check payment status."
            }
        );
    }
};


// ==========================================================
// M-PESA CALLBACK
// POST /carts/payment/callback
// ==========================================================

exports.mpesaCallback = async (
    req,
    res
) => {
    try {

        await paymentService.handleCallback(
            req.body
        );

    } catch (err) {

        console.error(
            "M-Pesa callback error:",
            err
        );
    }


    return res.json(
        {
            ResultCode:
                0,

            ResultDesc:
                "Accepted"
        }
    );
};