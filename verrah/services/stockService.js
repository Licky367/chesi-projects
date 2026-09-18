// ==========================================================
// UPDATE STOCK ENTRY
// ==========================================================
//
// EDITING RULES:
//
// 1. body.units represents the NEW TOTAL warehouse units.
//
// 2. The new total MUST NOT be less than the current units.
//
// 3. If the new total is greater than the current units,
//    a buy price for the ADDITIONAL units is mandatory.
//
// 4. If the new total equals the current units,
//    no additional buy price is required.
//
// 5. additionalUnits is calculated internally:
//
//      additionalUnits = newTotalUnits - currentUnits
//
// 6. Only the additional units are added to the stock balance.
//
// 7. The supplied buy price is the purchase price for the
//    newly added units.
//
// 8. Existing stock units are not retroactively repriced.
//
// ==========================================================

exports.updateStockEntry = async (
    stockId,
    body
) => {

    // ------------------------------------------------------
    // VALIDATE STOCK ID
    // ------------------------------------------------------

    if (
        !mongoose.isValidObjectId(
            stockId
        )
    ) {
        throw new Error(
            "Invalid stock subcategory."
        );
    }


    // ------------------------------------------------------
    // GET EXISTING STOCK
    // ------------------------------------------------------

    const stock =
        await Stock.findOne({
            _id: stockId,
            isActive: true
        });

    if (!stock) {
        throw new Error(
            "Stock subcategory not found."
        );
    }


    // ------------------------------------------------------
    // CURRENT WAREHOUSE UNITS
    // ------------------------------------------------------
    //
    // This is the quantity that already exists.
    //
    // Example:
    //
    // Current stock = 100
    //
    // ------------------------------------------------------

    const currentUnits =
        wholeNumber(
            stock.units || 0,
            "Current warehouse units"
        );


    // ------------------------------------------------------
    // NEW TOTAL UNITS
    // ------------------------------------------------------
    //
    // IMPORTANT:
    //
    // The form now sends:
    //
    //     units = NEW TOTAL
    //
    // NOT:
    //
    //     additionalUnits
    //
    // ------------------------------------------------------

    if (
        body.units === "" ||
        body.units == null
    ) {
        throw new Error(
            "Warehouse units are required."
        );
    }

    const newTotalUnits =
        wholeNumber(
            body.units,
            "New warehouse units",
            true
        );


    // ------------------------------------------------------
    // PREVENT STOCK REDUCTION
    // ------------------------------------------------------

    if (
        newTotalUnits <
        currentUnits
    ) {
        throw new Error(
            `Warehouse units cannot be reduced. The current warehouse balance is ${currentUnits} units.`
        );
    }


    // ------------------------------------------------------
    // CALCULATE ADDITIONAL UNITS
    // ------------------------------------------------------

    const additionalUnits =
        newTotalUnits -
        currentUnits;


    // ------------------------------------------------------
    // BUY PRICE
    // ------------------------------------------------------
    //
    // If additional units are being added:
    //
    //     buyPrice MUST be supplied.
    //
    // If no additional units are being added:
    //
    //     a new buy price is NOT required.
    //
    // The existing stock buy price remains unchanged.
    // ------------------------------------------------------

    let additionalBuyPrice = null;

    if (additionalUnits > 0) {

        if (
            body.buyPrice === "" ||
            body.buyPrice == null
        ) {
            throw new Error(
                `A buy price for the ${additionalUnits} additional unit${additionalUnits === 1 ? "" : "s"} is required.`
            );
        }

        additionalBuyPrice =
            number(
                body.buyPrice,
                "Buy price for additional units",
                true
            );

    }


    // ------------------------------------------------------
    // CATEGORY
    //
    // If the form supplies an ID, convert it to name.
    // If no category was supplied, retain existing name.
    // ------------------------------------------------------

    let category;

    if (text(body.category)) {

        category =
            await validateCategory(
                body.category
            );

    } else {

        category =
            text(stock.category)
                .toLowerCase();

        if (!category) {
            throw new Error(
                "Stock category is missing."
            );
        }

    }


    // ------------------------------------------------------
    // SUBCATEGORY
    // ------------------------------------------------------

    const subcategory =
        cleanSubcategory(
            body.subcategory ||
            stock.subcategory
        );

    if (!subcategory) {
        throw new Error(
            "Subcategory is required."
        );
    }


    // ------------------------------------------------------
    // DELIVERY DAYS
    // ------------------------------------------------------

    const days =
        wholeNumber(
            body.days ??
            stock.days ??
            0,
            "Delivery days"
        );


    // ------------------------------------------------------
    // DIRECTIONS
    // ------------------------------------------------------

    const directionsOfUse =
        cleanDirectionsOfUse(
            body.directionsOfUse
        );


    // ------------------------------------------------------
    // DUPLICATE CHECK
    // ------------------------------------------------------

    const duplicate =
        await Stock.findOne({
            _id: {
                $ne: stock._id
            },

            category,

            subcategory,

            isActive: true
        });

    if (duplicate) {
        throw new Error(
            `The subcategory "${subcategory}" already belongs to another stock record under the selected category.`
        );
    }


    // ======================================================
    // UPDATE BASIC STOCK INFORMATION
    // ======================================================

    stock.name =
        subcategory;

    stock.category =
        category;

    stock.subcategory =
        subcategory;

    stock.days =
        days;

    stock.description =
        text(body.description);


    // ======================================================
    // IMAGE
    // ======================================================

    const image =
        text(body.image);

    if (image) {
        stock.image =
            image;
    }


    // ======================================================
    // UNITS
    // ======================================================
    //
    // The submitted quantity is now the new total.
    //
    // Example:
    //
    // current = 100
    // new     = 130
    // added   = 30
    //
    // Final stock.units = 130
    //
    // ======================================================

    stock.units =
        newTotalUnits;


    // ======================================================
    // BUY PRICE
    // ======================================================
    //
    // IMPORTANT:
    //
    // We only change stock.buyPrice when new units
    // have actually been purchased.
    //
    // If units remain unchanged:
    //
    //     keep the existing buyPrice.
    //
    // If units increase:
    //
    //     use the newly supplied buy price.
    //
    // ======================================================

    if (additionalUnits > 0) {

        stock.buyPrice =
            additionalBuyPrice;

    }


    // ======================================================
    // DIRECTIONS OF USE
    // ======================================================

    if (
        directionsOfUse !==
        undefined
    ) {

        stock.directionsOfUse =
            directionsOfUse ||
            undefined;

    }


    // ======================================================
    // SAVE STOCK
    // ======================================================

    await stock.save();


    // ======================================================
    // RESOLVE CATEGORY DOCUMENT
    //
    // Product.category expects Category._id.
    //
    // Stock.category stores Category.name.
    // ======================================================

    const categoryDocument =
        await getCategoryByName(
            stock.category
        );

    if (!categoryDocument) {
        throw new Error(
            "The selected category no longer exists or is inactive."
        );
    }


    // ======================================================
    // SYNCHRONIZE PRODUCTS
    // ======================================================

    /*
     * Do NOT change Product.units here.
     *
     * Product.units represents stock already allocated
     * to products/substations, while stock.units represents
     * the warehouse balance.
     *
     * The stock update is therefore limited to the stock
     * record and the product's descriptive information.
     */

    const productSync = {
        $set: {

            name:
                stock.name,

            category:
                categoryDocument._id,

            subcategory:
                stock.subcategory,

            days:
                Number(
                    stock.days || 0
                ),

            image:
                stock.image || "",

            description:
                stock.description || ""

        }
    };


    /*
     * Only update Product.buyPrice when a new purchase
     * price was actually supplied for additional units.
     *
     * This prevents an unchanged-unit edit from forcing
     * a new buy price onto existing products.
     */

    if (additionalUnits > 0) {

        productSync.$set.buyPrice =
            Number(
                additionalBuyPrice
            );

    }


    // ======================================================
    // PRODUCT DIRECTIONS
    // ======================================================

    const productDirections =
        directionsForProduct(
            stock
        );

    if (productDirections) {

        productSync.$set
            .directionsOfUse =
            productDirections;

    } else {

        productSync.$unset = {
            directionsOfUse: 1
        };

    }


    // ======================================================
    // UPDATE PRODUCTS
    // ======================================================

    await Product.updateMany(
        {
            stock: stock._id,

            isActive: true
        },
        productSync
    );


    // ======================================================
    // SYNCHRONIZE SUBSTATION INVENTORY
    // ======================================================

    const productIds =
        await Product.find({
            stock: stock._id
        }).distinct("_id");


    if (productIds.length) {

        await Substation.updateMany(
            {
                "productInventory.productId":
                    {
                        $in: productIds
                    }
            },
            {
                $set: {

                    "productInventory.$[item].productName":
                        stock.name,

                    "productInventory.$[item].category":
                        categoryDocument._id,

                    "productInventory.$[item].subcategory":
                        stock.subcategory,

                    "productInventory.$[item].days":
                        Number(
                            stock.days || 0
                        ),

                    "productInventory.$[item].updatedAt":
                        new Date()

                }
            },
            {
                arrayFilters: [
                    {
                        "item.productId":
                            {
                                $in:
                                    productIds
                            }
                    }
                ]
            }
        );

    }


    // ======================================================
    // RECALCULATE STOCK TOTALS
    // ======================================================

    await recalculateStockTotals();


    // ======================================================
    // RETURN UPDATED STOCK
    // ======================================================

    return Stock.findById(
        stock._id
    ).lean();
};