/*=========================================================
  UPDATE PAGE JAVASCRIPT

  PART 1A
  CORE
  PROFILE CARD
  EDIT MODE
=========================================================*/


/*=========================================================
  DOM READY
=========================================================*/

document.addEventListener("DOMContentLoaded", () => {

    initializeProfileUpdate();

    initializePostModal();

    initializeCharacterCounter();

    initializeImagePreview();

    initializeFeed();

    initializeFeedImages();

    initializeAutoResize();

});



/*=========================================================
  HELPERS
=========================================================*/

const $ = (selector) =>
    document.querySelector(selector);


const $$ = (selector) =>
    [...document.querySelectorAll(selector)];




/*=========================================================
  PROFILE CARD
  MENU + EDIT MODE
=========================================================*/

function initializeProfileUpdate(){


    const menuButton =
        $("#profileMenuBtn");


    const dropdown =
        $("#profileDropdown");


    const editButton =
        $("#editProfileBtn");


    const saveButton =
        $("#saveProfile");


    const saveArea =
        $("#saveArea");



    /*
       PROFILE DROPDOWN
    */

    if(menuButton && dropdown){

        menuButton.addEventListener(
            "click",
            (event)=>{

                event.stopPropagation();

                dropdown.classList.toggle(
                    "show"
                );

            }
        );

    }



    /*
       CLOSE DROPDOWN
    */

    document.addEventListener(
        "click",
        (event)=>{

            if(
                dropdown &&
                !event.target.closest(".profile-menu")
            ){

                dropdown.classList.remove(
                    "show"
                );

            }

        }
    );



    /*
       ENABLE EDIT MODE
    */

    if(editButton){

        editButton.addEventListener(
            "click",
            ()=>{

                enableEditMode();

                dropdown?.classList.remove(
                    "show"
                );

            }
        );

    }



    /*
       SAVE BUTTON
    */

    if(saveButton){

        saveButton.addEventListener(
            "click",
            saveProfile
        );

    }



    function enableEditMode(){

        $$(".edit-mode")
        .forEach(element=>{

            element.hidden = false;

        });


        $$(".view-mode")
        .forEach(element=>{

            element.hidden = true;

        });


        if(saveArea){

            saveArea.hidden = false;

        }

    }

}





/*=========================================================
  SAVE PROFILE
=========================================================*/

async function saveProfile(){


    const card =
        $(".profile-card");


    if(!card){

        return;

    }


    const dairyId =
        card.dataset.dairyId;


    if(!dairyId){

        showMessage(
            "Missing dairy ID."
        );

        return;

    }


    const data = {

        name:
            $("#name")?.value.trim(),

        code:
            Number(
                $("#code")?.value
            ),

        mass:
            Number(
                $("#mass")?.value
            ),

        dateOfBirth:
            $("#dateOfBirth")?.value || ""

    };


    try{


        const response =
            await fetch(

                `/dairy/${dairyId}/update`,

                {

                    method:"PUT",

                    headers:{

                        "Content-Type":
                        "application/json"

                    },

                    body:
                    JSON.stringify(data)

                }

            );


        const result =
            await response.json();


        if(result.success){

            showMessage(
                "Profile updated successfully."
            );

            location.reload();

            return;

        }


        showMessage(

            result.message ||
            "Profile update failed."

        );


    }
    catch(error){

        console.error(
            "PROFILE UPDATE ERROR:",
            error
        );

        showMessage(
            "Unable to update profile."
        );

    }

}

/*=========================================================
  POST MODAL
=========================================================*/

function initializePostModal(){

    const modal =
        $("#postModal");

    const openComposer =
        $("#openPostComposer");

    const openImage =
        $("#openImagePicker");

    const closeButton =
        $("#closePostModal");

    const textarea =
        $("#postText");

    const imageInput =
        $("#postImage");

    const sendButton =
        $("#submitPostButton");

    const form =
        $("#postForm");


    if(
        !modal ||
        !form
    ){

        return;

    }


    /*=====================================================
      SEND BUTTON STATE
    =====================================================*/

    function updateSendButton(){

        const hasText =
            textarea?.value.trim().length > 0;

        const hasImage =
            imageInput?.files.length > 0;

        sendButton.disabled =
            !(hasText || hasImage);

    }


    /*=====================================================
      OPEN MODAL
    =====================================================*/

    function openModal(){

        modal.classList.add(
            "active"
        );

        document.body.style.overflow =
            "hidden";

        updateSendButton();

        setTimeout(()=>{

            textarea?.focus();

        },100);

    }


    /*=====================================================
      CLOSE MODAL
    =====================================================*/

    function closeModal(){

        modal.classList.remove(
            "active"
        );

        document.body.style.overflow =
            "";

    }


    /*=====================================================
      EVENTS
    =====================================================*/

    openComposer?.addEventListener(
        "click",
        openModal
    );


    openImage?.addEventListener(
        "click",
        (event)=>{

            event.stopPropagation();

            openModal();

            setTimeout(()=>{

                imageInput?.click();

            },150);

        }
    );


    closeButton?.addEventListener(
        "click",
        closeModal
    );


    modal.addEventListener(
        "click",
        (event)=>{

            if(event.target===modal){

                closeModal();

            }

        }
    );


    document.addEventListener(
        "keydown",
        (event)=>{

            if(
                event.key==="Escape" &&
                modal.classList.contains(
                    "active"
                )
            ){

                closeModal();

            }

        }
    );


    textarea?.addEventListener(
        "input",
        updateSendButton
    );


    imageInput?.addEventListener(
        "change",
        updateSendButton
    );


    form.addEventListener(
        "submit",
        ()=>{

            sendButton.disabled = true;

            sendButton.innerHTML =
                '<i class="bi bi-hourglass-split"></i>';

        }
    );


    updateSendButton();

}





/*=========================================================
  CHARACTER COUNTER
=========================================================*/

function initializeCharacterCounter(){


    const textarea =
        $("#postText");


    const counter =
        $("#characterCounter");


    if(
        !textarea ||
        !counter
    ){

        return;

    }


    updateCounter();


    textarea.addEventListener(
        "input",
        updateCounter
    );


    function updateCounter(){

        counter.textContent =
            `${textarea.value.length} / 1000`;

    }

}





/*=========================================================
  IMAGE PREVIEW
=========================================================*/

function initializeImagePreview(){


    const input =
        $("#postImage");


    const previewContainer =
        $("#imagePreviewContainer");


    const preview =
        $("#imagePreview");


    const removeButton =
        $("#removeImage");


    const imageName =
        $("#selectedImageName");


    const sendButton =
        $("#submitPostButton");


    const textarea =
        $("#postText");


    if(!input){

        return;

    }


    input.addEventListener(
        "change",
        ()=>{


            const file =
                input.files[0];


            if(!file){

                resetPreview();

                return;

            }


            if(imageName){

                imageName.textContent =
                    file.name;

            }


            const reader =
                new FileReader();


            reader.onload =
                (event)=>{


                    preview.src =
                        event.target.result;


                    previewContainer.style.display =
                        "block";


                    sendButton.disabled =
                        false;


                };


            reader.readAsDataURL(
                file
            );


        }
    );


    removeButton?.addEventListener(
        "click",
        resetPreview
    );


    function resetPreview(){


        input.value = "";


        preview.src = "";


        if(imageName){

            imageName.textContent = "";

        }


        previewContainer.style.display =
            "none";


        sendButton.disabled =
            !textarea.value.trim();

    }

}

/*=========================================================
  FEED INITIALIZATION
=========================================================*/

function initializeFeed(){

    initializeCommentToggle();

    initializeLikes();

    initializeCommentForms();

    initializeDeletePosts();

    initializeDeleteComments();

}





/*=========================================================
  COMMENT TOGGLE
=========================================================*/

function initializeCommentToggle(){

    $$(".toggle-comments")
    .forEach(button=>{

        button.addEventListener(
            "click",
            ()=>{

                const card =
                    button.closest(
                        ".feed-card"
                    );

                if(!card){

                    return;

                }

                const modal =
                    card.querySelector(
                        ".comment-modal"
                    );

                if(!modal){

                    return;

                }

                modal.classList.add("active");

                document.body.style.overflow = "hidden";

                setTimeout(() => {

                    const textarea =
                        modal.querySelector(
                            ".comment-form textarea"
                        );

                    textarea?.focus();

                }, 120);

            }
        );

    });

    $$(".close-comment-modal")
    .forEach(closeButton=>{

        closeButton.addEventListener(
            "click",
            ()=>{

                closeButton.closest(
                    ".comment-modal"
                )?.classList.remove("active");

                document.body.style.overflow = "";

            }
        );

    });

    $$(".comment-modal")
    .forEach(modal=>{

        modal.addEventListener(
            "click",
            (event)=>{

                if(event.target === modal){

                    modal.classList.remove("active");

                    document.body.style.overflow = "";

                }

            }
        );

    });

    document.addEventListener(
        "keydown",
        (event)=>{

            if(event.key === "Escape"){

                $$(".comment-modal.active")
                .forEach(modal=>{

                    modal.classList.remove("active");

                });

                document.body.style.overflow = "";

            }

        }
    );

}





/*=========================================================
  LIKE POSTS
=========================================================*/

function initializeLikes(){

    $$(".like-btn")
    .forEach(button=>{

        button.addEventListener(
            "click",
            async ()=>{

                const id =
                    button.dataset.id;

                button.disabled = true;

                try{

                    const response =
                        await fetch(

                            `/post/${id}/like`,

                            {
                                method:"POST"
                            }

                        );

                    const result =
                        await response.json();

                    if(!result.success){

                        showMessage(
                            result.message ||
                            "Unable to like."
                        );

                        return;

                    }

                    const count =
                        button.querySelector(
                            ".like-count"
                        );

                    if(count){

                        count.textContent =
                            result.likes;

                    }

                    button.classList.toggle(
                        "liked",
                        result.liked === true
                    );

                }
                catch(error){

                    console.error(
                        "LIKE ERROR:",
                        error
                    );

                    showMessage(
                        "Unable to like."
                    );

                }
                finally{

                    button.disabled = false;

                }

            }
        );

    });

}

/*=========================================================
  ADD COMMENTS
=========================================================*/

function initializeCommentForms(){

    $$(".comment-form")
    .forEach(form=>{

        form.addEventListener(
            "submit",
            async (event)=>{

                event.preventDefault();

                const textarea =
                    form.querySelector(
                        "textarea"
                    );

                if(!textarea){

                    return;

                }

                const text =
                    textarea.value.trim();

                if(!text){

                    textarea.focus();

                    return;

                }

                const id =
                    form.dataset.id;

                const submitButton =
                    form.querySelector(
                        'button[type="submit"]'
                    );

                submitButton &&
                    (submitButton.disabled = true);

                try{

                    const response =
                        await fetch(

                            `/post/${id}/comment`,

                            {

                                method:"POST",

                                headers:{
                                    "Content-Type":
                                    "application/json"
                                },

                                body:
                                JSON.stringify({
                                    text
                                })

                            }

                        );

                    const result =
                        await response.json();

                    if(!result.success){

                        showMessage(
                            result.message ||
                            "Unable to post comment."
                        );

                        return;

                    }

                    const modal =
                        form.closest(
                            ".comment-modal"
                        );

                    if(modal){

                        const commentList =
                            modal.querySelector(
                                ".comment-section"
                            );

                        const count =
                            form.closest(
                                ".feed-card"
                            )?.querySelector(
                                ".comment-count"
                            );

                        if(count){

                            count.textContent =
                                Number(count.textContent || 0) + 1;

                        }

                        if(commentList){

                            const newComment =
                                document.createElement("div");

                            newComment.className = "comment-item";
                            newComment.innerHTML = `
                                <div class="comment-user">
                                    <img
                                        src="${result.comment.userImage || (`https://ui-avatars.com/api/?name=${encodeURIComponent(result.comment.userName)}`)}"
                                        class="avatar-xs"
                                        alt="${result.comment.userName}"
                                    >
                                    <div class="comment-content">
                                        <strong>${result.comment.userName}</strong>
                                        <p>${result.comment.text}</p>
                                        <small>${result.comment.dateText || ""}</small>
                                    </div>
                                </div>
                            `;

                            const existing =
                                commentList.querySelector(
                                    ".comment-empty-state"
                                );

                            if(existing){

                                existing.remove();

                            }

                            commentList.prepend(newComment);

                        }

                    }

                    textarea.value = "";

                    resizeTextarea(textarea);

                    form.reset();

                }
                catch(error){

                    console.error(
                        "COMMENT ERROR:",
                        error
                    );

                    showMessage(
                        "Unable to post comment."
                    );

                }
                finally{

                    submitButton &&
                        (submitButton.disabled = false);

                }

            }
        );

    });

}





/*=========================================================
  DELETE POSTS
=========================================================*/

function initializeDeletePosts(){

    $$(".delete-post")
    .forEach(button=>{

        button.addEventListener(
            "click",
            async ()=>{

                const confirmed =
                    confirm(
                        "Delete this post?"
                    );

                if(!confirmed){

                    return;

                }

                button.disabled = true;

                const id =
                    button.dataset.id;

                try{

                    const response =
                        await fetch(

                            `/post/${id}`,

                            {

                                method:"DELETE"

                            }

                        );

                    const result =
                        await response.json();

                    if(!result.success){

                        showMessage(
                            result.message ||
                            "Delete failed."
                        );

                        return;

                    }

                    button.closest(
                        ".feed-card"
                    )?.remove();

                }
                catch(error){

                    console.error(
                        "DELETE POST ERROR:",
                        error
                    );

                    showMessage(
                        "Unable to delete post."
                    );

                }

            }
        );

    });

}





/*=========================================================
  DELETE COMMENTS
=========================================================*/

function initializeDeleteComments(){

    $$(".delete-comment")
    .forEach(button=>{

        button.addEventListener(
            "click",
            async ()=>{

                const confirmed =
                    confirm(
                        "Delete this comment?"
                    );

                if(!confirmed){

                    return;

                }

                button.disabled = true;

                const id =
                    button.dataset.id;

                try{

                    const response =
                        await fetch(

                            `/comment/${id}`,

                            {

                                method:"DELETE"

                            }

                        );

                    const result =
                        await response.json();

                    if(!result.success){

                        showMessage(
                            result.message ||
                            "Delete failed."
                        );

                        return;

                    }

                    const commentItem =
                        button.closest(
                            ".comment-item"
                        );

                    commentItem?.remove();

                    const card =
                        button.closest(
                            ".feed-card"
                        );

                    const count =
                        card?.querySelector(
                            ".comment-count"
                        );

                    if(count){

                        count.textContent =
                            Math.max(
                                0,
                                Number(count.textContent || 0) - 1
                            );

                    }

                }
                catch(error){

                    console.error(
                        "DELETE COMMENT ERROR:",
                        error
                    );

                    showMessage(
                        "Unable to delete comment."
                    );

                }

            }
        );

    });

}

/*=========================================================
  FEED IMAGE LIGHTBOX
=========================================================*/

function initializeFeedImages(){

    $$(".feed-img")
    .forEach(image=>{

        image.style.cursor = "zoom-in";

        image.addEventListener(
            "click",
            ()=>{

                window.open(
                    image.src,
                    "_blank"
                );

            }
        );

    });

}





/*=========================================================
  AUTO RESIZE TEXTAREAS
=========================================================*/

function initializeAutoResize(){

    $$("textarea")
    .forEach(textarea=>{

        resizeTextarea(
            textarea
        );

        textarea.addEventListener(
            "input",
            ()=>{

                resizeTextarea(
                    textarea
                );

            }
        );

    });

}





/*=========================================================
  RESIZE TEXTAREA
=========================================================*/

function resizeTextarea(element){

    if(!element){

        return;

    }

    element.style.height =
        "auto";

    element.style.height =
        element.scrollHeight + "px";

}





/*=========================================================
  BUTTON LOADING STATE
=========================================================*/

function setButtonLoading(
    button,
    loading
){

    if(!button){

        return;

    }

    if(loading){

        button.dataset.originalHTML =
            button.innerHTML;

        button.disabled = true;

        button.innerHTML =
            '<i class="bi bi-hourglass-split"></i>';

        return;

    }

    button.disabled = false;

    if(button.dataset.originalHTML){

        button.innerHTML =
            button.dataset.originalHTML;

    }

}





/*=========================================================
  MESSAGE HELPER
=========================================================*/

function showMessage(message){

    alert(message);

}





/*=========================================================
  SOCKET CONNECTION
=========================================================*/

const socket =
    typeof io !== "undefined"
        ? io()
        : null;





if(socket){

    const card =
        $(".profile-card");

    const dairyId =
        card?.dataset.dairyId;

    if(dairyId){

        socket.emit(
            "joinDairy",
            dairyId
        );

    }



    /*=====================================================
      PROFILE IMAGE UPDATED
    =====================================================*/

    socket.on(
        "imageUpdated",
        data=>{

            if(
                data.dairyId !== dairyId
            ){

                return;

            }

            const image =
                $(".profile-avatar");

            if(image){

                image.src =
                    data.image;

            }

        }
    );



    /*=====================================================
      PROFILE DELETED
    =====================================================*/

    socket.on(
        "dairyDeleted",
        data=>{

            if(
                data.dairyId !== dairyId
            ){

                return;

            }

            window.location.href =
                "/dairyProjects";

        }
    );



    /*=====================================================
      NEW POST
    =====================================================*/

    socket.on(
        "newPost",
        ()=>{

            location.reload();

        }
    );



    /*=====================================================
      POST DELETED
    =====================================================*/

    socket.on(
        "postDeleted",
        ()=>{

            location.reload();

        }
    );



    /*=====================================================
      NEW COMMENT
    =====================================================*/

    socket.on(
        "newComment",
        ()=>{

            location.reload();

        }
    );



    /*=====================================================
      COMMENT DELETED
    =====================================================*/

    socket.on(
        "commentDeleted",
        ()=>{

            location.reload();

        }
    );



    /*=====================================================
      POST LIKED
    =====================================================*/

    socket.on(
        "postLiked",
        ()=>{

            location.reload();

        }
    );

}