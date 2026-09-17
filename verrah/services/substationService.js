<%
/* ==========================================================
   PACKAGE SUBSTATION DIRECTIONS
   ==========================================================

   IMPORTANT:
   packageSubstation is the authoritative customer
   pickup/destination substation.

   The Substation model contains:
       directions
       gps.latitude
       gps.longitude

   This section displays the stored human-readable
   directions from:
       packageDestination.directions

   substation is retained only as a compatibility fallback.
   ========================================================== */

const packageDestination =
    (typeof packageSubstation !== "undefined" &&
     packageSubstation)
        ? packageSubstation

        : (
            typeof packageDoc !== "undefined" &&
            packageDoc &&
            packageDoc.packageSubstation
                ? packageDoc.packageSubstation

                : (
                    typeof substation !== "undefined" &&
                    substation
                        ? substation
                        : null
                )
          );

const packageDirections =
    packageDestination &&
    typeof packageDestination.directions === "string"
        ? packageDestination.directions.trim()
        : "";

%>

<section class="verah-sales-activities">

    <% if (
        !error &&
        packageDestination &&
        packageDirections
    ) { %>

        <div class="verah-sales-content">

            <h2>
                Directions
            </h2>

            <p class="verah-sales-description">
                <%= packageDirections %>
            </p>

        </div>

    <% } %>

</section>