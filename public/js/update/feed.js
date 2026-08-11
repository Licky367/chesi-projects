/*=========================================================
  UPDATE PAGE JAVASCRIPT
  FEED.JS
=========================================================*/


/*=========================================================
  DOM READY
=========================================================*/

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initializeFeed();

    }
);


/*=========================================================
  HELPERS
=========================================================*/

const $$ = (selector) =>
    [...document.querySelectorAll(selector)];


/*=========================================================
  MESSAGE HELPER
=========================================================*/

function showMessage(message){

    alert(message);

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

                modal.classList.add(
                    "active"
                );

                document.body.style.overflow =
                    "hidden";


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


    /*=====================================================
      CLOSE COMMENT MODALS
    =====================================================*/

    $$(".close-comment-modal")
    .forEach(closeButton=>{

        closeButton.addEventListener(
            "click",
            ()=>{

                closeButton.closest(
                    ".comment-modal"
                )?.classList.remove(
                    "active"
                );

                document.body.style.overflow =
                    "";

            }
        );

    });


    /*=====================================================
      CLOSE WHEN CLICKING OUTSIDE MODAL
    =====================================================*/

    $$(".comment-modal")
    .forEach(modal=>{

        modal.addEventListener(
            "click",
            (event)=>{

                if(
                    event.target === modal
                ){

                    modal.classList.remove(
                        "active"
                    );

                    document.body.style.overflow =
                        "";

                }

            }
        );

    });


    /*=====================================================
      ESCAPE KEY
    =====================================================*/

    document.addEventListener(
        "keydown",
        (event)=>{

            if(
                event.key === "Escape"
            ){

                $$(".comment-modal.active")
                .forEach(modal=>{

                    modal.classList.remove(
                        "active"
                    );

                });

                document.body.style.overflow =
                    "";

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
                                method: "POST"
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
                    (
                        submitButton.disabled =
                            true
                    );


                try{

                    const response =
                        await fetch(

                            `/post/${id}/comment`,

                            {

                                method: "POST",

                                headers: {

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
                                Number(
                                    count.textContent ||
                                    0
                                ) + 1;

                        }


                        if(commentList){

                            const newComment =
                                document.createElement(
                                    "div"
                                );


                            newComment.className =
                                "comment-item";


                            newComment.innerHTML = `
                                <div class="comment-user">

                                    <img
                                        src="${result.comment.userImage || (`https://ui-avatars.com/api/?name=${encodeURIComponent(result.comment.userName)}`)}"
                                        class="avatar-xs"
                                        alt="${result.comment.userName}"
                                    >

                                    <div class="comment-content">

                                        <strong>
                                            ${result.comment.userName}
                                        </strong>

                                        <p>
                                            ${result.comment.text}
                                        </p>

                                        <small>
                                            ${result.comment.dateText || ""}
                                        </small>

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


                            commentList.prepend(
                                newComment
                            );

                        }

                    }


                    textarea.value = "";


                    resizeTextarea(
                        textarea
                    );


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
                        (
                            submitButton.disabled =
                                false
                        );

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
                                method: "DELETE"
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
                                method: "DELETE"
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
                                Number(
                                    count.textContent ||
                                    0
                                ) - 1
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
  TEXTAREA RESIZE
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