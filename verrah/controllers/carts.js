// =========================================================
// verrah/controllers/carts.js
// CART CONTROLLER
// =========================================================

const cartService =
    require("../services/cartService");

const paymentService =
    require("../services/paymentService");

const packageService =
    require("../services/packageService");


// =========================================================
// ERROR MESSAGE
// =========================================================

function getCartErrorMessage(err, fallback) {

    const message =
        String(err?.message || "").trim();


    // Never expose old reservation terminology
    if (
        /reserved\s*quantity|reservedquantity|reservation/i.test(
            message
        )
    ) {

        return "Insufficient stock for one or more products.";
    }


    return message || fallback;
}


// =========================================================
// CART LIST
// GET /carts
// =========================================================

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
                    req.query.error || null,

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

                cart: null,

                total: 0,

                error:
                    "Unable to load your cart.",

                user:
                    req.user
            }
        );
    }
};


// =========================================================
// CART DETAILS
// GET /carts/:id
// =========================================================

exports.details = async (req, res) => {

    try {

        const cart =
            await cartService.getCart(req);


        if (
            !cart ||
            !cart.items ||
            !cart.items.length
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


        return res.render(
            "cart/cart-details",
            {
                title:
                    `${item.name} | Cart | Verrah Cosmetics`,

                cart,

                item,

                total:
                    cartService.calculateTotal(
                        cart
                    ),

                error:
                    req.query.error || null,

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
            "/carts"
        );
    }
};


// =========================================================
// REMOVE CART ITEM
// POST /carts/:id/remove
// =========================================================

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
            "Remove cart item error:",
            err
        );


        const message =
            getCartErrorMessage(
                err,
                "Unable to remove item."
            );


        return res.redirect(
            `/carts/${req.params.id}?error=${encodeURIComponent(
                message
            )}`
        );
    }
};


// =========================================================
// NORMAL CHECKOUT
// POST /carts/checkout
//
// ADMIN / CLIENT FLOW
//
// Stock is handled when the package is formed.
// The controller does not reserve stock.
// =========================================================

exports.checkout = async (req, res) => {

    const method =
        String(
            req.body.paymentMethod || ""
        ).trim();


    try {

        // -----------------------------------------------------
        // PAY ON DELIVERY
        // -----------------------------------------------------

        if (
            method ===
            "pay_on_delivery"
        ) {

            await packageService
                .createPackageFromCart(
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


        // -----------------------------------------------------
        // MPESA
        // -----------------------------------------------------

        if (
            method ===
            "mpesa"
        ) {

            const result =
                await paymentService
                    .initiateStkPush(
                        req,
                        req.body.phoneNumber
                    );


            return res.redirect(
                `/carts/payment/${result.paymentId}`
            );
        }


        return res.redirect(
            "/carts?error=Choose a checkout method."
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
            `/carts?error=${encodeURIComponent(
                message
            )}`
        );
    }
};


// =========================================================
// STAFF SALE
// POST /carts/staff-sale
//
// Staff sells directly from available Product.units.
// No reservation logic.
// =========================================================

exports.staffSale = async (req, res) => {

    try {

        // -----------------------------------------------------
        // VERIFY USER
        // -----------------------------------------------------

        if (!req.user) {

            return res.redirect(
                "/login"
            );
        }


        // -----------------------------------------------------
        // VERIFY STAFF ROLE
        // -----------------------------------------------------

        const role =
            String(
                req.user.role || ""
            ).trim().toLowerCase();


        if (
            role !== "staff"
        ) {

            return res.redirect(
                "/carts?error=Only staff members can record sales."
            );
        }


        // -----------------------------------------------------
        // VERIFY ASSIGNED SUBSTATION
        // -----------------------------------------------------

        const assignedSubstation =
            req.user.assignedSubstation;


        if (
            !assignedSubstation
        ) {

            return res.redirect(
                "/carts?error=You are not assigned to a substation."
            );
        }


        // -----------------------------------------------------
        // SALES NAME
        // -----------------------------------------------------

        const salesName =
            String(
                req.body.salesName || ""
            ).trim();


        if (!salesName) {

            return res.redirect(
                "/carts?error=Sales name is required."
            );
        }


        if (
            salesName.length >
            150
        ) {

            return res.redirect(
                "/carts?error=Sales name cannot exceed 150 characters."
            );
        }


        // -----------------------------------------------------
        // CREATE STAFF SALE
        //
        // cartService is responsible for:
        //
        // Product.units >= quantity
        //
        // then:
        //
        // Product.units -= quantity
        //
        // No reserved quantity.
        // -----------------------------------------------------

        await cartService.createStaffSale(
            req,
            salesName
        );


        // -----------------------------------------------------
        // SUCCESS
        // -----------------------------------------------------

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
                "Unable to record staff sale."
            );


        return res.redirect(
            `/carts?error=${encodeURIComponent(
                message
            )}`
        );
    }
};


// =========================================================
// PAYMENT PAGE
// GET /carts/payment/:id
// =========================================================

exports.paymentPage = async (req, res) => {

    try {

        const payment =
            await paymentService
                .getPaymentForUser(
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
                    "M-Pesa Payment | Verrah Cosmetics",

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


// =========================================================
// PAYMENT STATUS
// GET /carts/payment/:id/status
// =========================================================

exports.paymentStatus = async (req, res) => {

    try {

        const payment =
            await paymentService
                .getPaymentForUser(
                    req,
                    req.params.id
                );


        if (!payment) {

            return res.status(404).json({
                ok: false,

                message:
                    "Payment not found."
            });
        }


        return res.json({

            ok: true,

            status:
                payment.status,

            receipt:
                payment.mpesaReceiptNumber ||
                "",

            description:
                payment.resultDescription ||
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

            ok: false,

            message:
                "Unable to check payment status."

        });
    }
};


// =========================================================
// M-PESA CALLBACK
// =========================================================

exports.mpesaCallback = async (
    req,
    res
) => {

    try {

        await paymentService
            .handleCallback(
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