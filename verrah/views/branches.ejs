<%
/* ==========================================================
   views/branch.ejs

   VERRAH COSMETICS
   BRANCH / LOCATION DETAILS

   EXPECTED DATA:
       substation
       currentUser
       error
   ========================================================== */
%>

<%- contentFor("body") %>

<link
    rel="stylesheet"
    href="/css/branch.css"
>

<section class="branch-page">

    <% if (error) { %>

        <div class="branch-error">

            <i class="fas fa-circle-exclamation"></i>

            <span>
                <%= error %>
            </span>

        </div>

    <% } else if (substation) { %>


        <!-- ==================================================
             BRANCH HEADER
        ================================================== -->

        <div class="branch-header">

            <div class="branch-header-icon">

                <% if (
                    substation.substationIcon &&
                    String(substation.substationIcon).trim()
                ) { %>

                    <img
                        src="<%= substation.substationIcon %>"
                        alt="<%= substation.name %>"
                        onerror="
                            this.style.display='none';
                            this.nextElementSibling.style.display='flex';
                        "
                    >

                    <div
                        class="branch-icon-fallback"
                        style="display:none;"
                    >
                        <i class="fas fa-store"></i>
                    </div>

                <% } else { %>

                    <div class="branch-icon-fallback">
                        <i class="fas fa-store"></i>
                    </div>

                <% } %>

            </div>


            <div class="branch-header-content">

                <h1>
                    <%= substation.name %>
                </h1>

                <% if (substation.location) { %>

                    <p class="branch-location">

                        <i class="fas fa-location-dot"></i>

                        <%= substation.location %>

                    </p>

                <% } %>

            </div>

        </div>


        <!-- ==================================================
             BRANCH DESCRIPTION
        ================================================== -->

        <% if (substation.description) { %>

            <div class="branch-description">

                <h2>
                    About This Location
                </h2>

                <p>
                    <%= substation.description %>
                </p>

            </div>

        <% } %>


        <!-- ==================================================
             PRODUCTS
        ================================================== -->

        <section class="branch-products">

            <div class="branch-section-heading">

                <h2>
                    Products Available Here
                </h2>

                <p>
                    Explore products currently available
                    at <%= substation.name %>.
                </p>

            </div>


            <% if (
                Array.isArray(substation.productInventory) &&
                substation.productInventory.length > 0
            ) { %>

                <div class="branch-product-grid">

                    <% substation.productInventory.forEach(function(product) { %>

                        <article class="branch-product-card">

                            <div class="branch-product-icon">

                                <i class="fas fa-box"></i>

                            </div>


                            <div class="branch-product-content">

                                <h3>
                                    <%= product.productName %>
                                </h3>


                                <% if (product.category) { %>

                                    <p class="branch-product-category">
                                        <%= product.category %>
                                    </p>

                                <% } %>


                                <% if (product.subcategory) { %>

                                    <p class="branch-product-subcategory">
                                        <%= product.subcategory %>
                                    </p>

                                <% } %>


                                <div class="branch-product-stock">

                                    <span>
                                        Available
                                    </span>

                                    <strong>
                                        <%= product.units %>
                                    </strong>

                                </div>

                            </div>

                        </article>

                    <% }); %>

                </div>

            <% } else { %>

                <div class="branch-empty">

                    <i class="fas fa-box-open"></i>

                    <h3>
                        No products listed yet
                    </h3>

                    <p>
                        Products available at this location
                        will appear here.
                    </p>

                </div>

            <% } %>

        </section>


        <!-- ==================================================
             BACK TO HOME
        ================================================== -->

        <div class="branch-actions">

            <a
                href="/"
                class="branch-back-button"
            >

                <i class="fas fa-arrow-left"></i>

                Back to Home

            </a>

        </div>


    <% } else { %>


        <!-- ==================================================
             LOCATION NOT FOUND
        ================================================== -->

        <div class="branch-empty">

            <i class="fas fa-store-slash"></i>

            <h2>
                Location Not Found
            </h2>

            <p>
                The requested Verrah Cosmetics location
                could not be found.
            </p>

            <a
                href="/"
                class="branch-back-button"
            >

                <i class="fas fa-arrow-left"></i>

                Back to Home

            </a>

        </div>


    <% } %>

</section>