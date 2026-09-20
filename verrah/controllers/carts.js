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

const substationService =
    require("../services/substationService");


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
// PACKAGE REDIRECT HELPER
//
// Staff or admin:
//     /packages/staffDirect
//
// Everyone else:
//     /packages
// ==========================================================

function getPackageRedirect(req) {

    const role =
        String(
            req.user?.role ||
            ""
        )
            .trim()
            .toLowerCase();


    if (
        role === "staff" || role === "admin"
    ) {

        return "/packages/staffDirect";
    }


    return "/packages";
}


// ==========================================================
// GET SUBSTATIONS
//
// Uses the actual Verrah substation service.
//
// substationService.list()
// returns active substations sorted by name.
// ==========================================================

async function getSubstations() {

    const substations =
        await substationService.list();

    return Array.isArray(substations)
        ? substations
        : [];
}


// ==========================================================
// CART LIST
// GET /carts
// ==========================================================

exports.list = async (req, res) => {

    try {

        const [
            cart,
            substations
        ] = await Promise.all([

            cartService.getCart(req),

            getSubstations()

        ]);


        const total =
            cartService.calculateTotal(
                cart
            );


        return res.render(
            "cart/carts",
            {
                title:
                    "Your Cart | Verrah Cosmetics",

                cart,

                total,

                substations,

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

                substations:
                    [],

                error:
                    "Unable to load your cart.",

                user:
                    req.user
            }
        );
    }
};


// ==========================================================
// UPDATE PAYMENT MODE
// POST /carts/payment-mode
//
// ADMIN + STAFF
//
// Cash:
//     isMobile = false
//
// M-PESA:
//     isMobile = true
// ==========================================================

exports.updatePaymentMode = async (
    req,
    res
) => {

    try {

        // --------------------------------------------------
        // USER MUST BE LOGGED IN
        // --------------------------------------------------

        if (!req.user) {

            return res.status(401).json({

                ok:
                    false,

                error:
                    "Please log in."
            });
        }


        // --------------------------------------------------
        // USER ROLE
        // --------------------------------------------------

        const role =
            String(
                req.user.role ||
                ""
            )
                .trim()
                .toLowerCase();


        // --------------------------------------------------
        // ADMIN + STAFF ONLY
        // --------------------------------------------------

        if (
            role !== "staff" &&
            role !== "admin"
        ) {

            return res.status(403).json({

                ok:
                    false,

                error:
                    "Only admin or staff can change payment mode."
            });
        }


        // --------------------------------------------------
        // READ SUBMITTED VALUE
        //
        // true  = M-PESA
        // false = CASH
        // --------------------------------------------------

        const submittedValue =
            req.body?.isMobile;


        let isMobile;


        if (
            submittedValue === true ||
            String(
                submittedValue ?? ""
            )
                .trim()
                .toLowerCase() === "true"
        ) {

            isMobile =
                true;

        } else if (
            submittedValue === false ||
            String(
                submittedValue ?? ""
            )
                .trim()
                .toLowerCase() === "false"
        ) {

            isMobile =
                false;

        } else {

            return res.status(400).json({

                ok:
                    false,

                error:
                    "Invalid payment mode."
            });
        }


        // --------------------------------------------------
        // UPDATE THROUGH CART SERVICE
        // --------------------------------------------------

        const cart =
            await cartService.updatePaymentMode(
                req,
                isMobile
            );


        return res.json({

            ok:
                true,

            isMobile:
                Boolean(
                    cart.isMobile
                )

        });

    } catch (err) {

        console.error(
            "Update payment mode error:",
            err
        );


        return res.status(
            err.statusCode || 500
        ).json({

            ok:
                false,

            error:
                err?.message ||
                "Unable to update payment mode."

        });
    }
};


// ==========================================================
// CHECKOUT PAGE
// GET /carts/:id
// ==========================================================

exports.checkoutPage = async (
    req,
    res
) => {

    try {

        const cart =
            await cartService.getCart(
                req
            );


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
        // FIND CART ITEM
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
        // CHECKOUT SUBSTATIONS
        // --------------------------------------------------

        let substations =
            Array.isArray(
                res.locals.substations
            )
                ? res.locals.substations
                : null;


        if (!substations) {

            substations =
                await getSubstations();
        }


        // --------------------------------------------------
        // PICKUP STATION
        // --------------------------------------------------

        const pickupStation =
            res.locals.pickupStation ||
            (
                req.user?.pickupStation
                    ? String(
                        req.user.pickupStation
                    )
                    : ""
            );


        // --------------------------------------------------
        // TOTAL
        // --------------------------------------------------

        const total =
            cartService.calculateTotal(
                cart
            );


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


        return res.redirect(
            `/carts/${encodeURIComponent(
                req.params.id
            )}?error=${encodeURIComponent(
                getCartErrorMessage(
                    err,
                    "Unable to load checkout."
                )
            )}`
        );
    }
};


// ==========================================================
// CART ITEM DETAILS
// GET /carts/:id/details
// ==========================================================

exports.details = async (
    req,
    res
) => {

    try {

        const cart =
            await cartService.getCart(
                req
            );


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

exports.remove = async (
    req,
    res
) => {

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


        return res.redirect(
            `/carts/${encodeURIComponent(
                req.params.id
            )}/details?error=${encodeURIComponent(
                getCartErrorMessage(
                    err,
                    "Unable to remove item."
                )
            )}`
        );
    }
};


// ==========================================================
// CHECKOUT PROCESS
// POST /carts/checkout
//
// Internal users:
//     staff
//     admin
//
// Both staff and admin:
//     salesName is required
//
// Staff:
//     assignedSubstation determines the substation.
//
// Admin:
//     selected package substation is handled by the
//     checkout flow.
//
// Cash:
//     handled by /carts/staff-sale
//
// M-PESA:
//     normal M-PESA/payment flow, with salesName retained
//     for internal users.
// ==========================================================

exports.checkout = async (
    req,
    res
) => {

    const method =
        String(
            req.body?.paymentMethod ||
            ""
        ).trim();


    const productId =
        String(
            req.body?.productId ||
            ""
        ).trim();


    try {

        const cart =
            await cartService.getCart(
                req
            );


        const role =
            String(
                req.user?.role ||
                ""
            )
                .trim()
                .toLowerCase();


        // --------------------------------------------------
        // INTERNAL USERS
        //
        // BOTH STAFF AND ADMIN
        // --------------------------------------------------

        const isInternalSale =
            role === "staff" ||
            role === "admin";


        const isStaff =
            role === "staff";


        const isAdmin =
            role === "admin";


        const isMobile =
            isInternalSale &&
            cart &&
            cart.isMobile === true;


        // --------------------------------------------------
        // SALES NAME
        //
        // BOTH STAFF AND ADMIN
        //
        // This is intentionally not restricted to staff.
        // The checkout EJS already displays salesName for
        // both roles.
        // --------------------------------------------------

        let salesName =
            "";


        if (isInternalSale) {

            salesName =
                String(
                    req.body?.salesName ||
                    ""
                ).trim();


            if (
                !salesName
            ) {

                throw new Error(
                    "Sales name is required."
                );
            }


            if (
                salesName.length >
                150
            ) {

                throw new Error(
                    "Sales name cannot exceed 150 characters."
                );
            }
        }


        // --------------------------------------------------
        // PAY UPON DELIVERY
        // --------------------------------------------------

        if (
            method ===
            "pay_on_delivery"
        ) {

            const packageOptions = {

                paymentMethod:
                    "pay_on_delivery",

                paymentStatus:
                    "unpaid",

                paidAmount:
                    0,

                phoneNumber:
                    ""
            };


            // ------------------------------------------------
            // INTERNAL USERS
            //
            // BOTH STAFF + ADMIN
            //
            // Preserve salesName.
            // ------------------------------------------------

            if (isInternalSale) {

                packageOptions.salesName =
                    salesName;
            }


            await packageService.createPackageFromCart(
                req,
                packageOptions
            );


            return res.redirect(
                getPackageRedirect(req)
            );
        }


        // --------------------------------------------------
        // M-PESA
        // --------------------------------------------------

        if (
            method ===
            "mpesa"
        ) {

            // ------------------------------------------------
            // For staff + admin, salesName has already been
            // validated above.
            //
            // Keep it on req.body so the existing payment
            // service receives the same checkout request
            // containing salesName.
            // ------------------------------------------------

            if (isInternalSale) {

                req.body.salesName =
                    salesName;
            }


            const result =
                await paymentService.initiateStkPush(
                    req,
                    req.body?.phoneNumber
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
// STAFF / ADMIN SALE
// POST /carts/staff-sale
//
// CASH PAYMENT
//
// STAFF:
//     salesName
//     user.assignedSubstation
//
// ADMIN:
//     salesName
//     req.body.salesSubstation
//
// DATABASE:
//     salesSubstation
// ==========================================================

exports.staffSale = async (
    req,
    res
) => {

    try {

        // --------------------------------------------------
        // USER MUST BE LOGGED IN
        // --------------------------------------------------

        if (!req.user) {

            return res.redirect(
                "/login"
            );
        }


        // --------------------------------------------------
        // USER ROLE
        // --------------------------------------------------

        const role =
            String(
                req.user.role ||
                ""
            )
                .trim()
                .toLowerCase();


        const isStaff =
            role === "staff";


        const isAdmin =
            role === "admin";


        // --------------------------------------------------
        // ADMIN + STAFF ONLY
        // --------------------------------------------------

        if (
            !isStaff &&
            !isAdmin
        ) {

            return res.status(403).send(
                "Only admin or staff can complete this sale."
            );
        }


        // --------------------------------------------------
        // SALES NAME
        //
        // BOTH STAFF + ADMIN
        // --------------------------------------------------

        const salesName =
            String(
                req.body?.salesName ||
                ""
            ).trim();


        if (!salesName) {

            return res.status(400).send(
                "Sales name is required."
            );
        }


        if (
            salesName.length >
            150
        ) {

            return res.status(400).send(
                "Sales name cannot exceed 150 characters."
            );
        }


        // --------------------------------------------------
        // SALES SUBSTATION
        // --------------------------------------------------
        //
        // STAFF:
        //     Always use assignedSubstation from user.
        //
        // ADMIN:
        //     Use the substation selected in the modal.
        // --------------------------------------------------

        let salesSubstation;


        if (isStaff) {

            salesSubstation =
                req.user.assignedSubstation;


            if (
                !salesSubstation
            ) {

                return res.status(400).send(
                    "You are not assigned to a substation."
                );
            }

        } else if (isAdmin) {

            salesSubstation =
                String(
                    req.body?.salesSubstation ||
                    ""
                ).trim();


            if (
                !salesSubstation
            ) {

                return res.status(400).send(
                    "Please select a substation."
                );
            }
        }


        // --------------------------------------------------
        // NORMALIZE SUBSTATION ID
        // --------------------------------------------------

        if (
            typeof salesSubstation ===
            "object"
        ) {

            salesSubstation =
                salesSubstation._id ||
                salesSubstation.id ||
                "";
        }


        salesSubstation =
            String(
                salesSubstation
            ).trim();


        if (
            !salesSubstation
        ) {

            return res.status(400).send(
                "A valid sales substation is required."
            );
        }


        // --------------------------------------------------
        // VERIFY SUBSTATION EXISTS
        // --------------------------------------------------

        const substations =
            await getSubstations();


        const selectedSubstation =
            substations.find(
                substation =>
                    String(
                        substation?._id ||
                        substation?.id ||
                        ""
                    ) ===
                    salesSubstation
            );


        if (
            !selectedSubstation
        ) {

            return res.status(400).send(
                "Selected substation was not found."
            );
        }


        // --------------------------------------------------
        // CREATE SALE
        //
        // BOTH VALUES ARE PASSED TO THE CART SERVICE.
        // --------------------------------------------------

        await cartService.createStaffSale(
            req,
            {
                salesName,
                salesSubstation
            }
        );


        // --------------------------------------------------
        // REDIRECT
        // --------------------------------------------------

        return res.redirect(
            `/branch/${encodeURIComponent(
                salesSubstation
            )}`
        );

    } catch (err) {

        console.error(
            "Staff/admin sale error:",
            err
        );


        return res.status(400).send(
            getCartErrorMessage(
                err,
                "Unable to complete sale."
            )
        );
    }
};


// ==========================================================
// PAYMENT PAGE
// GET /carts/payment/:id
// ==========================================================

exports.paymentPage = async (
    req,
    res
) => {

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

exports.paymentStatus = async (
    req,
    res
) => {

    try {

        const payment =
            await paymentService.getPaymentForUser(
                req,
                req.params.id
            );


        if (!payment) {

            return res.status(404).json({

                ok:
                    false,

                error:
                    "Payment not found."
            });
        }


        return res.json({

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
        });

    } catch (err) {

        console.error(
            "Payment status error:",
            err
        );


        return res.status(500).json({

            ok:
                false,

            error:
                "Unable to check payment status."
        });
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


    return res.json({

        ResultCode:
            0,

        ResultDesc:
            "Accepted"
    });
};