/* =========================================================
   UPDATE PAGE
   POST MODAL
========================================================= */

function initializePostModal() {

    /* =====================================================
       PREVENT DUPLICATE INITIALIZATION
    ===================================================== */

    const modal =
        document.getElementById("postModal");

    const openComposer =
        document.getElementById("openPostComposer");

    const openImage =
        document.getElementById("openImagePicker");

    const closeButton =
        document.getElementById("closePostModal");

    const textarea =
        document.getElementById("postText");

    const imageInput =
        document.getElementById("postImage");

    const sendButton =
        document.getElementById("submitPostButton");

    const form =
        document.getElementById("postForm");

    const imagePreviewContainer =
        document.getElementById("imagePreviewContainer");

    const imagePreview =
        document.getElementById("imagePreview");

    const removeImage =
        document.getElementById("removeImage");

    const selectedImageName =
        document.getElementById("selectedImageName");

    const characterCounter =
        document.getElementById("characterCounter");


    /* =====================================================
       REQUIRED ELEMENT CHECK
    ===================================================== */

    if (
        !modal ||
        !openComposer ||
        !closeButton ||
        !textarea ||
        !imageInput ||
        !sendButton ||
        !form
    ) {

        console.warn(
            "Post modal not initialized: required element missing."
        );

        return;

    }


    /*
     * Prevent this function from attaching the same
     * listeners more than once.
     */

    if (
        modal.dataset.postModalInitialized === "true"
    ) {

        return;

    }

    modal.dataset.postModalInitialized =
        "true";


    /* =====================================================
       OPEN MODAL
    ===================================================== */

    function openModal() {

        modal.classList.add("active");

        modal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.style.overflow =
            "hidden";


        updateSendButton();


        /*
         * Focus the text area after the modal
         * has become visible.
         */

        setTimeout(function () {

            textarea.focus();

        }, 100);

    }


    /* =====================================================
       CLOSE MODAL
    ===================================================== */

    function closeModal() {

        modal.classList.remove("active");

        modal.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.style.overflow =
            "";

    }


    /* =====================================================
       SEND BUTTON STATE
    ===================================================== */

    function updateSendButton() {

        const hasText =
            textarea.value.trim().length > 0;

        const hasImage =
            imageInput.files &&
            imageInput.files.length > 0;


        /*
         * Your controller allows:
         *
         * text
         * OR
         * image
         *
         * Therefore the button is enabled when
         * either one exists.
         */

        sendButton.disabled =
            !(hasText || hasImage);

    }


    /* =====================================================
       CHARACTER COUNTER
    ===================================================== */

    function updateCharacterCounter() {

        if (!characterCounter) {
            return;
        }


        const length =
            textarea.value.length;


        characterCounter.textContent =
            `${length} / 1000`;

    }


    /* =====================================================
       OPEN COMPOSER
    ===================================================== */

    openComposer.addEventListener(
        "click",
        function (event) {

            /*
             * If the image button itself was clicked,
             * its own handler will deal with it.
             */

            if (
                openImage &&
                event.target.closest("#openImagePicker")
            ) {

                return;

            }


            openModal();

        }
    );


    /* =====================================================
       KEYBOARD ACCESSIBILITY
    ===================================================== */

    openComposer.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Enter" ||
                event.key === " "
            ) {

                event.preventDefault();

                openModal();

            }

        }
    );


    /* =====================================================
       IMAGE BUTTON
    ===================================================== */

    if (openImage) {

        openImage.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                event.stopPropagation();


                /*
                 * Open the modal first.
                 */

                openModal();


                /*
                 * Then open the native image
                 * selector.
                 */

                setTimeout(function () {

                    imageInput.click();

                }, 150);

            }
        );

    }


    /* =====================================================
       CLOSE BUTTON
    ===================================================== */

    closeButton.addEventListener(
        "click",
        function () {

            closeModal();

        }
    );


    /* =====================================================
       CLICK MODAL BACKDROP
    ===================================================== */

    modal.addEventListener(
        "click",
        function (event) {

            /*
             * Only close when the outer modal
             * itself is clicked.
             *
             * Clicking inside .post-modal-content
             * will not close it.
             */

            if (
                event.target === modal
            ) {

                closeModal();

            }

        }
    );


    /* =====================================================
       ESCAPE KEY
    ===================================================== */

    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Escape" &&
                modal.classList.contains("active")
            ) {

                closeModal();

            }

        }
    );


    /* =====================================================
       TEXT INPUT
    ===================================================== */

    textarea.addEventListener(
        "input",
        function () {

            updateSendButton();

            updateCharacterCounter();

        }
    );


    /* =====================================================
       IMAGE INPUT
    ===================================================== */

    imageInput.addEventListener(
        "change",
        function () {

            const file =
                imageInput.files &&
                imageInput.files[0];


            if (!file) {

                clearImage();

                updateSendButton();

                return;

            }


            /* =============================================
               SHOW FILE NAME
            ============================================= */

            if (selectedImageName) {

                selectedImageName.textContent =
                    file.name;

            }


            /* =============================================
               IMAGE PREVIEW
            ============================================= */

            if (
                imagePreview &&
                imagePreviewContainer
            ) {

                const reader =
                    new FileReader();


                reader.onload =
                    function (event) {

                        imagePreview.src =
                            event.target.result;

                        imagePreviewContainer.style.display =
                            "block";

                    };


                reader.readAsDataURL(file);

            }


            updateSendButton();

        }
    );


    /* =====================================================
       REMOVE IMAGE
    ===================================================== */

    if (removeImage) {

        removeImage.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                clearImage();

                updateSendButton();

            }
        );

    }


    /* =====================================================
       CLEAR IMAGE
    ===================================================== */

    function clearImage() {

        imageInput.value = "";


        if (selectedImageName) {

            selectedImageName.textContent =
                "";

        }


        if (imagePreview) {

            imagePreview.src =
                "";

        }


        if (imagePreviewContainer) {

            imagePreviewContainer.style.display =
                "none";

        }

    }


    /* =====================================================
       FORM SUBMISSION
    ===================================================== */

    form.addEventListener(
        "submit",
        function (event) {

            /*
             * Let the browser perform its normal
             * HTML validation first.
             */

            if (
                !form.checkValidity()
            ) {

                return;

            }


            /*
             * Prevent accidental double submission.
             */

            sendButton.disabled =
                true;


            sendButton.innerHTML =
                '<i class="bi bi-hourglass-split"></i>';


        }
    );


    /* =====================================================
       INITIAL STATE
    ===================================================== */

    updateSendButton();

    updateCharacterCounter();


    /* =====================================================
       INITIALIZED
    ===================================================== */

    console.log(
        "Post modal initialized successfully."
    );

}


/* =========================================================
   AUTOMATIC INITIALIZATION
========================================================= */

if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializePostModal
    );

} else {

    initializePostModal();

}