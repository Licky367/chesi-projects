<!-- =========================================================
     views/update/storage/feed-update-cards.ejs

     PURPOSE:
         Dynamic Animal Feed Update Cards

     EXPECTED VARIABLES:

         dairy
         dairyId
         parentId

         storage
         storageId
         storageType

         items
         availableItems
         feedUpdateItems
         agroStoreItems

     IMPORTANT:

         This file DOES NOT contain hardcoded feed data.

         The controller supplies the actual records from:

             services/storage/contents.js

         Each card represents one actual feed record.

     EXPECTED FEED RECORD FIELDS:

         _id
         name
         type
         quantity
         unit
         code
         assetCode
         dwellNumber
         image / displayImage / profileImage

========================================================= -->


<div
    class="feed-update-cards"
    id="feed-update-cards"
    data-dairy-id="<%= dairyId || parentId || '' %>"
    data-storage-id="<%= storageId || storage?._id || '' %>"
>


    <!-- =====================================================
         HEADER
    ====================================================== -->

    <div class="feed-update-header mb-3">

        <div>

            <h3 class="mb-1">
                Animal Feeds
            </h3>

            <p class="text-muted mb-0">
                Update the quantity of feeds currently stored
                in this AgroStore.
            </p>

        </div>


        <% if (storage) { %>

            <div class="small text-muted mt-2">

                <strong>
                    <%= storage.displayName ||
                        storage.name ||
                        'AgroStore' %>
                </strong>

                <% if (
                    storage.roomNumber !== undefined &&
                    storage.roomNumber !== null &&
                    String(storage.roomNumber).trim() !== ''
                ) { %>

                    <span class="ms-1">
                        · Room
                        <%= storage.roomNumber %>
                    </span>

                <% } %>

            </div>

        <% } %>

    </div>



    <!-- =====================================================
         STORAGE TYPE GUARD
    ====================================================== -->

    <% if (
        storageType &&
        storageType !== 'agroStore'
    ) { %>

        <div class="alert alert-info">

            Animal feed quantity cards are available only
            inside an AgroStore.

        </div>


    <% } else { %>



        <!-- =================================================
             RESOLVE FEED ARRAY
        ================================================== -->

        <%
            /*
             * Prefer feedUpdateItems because the controller
             * explicitly prepares this array for this view.
             *
             * The other names are fallbacks so this partial
             * remains compatible with the variables supplied
             * by the controller.
             */

            const feedItems =
                Array.isArray(feedUpdateItems)
                    ? feedUpdateItems
                    : (
                        Array.isArray(agroStoreItems)
                            ? agroStoreItems
                            : (
                                Array.isArray(items)
                                    ? items
                                    : (
                                        Array.isArray(
                                            availableItems
                                        )
                                            ? availableItems
                                            : []
                                    )
                            )
                    );
        %>



        <!-- =================================================
             NO FEEDS
        ================================================== -->

        <% if (feedItems.length === 0) { %>

            <div
                class="card shadow-sm border-0"
                style="border-radius: 14px;"
            >

                <div class="card-body text-center py-5">

                    <div
                        class="mb-3"
                        style="
                            width:64px;
                            height:64px;
                            margin:0 auto;
                            border-radius:50%;
                            background:#f1f3f5;
                            display:flex;
                            align-items:center;
                            justify-content:center;
                            font-size:28px;
                        "
                    >
                        🐄
                    </div>


                    <h5 class="mb-2">
                        No animal feeds found
                    </h5>


                    <p class="text-muted mb-0">

                        There are currently no animal feed
                        records with a quantity greater than
                        zero in this AgroStore.

                    </p>

                </div>

            </div>



        <% } else { %>



            <!-- =================================================
                 FEED CARDS
            ================================================== -->

            <div class="row g-3">


                <% feedItems.forEach(function(feed, index) { %>


                    <%
                        /*
                         * -------------------------------------------------
                         * FEED ID
                         * -------------------------------------------------
                         */

                        const feedId =
                            feed?._id
                                ? String(feed._id)
                                : '';


                        /*
                         * -------------------------------------------------
                         * FEED NAME
                         * -------------------------------------------------
                         */

                        const feedName =
                            feed?.name ||
                            feed?.feedName ||
                            'Animal Feed';


                        /*
                         * -------------------------------------------------
                         * QUANTITY
                         * -------------------------------------------------
                         */

                        const feedQuantity =
                            feed?.quantity !== undefined &&
                            feed?.quantity !== null
                                ? feed.quantity
                                : 0;


                        /*
                         * -------------------------------------------------
                         * UNIT
                         * -------------------------------------------------
                         */

                        const feedUnit =
                            feed?.unit ||
                            'kg';


                        /*
                         * -------------------------------------------------
                         * CODE
                         * -------------------------------------------------
                         */

                        const feedCode =
                            feed?.code !== undefined &&
                            feed?.code !== null
                                ? feed.code
                                : '';


                        /*
                         * -------------------------------------------------
                         * IMAGE
                         * -------------------------------------------------
                         *
                         * Support the common image fields used by
                         * the Dairy records.
                         */

                        const feedImage =
                            feed?.displayImage ||
                            feed?.image ||
                            feed?.profileImage ||
                            '';


                        /*
                         * -------------------------------------------------
                         * IMAGE URL
                         * -------------------------------------------------
                         *
                         * If the database already stores a complete
                         * URL, use it directly.
                         *
                         * Otherwise treat it as a normal uploads
                         * filename.
                         */

                        let imageUrl = '';

                        if (feedImage) {

                            const imageString =
                                String(feedImage).trim();

                            if (
                                imageString.startsWith('/') ||
                                imageString.startsWith('http://') ||
                                imageString.startsWith('https://')
                            ) {

                                imageUrl =
                                    imageString;

                            } else {

                                imageUrl =
                                    `/uploads/${encodeURIComponent(
                                        imageString
                                    )}`;

                            }

                        }


                        /*
                         * -------------------------------------------------
                         * FORM ACTION
                         * -------------------------------------------------
                         */

                        const updateUrl =
                            dairyId &&
                            storageId &&
                            feedId
                                ? `/storage/${encodeURIComponent(
                                      dairyId
                                  )}/contents/${encodeURIComponent(
                                      storageId
                                  )}/quantity`
                                : '';


                        /*
                         * -------------------------------------------------
                         * DETAILS URL
                         * -------------------------------------------------
                         *
                         * This matches the controller's requested
                         * Dairy content-item route.
                         */

                        const detailsUrl =
                            parentId &&
                            storageId &&
                            feedId
                                ? `/dairy/${encodeURIComponent(
                                      parentId
                                  )}/contents/${encodeURIComponent(
                                      storageId
                                  )}/details/${encodeURIComponent(
                                      feedId
                                  )}`
                                : '';
                    %>



                    <!-- =============================================
                         CARD
                    ============================================== -->

                    <div class="col-12 col-md-6 col-xl-4">


                        <div
                            class="card h-100 shadow-sm border-0 feed-update-card"
                            data-feed-id="<%= feedId %>"
                            style="
                                border-radius:16px;
                                overflow:hidden;
                            "
                        >


                            <!-- =====================================
                                 IMAGE
                            ====================================== -->

                            <div
                                class="feed-image-wrapper"
                                style="
                                    height:190px;
                                    background:#f4f6f7;
                                    display:flex;
                                    align-items:center;
                                    justify-content:center;
                                    overflow:hidden;
                                "
                            >

                                <% if (imageUrl) { %>

                                    <img
                                        src="<%= imageUrl %>"
                                        alt="<%= feedName %>"
                                        loading="lazy"
                                        style="
                                            width:100%;
                                            height:100%;
                                            object-fit:cover;
                                        "
                                        onerror="
                                            this.style.display='none';
                                            this.nextElementSibling.style.display='flex';
                                        "
                                    >


                                    <div
                                        style="
                                            display:none;
                                            width:100%;
                                            height:100%;
                                            align-items:center;
                                            justify-content:center;
                                            font-size:52px;
                                        "
                                    >
                                        🌾
                                    </div>


                                <% } else { %>


                                    <div
                                        style="
                                            width:100%;
                                            height:100%;
                                            display:flex;
                                            align-items:center;
                                            justify-content:center;
                                            font-size:52px;
                                        "
                                    >
                                        🌾
                                    </div>


                                <% } %>

                            </div>



                            <!-- =====================================
                                 CARD BODY
                            ====================================== -->

                            <div class="card-body p-3">


                                <!-- =================================
                                     NAME
                                ================================== -->

                                <div
                                    class="d-flex justify-content-between align-items-start mb-2"
                                >

                                    <div>

                                        <h5
                                            class="mb-1"
                                            style="
                                                font-weight:700;
                                                color:#222;
                                            "
                                        >
                                            <%= feedName %>
                                        </h5>


                                        <% if (feedCode !== '') { %>

                                            <div
                                                class="small text-muted"
                                            >
                                                Code:
                                                <%= feedCode %>
                                            </div>

                                        <% } %>

                                    </div>


                                    <span
                                        class="badge rounded-pill"
                                        style="
                                            background:#e8f5e9;
                                            color:#0b5d1e;
                                        "
                                    >
                                        Feed
                                    </span>

                                </div>



                                <!-- =================================
                                     CURRENT QUANTITY
                                ================================== -->

                                <div
                                    class="mb-3"
                                    style="
                                        background:#f8f9fa;
                                        border-radius:12px;
                                        padding:12px;
                                    "
                                >

                                    <div
                                        class="small text-muted mb-1"
                                    >
                                        Current Quantity
                                    </div>


                                    <div
                                        style="
                                            font-size:24px;
                                            font-weight:700;
                                            color:#0b5d1e;
                                        "
                                    >

                                        <span
                                            class="current-feed-quantity"
                                            data-feed-id="<%= feedId %>"
                                        >
                                            <%= feedQuantity %>
                                        </span>


                                        <span
                                            class="small"
                                            style="
                                                font-weight:600;
                                            "
                                        >
                                            <%= feedUnit %>
                                        </span>

                                    </div>

                                </div>



                                <!-- =================================
                                     UPDATE FORM
                                ================================== -->

                                <% if (updateUrl) { %>


                                    <form
                                        method="POST"
                                        action="<%= updateUrl %>"
                                        class="feed-update-form"
                                        data-feed-id="<%= feedId %>"
                                    >


                                        <!-- =========================
                                             ITEM ID
                                        ========================== -->

                                        <input
                                            type="hidden"
                                            name="itemId"
                                            value="<%= feedId %>"
                                        >



                                        <!-- =========================
                                             QUANTITY
                                        ========================== -->

                                        <div class="mb-3">

                                            <label
                                                class="form-label"
                                                for="quantity-<%= feedId %>"
                                            >
                                                New Quantity
                                            </label>


                                            <div class="input-group">

                                                <input
                                                    id="quantity-<%= feedId %>"
                                                    type="number"
                                                    name="quantity"
                                                    class="form-control feed-quantity-input"
                                                    value="<%= feedQuantity %>"
                                                    min="0"
                                                    step="any"
                                                    inputmode="decimal"
                                                    required
                                                >


                                                <span
                                                    class="input-group-text"
                                                >
                                                    <%= feedUnit %>
                                                </span>

                                            </div>

                                            <div
                                                class="form-text"
                                            >
                                                Set quantity to
                                                <strong>0</strong>
                                                to remove this feed
                                                from the AgroStore.

                                            </div>

                                        </div>



                                        <!-- =========================
                                             UNIT
                                        ========================== -->

                                        <input
                                            type="hidden"
                                            name="unit"
                                            value="<%= feedUnit %>"
                                        >



                                        <!-- =========================
                                             ACTIONS
                                        ========================== -->

                                        <div
                                            class="d-flex gap-2 flex-wrap"
                                        >

                                            <button
                                                type="submit"
                                                class="btn flex-grow-1"
                                                style="
                                                    background:#0b5d1e;
                                                    color:#fff;
                                                    border-radius:10px;
                                                "
                                            >
                                                Update Quantity
                                            </button>


                                            <% if (detailsUrl) { %>

                                                <a
                                                    href="<%= detailsUrl %>"
                                                    class="btn btn-outline-secondary"
                                                    style="
                                                        border-radius:10px;
                                                    "
                                                >
                                                    Details
                                                </a>

                                            <% } %>

                                        </div>


                                    </form>


                                <% } else { %>


                                    <!-- =================================
                                         MISSING ROUTE DATA
                                    ================================== -->

                                    <div
                                        class="alert alert-warning mb-0"
                                    >

                                        Feed update information is
                                        incomplete.

                                    </div>


                                <% } %>


                            </div>


                        </div>


                    </div>


                <% }); %>


            </div>


        <% } %>


    <% } %>


</div>



<!-- =========================================================
     OPTIONAL CARD FEEDBACK / CLIENT-SIDE BEHAVIOUR
========================================================= -->

<script>

(function () {

    "use strict";


    /*
     * Prevent accidental negative quantities.
     */

    const quantityInputs =
        document.querySelectorAll(
            "#feed-update-cards .feed-quantity-input"
        );


    quantityInputs.forEach(
        function (input) {

            input.addEventListener(
                "input",
                function () {

                    const value =
                        Number(
                            input.value
                        );


                    if (
                        Number.isFinite(value) &&
                        value < 0
                    ) {

                        input.value = "0";

                    }

                }
            );

        }
    );



    /*
     * Confirmation when quantity is being changed to zero.
     *
     * The server remains authoritative.
     */

    const forms =
        document.querySelectorAll(
            "#feed-update-cards .feed-update-form"
        );


    forms.forEach(
        function (form) {

            form.addEventListener(
                "submit",
                function (event) {

                    const quantityInput =
                        form.querySelector(
                            'input[name="quantity"]'
                        );


                    if (!quantityInput) {

                        return;

                    }


                    const quantity =
                        Number(
                            quantityInput.value
                        );


                    if (
                        Number.isFinite(quantity) &&
                        quantity === 0
                    ) {

                        const confirmed =
                            window.confirm(
                                "Set this feed quantity to zero and remove it from this AgroStore?"
                            );


                        if (!confirmed) {

                            event.preventDefault();

                        }

                    }

                }
            );

        }
    );

})();

</script>