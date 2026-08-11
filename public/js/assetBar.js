/* =========================================================
ASSET BAR JAVASCRIPT

FILE:
public/js/assetBar.js

RESPONSIBILITIES:

1. Open Asset Bar
2. Close Asset Bar
3. Close when clicking outside
4. Close with Escape
5. Switch between Animals and Structures
6. Maintain accessibility attributes
   ========================================================= */

/* =========================================================
DOM READY
========================================================= */

document.addEventListener(
"DOMContentLoaded",
function() {

    /* =================================================
       ELEMENTS
    ================================================= */

    const assetBar =
        document.getElementById(
            "assetBar"
        );


    const overlay =
        document.getElementById(
            "assetBarOverlay"
        );


    const openButton =
        document.getElementById(
            "viewPropertyButton"
        );


    const closeButton =
        document.getElementById(
            "closeAssetBar"
        );


    const tabs =
        document.querySelectorAll(
            ".asset-bar-tab"
        );


    const sections =
        document.querySelectorAll(
            ".asset-bar-section"
        );


    /* =================================================
       SAFETY CHECK
    ================================================= */

    if (!assetBar) {

        console.warn(
            "Asset Bar: #assetBar was not found."
        );

        return;

    }


    if (!openButton) {

        console.warn(
            "Asset Bar: #viewPropertyButton was not found."
        );

        return;

    }


    /* =================================================
       OPEN ASSET BAR
    ================================================= */

    function openAssetBar() {


        assetBar.classList.add(
            "active"
        );


        if (overlay) {

            overlay.classList.add(
                "active"
            );

        }


        assetBar.setAttribute(
            "aria-hidden",
            "false"
        );


        openButton.setAttribute(
            "aria-expanded",
            "true"
        );


        if (overlay) {

            overlay.setAttribute(
                "aria-hidden",
                "false"
            );

        }


        /*
         * Prevent the page behind the sidebar
         * from scrolling while the sidebar is open.
         */

        document.body.classList.add(
            "asset-bar-open"
        );


        /*
         * Move keyboard focus to the close
         * button when available.
         */

        if (closeButton) {

            setTimeout(
                function() {

                    closeButton.focus();

                },
                50
            );

        }

    }


    /* =================================================
       CLOSE ASSET BAR
    ================================================= */

    function closeAssetBar() {


        assetBar.classList.remove(
            "active"
        );


        if (overlay) {

            overlay.classList.remove(
                "active"
            );

        }


        assetBar.setAttribute(
            "aria-hidden",
            "true"
        );


        openButton.setAttribute(
            "aria-expanded",
            "false"
        );


        if (overlay) {

            overlay.setAttribute(
                "aria-hidden",
                "true"
            );

        }


        /*
         * Restore page scrolling.
         */

        document.body.classList.remove(
            "asset-bar-open"
        );


        /*
         * Return focus to View Property.
         */

        openButton.focus();

    }


    /* =================================================
       TOGGLE
    ================================================= */

    function toggleAssetBar() {

        if (
            assetBar.classList.contains(
                "active"
            )
        ) {

            closeAssetBar();

        } else {

            openAssetBar();

        }

    }


    /* =================================================
       OPEN BUTTON
    ================================================= */

    openButton.addEventListener(
        "click",
        function(event) {

            event.preventDefault();

            toggleAssetBar();

        }
    );


    /* =================================================
       CLOSE BUTTON
    ================================================= */

    if (closeButton) {

        closeButton.addEventListener(
            "click",
            function(event) {

                event.preventDefault();

                closeAssetBar();

            }
        );

    }


    /* =================================================
       OUTSIDE CLICK / OVERLAY
    ================================================= */

    if (overlay) {

        overlay.addEventListener(
            "click",
            function() {

                closeAssetBar();

            }
        );

    }


    /* =================================================
       ESCAPE KEY
    ================================================= */

    document.addEventListener(
        "keydown",
        function(event) {

            if (
                event.key === "Escape" &&
                assetBar.classList.contains(
                    "active"
                )
            ) {

                closeAssetBar();

            }

        }
    );


    /* =================================================
       CATEGORY SWITCHING
    ================================================= */

    tabs.forEach(
        function(tab) {


            tab.addEventListener(
                "click",
                function() {


                    const category =
                        tab.dataset.assetCategory;


                    if (!category) {

                        return;

                    }


                    /* =================================
                       UPDATE TABS
                    ================================= */

                    tabs.forEach(
                        function(otherTab) {

                            const isActive =
                                otherTab === tab;


                            otherTab.classList.toggle(
                                "active",
                                isActive
                            );


                            otherTab.setAttribute(
                                "aria-selected",
                                String(
                                    isActive
                                )
                            );

                        }
                    );


                    /* =================================
                       UPDATE SECTIONS
                    ================================= */

                    sections.forEach(
                        function(section) {


                            const sectionCategory =
                                section.dataset.assetSection;


                            const isActive =
                                sectionCategory ===
                                category;


                            section.classList.toggle(
                                "active",
                                isActive
                            );


                            section.hidden =
                                !isActive;


                        }
                    );

                }
            );

        }
    );


    /* =================================================
       PROPERTY ITEM HANDLING
       
       At this stage we do not navigate anywhere because
       the property-details route has not been specified.
       
       The selected item's ID/code are exposed through
       dataset values for future navigation.
    ================================================= */

    const propertyItems =
        document.querySelectorAll(
            ".asset-bar-item"
        );


    propertyItems.forEach(
        function(item) {


            item.addEventListener(
                "click",
                function() {


                    const assetId =
                        item.dataset.assetId ||
                        "";


                    const assetCode =
                        item.dataset.assetCode ||
                        "";


                    const assetType =
                        item.dataset.assetType ||
                        "";


                    /*
                     * Store the selected property
                     * temporarily for future use.
                     */

                    assetBar.dataset.selectedId =
                        assetId;


                    assetBar.dataset.selectedCode =
                        assetCode;


                    assetBar.dataset.selectedType =
                        assetType;


                    /*
                     * The actual navigation/action
                     * can be connected once the property
                     * details route is defined.
                     */

                }
            );

        }
    );


}

);