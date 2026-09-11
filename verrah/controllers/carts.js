// =========================================================
// controllers/carts.js
// =========================================================

const cartService =
  require("../services/cartService");

const paymentService =
  require("../services/paymentService");

const packageService =
  require("../services/packageService");


// =========================================================
// CART LIST
// GET /carts
// =========================================================

exports.list =
  async (req, res) => {
    try {
      const cart =
        await cartService.getCart(req);

      const total =
        cartService.calculateTotal(
          cart
        );

      return res.render(
        "cart/carts",
        {
          title:
            "Your Cart | CoreVester",

          cart,

          total,

          error:
            null,

          user:
            req.user
        }
      );
    } catch (err) {
      console.error(err);

      return res.status(500).render(
        "cart/carts",
        {
          title:
            "Your Cart | CoreVester",

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


// =========================================================
// CART DETAILS
// GET /carts/:id
// =========================================================

exports.details =
  async (req, res) => {
    try {
      const cart =
        await cartService.getCart(
          req
        );

      if (
        !cart ||
        !cart.items.length
      ) {
        return res.redirect(
          "/carts"
        );
      }

      const item =
        cart.items.find(
          i =>
            String(
              i.productId
            ) ===
            String(
              req.params.id
            )
        );

      if (!item) {
        return res.status(404)
          .redirect(
            "/carts"
          );
      }

      return res.render(
        "cart/cart-details",
        {
          title:
            `${item.name} | Cart | CoreVester`,

          cart,

          item,

          total:
            cartService.calculateTotal(
              cart
            ),

          error:
            req.query.error ||
            null,

          user:
            req.user
        }
      );
    } catch (err) {
      console.error(err);

      return res.status(500)
        .redirect("/carts");
    }
  };


// =========================================================
// REMOVE CART ITEM
// POST /carts/:id/remove
// =========================================================

exports.remove =
  async (req, res) => {
    try {
      await cartService.removeItem(
        req,
        req.params.id
      );

      return res.redirect(
        "/carts"
      );
    } catch (err) {
      console.error(err);

      return res.redirect(
        `/carts/${req.params.id}?error=${encodeURIComponent(
          err.message
        )}`
      );
    }
  };


// =========================================================
// CHECKOUT
// POST /carts/checkout
// =========================================================

exports.checkout =
  async (req, res) => {
    const method =
      String(
        req.body.paymentMethod ||
        ""
      ).trim();

    try {
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

      return res.redirect(
        `/carts?error=${encodeURIComponent(
          err.message
        )}`
      );
    }
  };


// =========================================================
// STAFF SALE
// POST /carts/staff-sale
// =========================================================

exports.staffSale =
  async (req, res) => {
    try {

      // -----------------------------------------------------
      // Ensure only staff can create staff sales
      // -----------------------------------------------------

      const role =
        String(
          req.user?.role ||
          ""
        ).toLowerCase();

      if (role !== "staff") {
        return res.redirect(
          "/carts?error=Only staff members can record sales."
        );
      }


      // -----------------------------------------------------
      // Get sales name
      // -----------------------------------------------------

      const salesName =
        String(
          req.body.salesName ||
          ""
        ).trim();

      if (!salesName) {
        return res.redirect(
          "/carts?error=Sales name is required."
        );
      }


      // -----------------------------------------------------
      // Save staff sale
      // -----------------------------------------------------

      await cartService.createStaffSale(
        req,
        salesName
      );


      // -----------------------------------------------------
      // Sale completed
      // Cart is cleared by the service.
      // -----------------------------------------------------

      return res.redirect(
        "/"
      );

    } catch (err) {

      console.error(
        "Staff sale error:",
        err
      );

      return res.redirect(
        `/carts?error=${encodeURIComponent(
          err.message ||
          "Unable to record staff sale."
        )}`
      );
    }
  };


// =========================================================
// PAYMENT PAGE
// GET /carts/payment/:id
// =========================================================

exports.paymentPage =
  async (req, res) => {
    try {
      const payment =
        await paymentService
          .getPaymentForUser(
            req,
            req.params.id
          );

      if (!payment) {
        return res.status(404)
          .redirect("/carts");
      }

      return res.render(
        "cart/payment-status",
        {
          title:
            "M-Pesa Payment | CoreVester",

          payment,

          user:
            req.user
        }
      );
    } catch (err) {
      console.error(err);

      return res.status(500)
        .redirect("/carts");
    }
  };


// =========================================================
// PAYMENT STATUS
// GET /carts/payment/:id/status
// =========================================================

exports.paymentStatus =
  async (req, res) => {
    try {
      const payment =
        await paymentService
          .getPaymentForUser(
            req,
            req.params.id
          );

      if (!payment) {
        return res.status(404)
          .json({
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
      console.error(err);

      return res.status(500)
        .json({
          ok: false,
          message:
            "Unable to check payment status."
        });
    }
  };


// =========================================================
// M-PESA CALLBACK
// =========================================================

exports.mpesaCallback =
  async (req, res) => {
    try {
      await paymentService
        .handleCallback(
          req.body
        );
    } catch (err) {
      console.error(
        "M-Pesa callback:",
        err
      );
    }

    return res.json({
      ResultCode: 0,

      ResultDesc:
        "Accepted"
    });
  };