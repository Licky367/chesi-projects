# CoreVester Stock / Product Category Update

This package contains **complete replacement files** for the Stock and Marketplace Product changes requested for `corevester/*`.

The files are intentionally full files, not partial snippets. Replace the files at the exact paths shown below.

## Files included

```text
corevester/
├── controllers/stock.js
├── models/products.js
├── models/stock.js
├── routes/stock.js
├── services/productService.js
├── services/stockService.js
└── views/
    ├── products/products.ejs
    └── stock/
        ├── product-entry.ejs
        ├── stock-entry.ejs
        └── stock.ejs

public/css/
├── shop.css
└── shopt.css
```

`shopt.css` is a complete compatibility copy of `shop.css` because the current CoreVester layout references `/css/shopt.css`, while the repository also contains `/css/shop.css`. Keeping both complete prevents a CSS filename mismatch from breaking the UI.

## 1. Stock grid

`/stock` now uses a real CSS grid:

```text
1  2  3  4  5  6
7  8  9 10 11 12
```

Desktop maximum is six cards per row. Smaller screens use responsive columns instead of horizontal scrolling.

## 2. Products grid

Each category on `/products` also uses the same six-column maximum. Product number seven automatically starts the next row.

## 3. Stock category workflow

`/stock/new` now supports two modes:

### Existing category

Select an existing category from the Stock collection.

The form loads its current:

- name
- category
- buy price
- image
- description
- current warehouse units

For an existing category, the quantity field is **Additional warehouse units**. Those units are added to the existing `Stock.units`.

The image is optional when updating. Leaving it blank preserves the current image.

All other stock metadata can be edited at any time.

### New category

Choose `+ New category`, enter the category information and initial warehouse units, then save.

The service prevents a second active Stock document from being created with the same category.

## 4. Product allocation from `/stock/:id`

Product creation no longer asks the user to re-enter:

- name
- category
- buy price
- image URL
- description

Those values are inherited from the Stock record.

The administrator only supplies:

- units to allocate
- selling price
- substation

## 5. Existing Product behavior

A Product is identified by its Stock source and destination substation.

If that Product already exists:

```text
Product.units += allocated units
```

No duplicate Product is created.

If it does not exist, a new Product is created with the Stock profile information.

In both cases:

```text
Stock.units -= allocated units
```

This preserves the original CoreVester business rule: Stock is the warehouse source and Product.units is the marketplace quantity.

## 6. Product profile synchronization

When an existing Stock category is edited, all active Products that reference that Stock record are synchronized for:

- name
- category
- image
- buy price
- description

Selling price remains a Product-level value because it can differ by marketplace Product/substation allocation.

## 7. Important inventory rule

This update does **not** move inventory out of `models/products.js`.

The flow remains:

```text
Stock
  │
  │ allocate X units
  ▼
Product.units += X
  │
  └── Stock.units -= X
```

Later customer/cart logic may reserve Product.units according to the existing shop workflow.

Do not deduct Product.units a second time merely because a package is delivered.

## 8. Replacement instructions

Copy the files in this package over the files at the same paths in your project.

No database migration is required for these Stock/Product changes.

The existing MongoDB transaction requirement remains the same as the original stock allocation implementation.

## 9. Validation performed

The JavaScript replacement files were checked with `node --check`.

The EJS files are complete templates rather than fragments, and the CSS files are complete stylesheets rather than append-only snippets.
