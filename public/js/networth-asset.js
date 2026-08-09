/* ==========================================================
   NET WORTH ASSET PAGE
   public/js/networth-asset.js

   RESPONSIBILITIES:

   1. Profile image preview
   2. AJAX asset update
   3. Prevent normal page reload
   4. Display success/error feedback
   5. Update visible page values after save
========================================================== */


/* ==========================================================
   DOM READY
========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        initializeAssetPage();

    }
);


/* ==========================================================
   INITIALIZE
========================================================== */

function initializeAssetPage() {

    const form =
        document.getElementById(
            "networthAssetForm"
        );


    if (!form) {

        return;

    }


    initializeImagePreview();

    initializeFormSubmission();

}


/* ==========================================================
   PROFILE IMAGE PREVIEW
========================================================== */

function initializeImagePreview() {

    const input =
        document.getElementById(
            "profileImage"
        );


    const preview =
        document.getElementById(
            "profileImagePreview"
        );


    const placeholder =
        document.getElementById(
            "profileImagePlaceholder"
        );


    if (!input || !preview) {

        return;

    }


    input.addEventListener(
        "change",
        function() {

            const file =
                input.files &&
                input.files[0];


            if (!file) {

                return;

            }


            if (
                !file.type.startsWith(
                    "image/"
                )
            ) {

                showSaveStatus(
                    "Please select a valid image file.",
                    "error"
                );

                input.value = "";

                return;

            }


            const reader =
                new FileReader();


            reader.onload =
                function(event) {

                    preview.src =
                        event.target.result;

                    preview.style.display =
                        "block";


                    if (placeholder) {

                        placeholder.style.display =
                            "none";

                    }

                };


            reader.readAsDataURL(
                file
            );

        }
    );

}


/* ==========================================================
   FORM SUBMISSION
========================================================== */

function initializeFormSubmission() {

    const form =
        document.getElementById(
            "networthAssetForm"
        );


    if (!form) {

        return;

    }


    form.addEventListener(
        "submit",
        handleAssetSubmit
    );

}


/* ==========================================================
   HANDLE ASSET SUBMIT
========================================================== */

async function handleAssetSubmit(
    event
) {

    event.preventDefault();


    const form =
        event.currentTarget;


    const button =
        document.getElementById(
            "saveAssetButton"
        );


    if (!form) {

        return;

    }


    hideSaveStatus();


    if (button) {

        button.disabled =
            true;

        button.dataset.originalText =
            button.textContent.trim();

        button.textContent =
            "Saving...";

    }


    try {

        const formData =
            new FormData(
                form
            );


        /*
         * The hidden _method field remains:
         *
         *     PUT
         *
         * The server-side route can therefore
         * continue using the existing method
         * handling.
         */


        const response =
            await fetch(
                form.action,
                {

                    method: "POST",

                    body: formData,

                    headers: {

                        "X-Requested-With":
                            "XMLHttpRequest",

                        "Accept":
                            "application/json"

                    }

                }
            );


        const contentType =
            response.headers.get(
                "content-type"
            ) || "";


        let result;


        if (
            contentType.includes(
                "application/json"
            )
        ) {

            result =
                await response.json();

        } else {

            const text =
                await response.text();


            throw new Error(
                text ||
                "The server returned an unexpected response."
            );

        }


        if (!response.ok) {

            throw new Error(
                result.message ||
                "Unable to save asset."
            );

        }


        /*
         * The controller should return:
         *
         * {
         *     success: true,
         *     message: "...",
         *     asset: {...}
         * }
         *
         * The returned asset is used to update
         * the page immediately.
         */

        if (
            result.asset
        ) {

            updatePageFromAsset(
                result.asset
            );

        }


        showSaveStatus(
            result.message ||
            "Asset updated successfully.",
            "success"
        );


        /*
         * Remove the selected file after a
         * successful upload.
         */

        const imageInput =
            document.getElementById(
                "profileImage"
            );


        if (imageInput) {

            imageInput.value =
                "";

        }


    } catch (error) {

        console.error(
            "Error updating Net Worth asset:",
            error
        );


        showSaveStatus(
            error.message ||
            "Unable to save asset.",
            "error"
        );


    } finally {

        if (button) {

            button.disabled =
                false;


            button.textContent =
                button.dataset.originalText ||
                "Save Changes";

        }

    }

}


/* ==========================================================
   UPDATE PAGE FROM SERVER RESPONSE
========================================================== */

function updatePageFromAsset(
    asset
) {

    if (!asset) {

        return;

    }


    /* ======================================================
       NAME
    ====================================================== */

    const nameInput =
        document.getElementById(
            "name"
        );


    const pageTitle =
        document.getElementById(
            "assetPageTitle"
        );


    if (
        nameInput &&
        asset.name !== undefined
    ) {

        nameInput.value =
            asset.name || "";

    }


    if (
        pageTitle &&
        asset.name !== undefined
    ) {

        pageTitle.textContent =
            asset.name || "Asset";

    }


    /* ======================================================
       TYPE
    ====================================================== */

    const typeInput =
        document.getElementById(
            "type"
        );


    if (
        typeInput &&
        asset.type !== undefined
    ) {

        typeInput.value =
            asset.type || "";

    }


    /* ======================================================
       BUYING PRICE
    ====================================================== */

    const buyingPriceInput =
        document.getElementById(
            "buyingPrice"
        );


    if (
        buyingPriceInput &&
        asset.buyingPrice !== undefined
    ) {

        buyingPriceInput.value =
            asset.buyingPrice;

    }


    /* ======================================================
       CURRENT WORTH
    ====================================================== */

    const currentWorthInput =
        document.getElementById(
            "currentWorth"
        );


    if (
        currentWorthInput &&
        asset.currentWorth !== undefined
    ) {

        currentWorthInput.value =
            asset.currentWorth;

    }


    /* ======================================================
       DESCRIPTION
    ====================================================== */

    const descriptionInput =
        document.getElementById(
            "description"
        );


    if (
        descriptionInput &&
        asset.description !== undefined
    ) {

        descriptionInput.value =
            asset.description || "";

    }


    /* ======================================================
       CONDITION
    ====================================================== */

    const conditionInput =
        document.getElementById(
            "condition"
        );


    if (
        conditionInput &&
        asset.condition !== undefined
    ) {

        conditionInput.value =
            asset.condition || "";

    }


    /* ======================================================
       PHYSICAL LOCATION
    ====================================================== */

    const locationInput =
        document.getElementById(
            "location"
        );


    if (
        locationInput &&
        asset.location !== undefined
    ) {

        locationInput.value =
            asset.location || "";

    }


    /* ======================================================
       STATUS
    ====================================================== */

    const statusInput =
        document.getElementById(
            "status"
        );


    if (
        statusInput &&
        asset.status !== undefined
    ) {

        statusInput.value =
            asset.status || "";

    }


    /* ======================================================
       VALUATION DATE
    ====================================================== */

    const valuationDateInput =
        document.getElementById(
            "valuationDate"
        );


    if (
        valuationDateInput &&
        asset.valuationDate
    ) {

        valuationDateInput.value =
            formatDateForInput(
                asset.valuationDate
            );

    }


    /* ======================================================
       ASSET CODE / PARENT FARM
    ====================================================== */

    const assetCodeInput =
        document.getElementById(
            "assetCode"
        );


    if (
        assetCodeInput &&
        asset.assetCode !== undefined
    ) {

        if (
            asset.assetCode === null ||
            asset.assetCode === undefined
        ) {

            assetCodeInput.value =
                "";

        } else {

            assetCodeInput.value =
                String(
                    asset.assetCode
                );

        }

    }


    /* ======================================================
       PROFILE IMAGE
    ====================================================== */

    if (
        asset.profileImage
    ) {

        updateProfileImage(
            asset.profileImage
        );

    }

}


/* ==========================================================
   UPDATE PROFILE IMAGE
========================================================== */

function updateProfileImage(
    imageUrl
) {

    const preview =
        document.getElementById(
            "profileImagePreview"
        );


    const placeholder =
        document.getElementById(
            "profileImagePlaceholder"
        );


    if (!preview) {

        return;

    }


    preview.src =
        imageUrl;


    preview.style.display =
        "block";


    if (placeholder) {

        placeholder.style.display =
            "none";

    }

}


/* ==========================================================
   FORMAT DATE FOR DATE INPUT
========================================================== */

function formatDateForInput(
    value
) {

    if (!value) {

        return "";

    }


    const date =
        new Date(
            value
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "";

    }


    const year =
        date.getFullYear()
            .toString()
            .padStart(
                4,
                "0"
            );


    const month =
        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        );


    return `${year}-${month}-${day}`;

}


/* ==========================================================
   SHOW SAVE STATUS
========================================================== */

function showSaveStatus(
    message,
    type
) {

    const status =
        document.getElementById(
            "formSaveStatus"
        );


    if (!status) {

        return;

    }


    status.textContent =
        message;


    status.className =
        "form-save-status " +
        (
            type === "success"
                ? "success"
                : "error"
        );


    status.scrollIntoView({

        behavior: "smooth",

        block: "nearest"

    });

}


/* ==========================================================
   HIDE SAVE STATUS
========================================================== */

function hideSaveStatus() {

    const status =
        document.getElementById(
            "formSaveStatus"
        );


    if (!status) {

        return;

    }


    status.textContent =
        "";

    status.className =
        "form-save-status";

}


/* ==========================================================
   EXPORTS
========================================================== */

window.NetWorthAssetPage = {

    updatePageFromAsset,

    showSaveStatus

};