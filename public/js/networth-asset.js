/* ==========================================================
   NET WORTH ASSET EDIT PAGE
========================================================== */


/* ==========================================================
   SELECTORS
========================================================== */

const $ = (selector) =>
    document.querySelector(selector);


/* ==========================================================
   DOM READY
========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initProfileImagePreview();

        initAgeCalculator();

        initAssetForm();

    }
);


/* ==========================================================
   PROFILE IMAGE PREVIEW
========================================================== */

function initProfileImagePreview() {

    const input =
        $("#profileImage");

    const preview =
        $("#profileImagePreview");

    const placeholder =
        $("#profileImagePlaceholder");


    if (!input) {

        return;

    }


    input.addEventListener(
        "change",
        () => {

            const file =
                input.files?.[0];


            if (!file) {

                return;

            }


            if (!file.type.startsWith("image/")) {

                input.value = "";

                return;

            }


            const imageUrl =
                URL.createObjectURL(file);


            if (preview) {

                preview.src =
                    imageUrl;

                preview.style.display =
                    "block";

            }


            if (placeholder) {

                placeholder.style.display =
                    "none";

            }

        }
    );

}


/* ==========================================================
   AGE CALCULATOR
========================================================== */

function initAgeCalculator() {

    const dateOfBirth =
        $("#dateOfBirth");

    const ageDisplay =
        $("#age");


    if (
        !dateOfBirth ||
        !ageDisplay
    ) {

        return;

    }


    function updateAge() {

        const value =
            dateOfBirth.value;


        if (!value) {

            ageDisplay.textContent =
                "—";

            return;

        }


        const birthDate =
            new Date(
                `${value}T00:00:00`
            );


        if (
            Number.isNaN(
                birthDate.getTime()
            )
        ) {

            ageDisplay.textContent =
                "—";

            return;

        }


        const today =
            new Date();


        let years =
            today.getFullYear() -
            birthDate.getFullYear();


        let months =
            today.getMonth() -
            birthDate.getMonth();


        let days =
            today.getDate() -
            birthDate.getDate();


        if (days < 0) {

            months--;

        }


        if (months < 0) {

            years--;

            months += 12;

        }


        if (years < 0) {

            ageDisplay.textContent =
                "Invalid date";

            return;

        }


        const yearText =
            years === 1
                ? "year"
                : "years";


        const monthText =
            months === 1
                ? "month"
                : "months";


        if (years > 0) {

            ageDisplay.textContent =
                `${years} ${yearText}, ${months} ${monthText}`;

            return;

        }


        ageDisplay.textContent =
            `${months} ${monthText}`;

    }


    updateAge();


    dateOfBirth.addEventListener(
        "change",
        updateAge
    );

}


/* ==========================================================
   FORM
========================================================== */

function initAssetForm() {

    const form =
        $("#networthAssetForm");

    const button =
        $("#saveAssetButton");

    const status =
        $("#formSaveStatus");


    if (!form) {

        return;

    }


    form.addEventListener(
        "submit",
        () => {

            /*
             * Do NOT perform custom required-field
             * validation here.
             *
             * This page edits an existing database
             * record. The user may change only one
             * field and save it.
             */


            if (button) {

                button.disabled =
                    true;

                button.textContent =
                    "Saving...";

            }


            if (status) {

                status.className =
                    "form-save-status";

                status.textContent =
                    "";

            }

        }
    );

}