/*=========================================================
  UPDATE PAGE
  POST MODAL
=========================================================*/

function initializePostModal() {

    /*=====================================================
      ELEMENTS
    =====================================================*/

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


    /*=====================================================
      REQUIRED ELEMENT CHECK
    =====================================================*/

    if (
        !modal ||
        !openComposer ||
        !openImage ||
        !closeButton ||
        !textarea ||
        !imageInput ||
        !sendButton ||
        !form
    ) {

        console.warn(
            "Post modal not initialized. Required element missing."
        );

        return;

    }


    /*=====================================================
      SEND BUTTON STATE
    =====================================================*/

    function updateSendButton() {

        const hasText =
            textarea.value.trim().length > 0;

        const hasImage =
            imageInput.files.length > 0;

        sendButton.disabled =
            !(hasText || hasImage);

    }


    /*=====================================================
      OPEN MODAL
    =====================================================*/

    function openModal() {

        modal.classList.add("active");

        document.body.style.overflow =
            "hidden";

        updateSendButton();

        setTimeout(() => {

            textarea.focus();

        }, 150);

    }


    /*=====================================================
      CLOSE MODAL
    =====================================================*/

    function closeModal() {

        modal.classList.remove("active");

        document.body.style.overflow =
            "";

    }


    /*=====================================================
      CLICK COMPOSER
    =====================================================*/

    openComposer.addEventListener(
        "click",
        openModal
    );


    /*=====================================================
      KEYBOARD ACCESSIBILITY
    =====================================================*/

    openComposer.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Enter" ||
                event.key === " "
            ) {

                event.preventDefault();

                openModal();

            }

        }
    );


    /*=====================================================
      IMAGE ICON
    =====================================================*/

    openImage.addEventListener(
        "click",
        (event) => {

            event.preventDefault();

            event.stopPropagation();

            openModal();

            setTimeout(() => {

                imageInput.click();

            }, 100);

        }
    );


    /*=====================================================
      CLOSE BUTTON
    =====================================================*/

    closeButton.addEventListener(
        "click",
        closeModal
    );


    /*=====================================================
      CLICK OUTSIDE MODAL
    =====================================================*/

    modal.addEventListener(
        "click",
        (event) => {

            if (
                event.target === modal
            ) {

                closeModal();

            }

        }
    );


    /*=====================================================
      ESC KEY
    =====================================================*/

    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Escape" &&
                modal.classList.contains("active")
            ) {

                closeModal();

            }

        }
    );


    /*=====================================================
      TEXT INPUT
    =====================================================*/

    textarea.addEventListener(
        "input",
        updateSendButton
    );


    /*=====================================================
      IMAGE INPUT
    =====================================================*/

    imageInput.addEventListener(
        "change",
        updateSendButton
    );


    /*=====================================================
      FORM SUBMIT
    =====================================================*/

    form.addEventListener(
        "submit",
        () => {

            sendButton.disabled = true;

            sendButton.innerHTML =
                '<i class="bi bi-hourglass-split"></i>';

        }
    );


    /*=====================================================
      INITIAL STATE
    =====================================================*/

    updateSendButton();

}