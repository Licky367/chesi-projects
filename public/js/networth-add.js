/* ==========================================================
   NET WORTH - ADD ASSET
========================================================== */


/* ==========================================================
   DOM READY
========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        initializeAddAssetForm();

    }
);


/* ==========================================================
   SELECTORS
========================================================== */

function initializeAddAssetForm() {

    const form =
        document.getElementById(
            "networthAddForm"
        );


    if (!form) {

        return;

    }


    form.addEventListener(
        "submit",
        handleAddAssetSubmit
    );

}


/* ==========================================================
   SUBMIT
========================================================== */

async function handleAddAssetSubmit(event) {

    event.preventDefault();


    const form =
        event.currentTarget;


    const button =
        document.getElementById(
            "saveAssetButton"
        );


    const message =
        document.getElementById(
            "networthFormMessage"
        );


    if (!form.checkValidity()) {

        form.reportValidity();

        return;

    }


    clearFormMessage();


    setSubmittingState(
        form,
        button,
        true
    );


    try {

        const formData =
            new FormData(form);


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


        let result = null;


        if (
            contentType.includes(
                "application/json"
            )
        ) {

            result =
                await response.json();

        } else {

            /*
             * The controller may still return
             * a redirect/HTML response while the
             * AJAX-compatible controller is being
             * implemented.
             */

            if (response.ok) {

                showFormMessage(
                    "Asset added successfully.",
                    "success"
                );


                form.reset();


                /*
                 * Keep the default status as active
                 * after reset.
                 */

                const status =
                    document.getElementById(
                        "status"
                    );


                if (status) {

                    status.value =
                        "active";

                }


                return;

            }


            throw new Error(
                "Unable to add the asset."
            );

        }


        if (!response.ok) {

            throw new Error(
                result?.message ||
                "Unable to add the asset."
            );

        }


        showFormMessage(
            result?.message ||
            "Asset added successfully.",
            "success"
        );


        /*
         * Clear the form after successful
         * creation.
         */

        form.reset();


        const status =
            document.getElementById(
                "status"
            );


        if (status) {

            status.value =
                "active";

        }


    } catch (error) {

        console.error(
            "Error adding Net Worth asset:",
            error
        );


        showFormMessage(
            error.message ||
            "Unable to add the asset. Please try again.",
            "error"
        );

    } finally {

        setSubmittingState(
            form,
            button,
            false
        );

    }

}


/* ==========================================================
   SUBMISSION STATE
========================================================== */

function setSubmittingState(
    form,
    button,
    submitting
) {

    if (!form) {

        return;

    }


    form.classList.toggle(
        "is-submitting",
        submitting
    );


    if (!button) {

        return;

    }


    if (submitting) {

        button.dataset.originalText =
            button.textContent.trim();


        button.textContent =
            "Saving...";


        button.disabled =
            true;

    } else {

        button.textContent =
            button.dataset.originalText ||
            "Save Asset";


        button.disabled =
            false;

    }

}


/* ==========================================================
   FORM MESSAGE
========================================================== */

function showFormMessage(
    text,
    type
) {

    const message =
        document.getElementById(
            "networthFormMessage"
        );


    if (!message) {

        return;

    }


    message.textContent =
        text;


    message.className =
        "networth-form-message show " +
        (
            type === "error"
                ? "error"
                : "success"
        );

}


/* ==========================================================
   CLEAR MESSAGE
========================================================== */

function clearFormMessage() {

    const message =
        document.getElementById(
            "networthFormMessage"
        );


    if (!message) {

        return;

    }


    message.textContent =
        "";


    message.className =
        "networth-form-message";

}