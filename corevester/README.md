# CoreVester Shop Module

This package implements the shop flow requested in `shopProjects.txt`.

## Route contract

### Marketplace
- `GET /products` -> `views/products/products.ejs`
- `GET /products/:id` -> `views/products/product-details.ejs`
- `POST /products/:id/cart` -> add quantity to cart

### Cart
- `GET /carts` -> `views/cart/carts.ejs`
- `GET /carts/:id` -> `views/cart/cart-details.ejs`
- `POST /carts/:id/remove` -> remove an item and release its reserved Product.units
- `POST /carts/checkout` -> pay on delivery or start M-Pesa
- `GET /carts/payment/:id` -> M-Pesa waiting page
- `GET /carts/payment/:id/status` -> browser polling endpoint

### Packages
- `GET /packages` -> `views/packages/packages.ejs`
- `GET /packages/:id` -> `views/packages/package-details.ejs`

### Stock management
- `GET /stock` -> `views/stock/stock.ejs`
- `GET /stock/new` -> `views/stock/product-entry.ejs`
- `POST /stock` -> create Product + Stock
- `GET /stock/:id` -> `views/stock/stock-entry.ejs`
- `POST /stock/:id` -> update Product + Stock

### M-Pesa
- `POST /mpesa/callback` -> Daraja callback

## App integration

The application should already have:
1. Express
2. Mongoose connected to MongoDB
3. `express-session` (or another session layer exposing `req.sessionID`)
4. Authentication middleware that sets `req.user` for logged-in users
5. `express-ejs-layouts` if the supplied `layout.ejs` is used as a layout

Example route mounting:

```js
app.use(require("./middleware/cartContext"));

app.use("/products", require("./routes/products"));
app.use("/carts", require("./routes/carts"));
app.use("/packages", require("./routes/packages"));
app.use("/stock", require("./routes/stock"));
app.use("/mpesa", require("./routes/mpesa"));
```

If the project uses `express-ejs-layouts`:

```js
const expressLayouts = require("express-ejs-layouts");
app.use(expressLayouts);
app.set("layout", "layout");
```

Static CSS:

```js
app.use(express.static(path.join(__dirname, "public")));
```

The application must parse normal form submissions before these routes:

```js
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
```

## Authentication

`middleware/requireLogin.js` deliberately does not create a new authentication system. It expects the existing project authentication layer to populate `req.user`.

## Product quantity rule

The requested business rule is implemented literally:

**Add to cart**
- Product.units decreases immediately.
- CartItem.qty increases/gets created.
- The Product decrement and Cart update happen in one MongoDB transaction.

**Remove from cart**
- Cart item is removed.
- Its reserved quantity is returned to Product.units.

**Pay upon delivery**
- Cart items become a Package.
- Cart is deleted.
- Product.units is NOT reduced again because it was already reserved when the item entered the cart.

**Pay now**
- Cart quantities are reserved when added to cart.
- Daraja STK Push is initiated.
- Only a confirmed callback creates the Package and clears the Cart.
- A failed M-Pesa callback releases the reserved Product.units.

## MongoDB transaction requirement

The service uses MongoDB transactions for stock/cart consistency. MongoDB transactions require a replica set or sharded cluster. MongoDB Atlas supports this.

## M-Pesa environment variables

```env
MPESA_ENV=sandbox
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_SHORTCODE=your_shortcode
MPESA_PASSKEY=your_passkey
MPESA_CALLBACK_URL=https://YOUR-DOMAIN.example/mpesa/callback
```

For production, use:

```env
MPESA_ENV=production
```

The callback URL must be publicly reachable over HTTPS.

## Important integration note

The supplied original layout linked `/cart`, while the requested route contract is `/carts`. This implementation uses `/carts` consistently.

The supplied Product model calls its image field `image`. This implementation keeps that field and uses an ordinary URL input; no multipart image upload is used.
