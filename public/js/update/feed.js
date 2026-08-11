/*=========================================================
  UPDATE PAGE
  FEED.JS
=========================================================*/


/*=========================================================
  DOM HELPERS
=========================================================*/

const $ = selector =>
    document.querySelector(selector);


const $$ = selector =>
    Array.from(
        document.querySelectorAll(selector)
    );


/*=========================================================
  MESSAGE HELPER
=========================================================*/

function showMessage(message){

    if(typeof window.showMessage === "function"){

        window.showMessage(message);

        return;

    }

    alert(message);

}


/*=========================================================
  FEED INITIALIZATION
=========================================================*/

function initializeFeed(){

    try{

        initializeCommentToggle();

    }
    catch(error){

        console.error(
            "COMMENT TOGGLE INITIALIZATION ERROR:",
            error
        );

    }


    try{

        initializeLikes();

    }
    catch(error){

        console.error(
            "LIKE INITIALIZATION ERROR:",
            error
        );

    }


    try{

        initializeCommentForms();

    }
    catch(error){

        console.error(
            "COMMENT FORM INITIALIZATION ERROR:",
            error
        );

    }


    try{

        initializeDeletePosts();

    }
    catch(error){

        console.error(
            "DELETE POST INITIALIZATION ERROR:",
            error
        );

    }


    try{

        initializeDeleteComments();

    }
    catch(error){

        console.error(
            "DELETE COMMENT INITIALIZATION ERROR:",
            error
        );

    }

}


/*=========================================================
  COMMENT TOGGLE
=========================================================*/

function initializeCommentToggle(){

    $$(".toggle-comments")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const card =
                    button.closest(
                        ".feed-card"
                    );

                if(!card){

                    return;

                }

                const section =
                    card.querySelector(
                        ".comment-section"
                    );

                if(!section){

                    return;

                }

                section.classList.toggle(
                    "hidden"
                );

            }
        );

    });

}


/*=========================================================
  ADD COMMENTS
=========================================================*/

function initializeCommentForms(){

    $$(".comment-form")
    .forEach(form => {

        form.addEventListener(
            "submit",
            async event => {

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

                const type =
                    form.dataset.type ||
                    "post";


                if(!id){

                    showMessage(
                        "Unable to identify this item."
                    );

                    return;

                }


                const submitButton =
                    form.querySelector(
                        'button[type="submit"]'
                    );


                if(submitButton){

                    submitButton.disabled = true;

                }


                try{

                    const response =
                        await fetch(

                            type === "post"
                                ? `/post/${id}/comment`
                                : `/${type}/${id}/comment`,

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


                    if(!response.ok){

                        showMessage(
                            result.message ||
                            "Unable to post comment."
                        );

                        return;

                    }


                    if(!result.success){

                        showMessage(
                            result.message ||
                            "Unable to post comment."
                        );

                        return;

                    }


                    location.reload();

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

                    if(submitButton){

                        submitButton.disabled = false;

                    }

                }

            }
        );

    });

}


/*=========================================================
  LIKE POSTS / FEED ITEMS
=========================================================*/

function initializeLikes(){

    $$(".like-btn")
    .forEach(button => {

        button.addEventListener(
            "click",
            async () => {

                const id =
                    button.dataset.id;

                const type =
                    button.dataset.type ||
                    "post";


                if(!id){

                    showMessage(
                        "Unable to identify this item."
                    );

                    return;

                }


                button.disabled = true;


                try{

                    const response =
                        await fetch(

                            type === "post"
                                ? `/post/${id}/like`
                                : `/${type}/${id}/like`,

                            {
                                method: "POST"
                            }

                        );


                    const result =
                        await response.json();


                    if(!response.ok){

                        showMessage(
                            result.message ||
                            "Unable to like."
                        );

                        return;

                    }


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
                            result.likes ?? 0;

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
  DELETE POSTS
=========================================================*/

function initializeDeletePosts(){

    $$(".delete-post")
    .forEach(button => {

        button.addEventListener(
            "click",
            async () => {

                const confirmed =
                    confirm(
                        "Delete this post?"
                    );


                if(!confirmed){

                    return;

                }


                const id =
                    button.dataset.id;


                if(!id){

                    showMessage(
                        "Unable to identify this post."
                    );

                    return;

                }


                button.disabled = true;


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


                    if(!response.ok){

                        showMessage(
                            result.message ||
                            "Delete failed."
                        );

                        return;

                    }


                    if(!result.success){

                        showMessage(
                            result.message ||
                            "Delete failed."
                        );

                        return;

                    }


                    const card =
                        button.closest(
                            ".feed-card"
                        );


                    if(card){

                        card.remove();

                    }

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
                finally{

                    button.disabled = false;

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
    .forEach(button => {

        button.addEventListener(
            "click",
            async () => {

                const confirmed =
                    confirm(
                        "Delete this comment?"
                    );


                if(!confirmed){

                    return;

                }


                const id =
                    button.dataset.id;


                if(!id){

                    showMessage(
                        "Unable to identify this comment."
                    );

                    return;

                }


                button.disabled = true;


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


                    if(!response.ok){

                        showMessage(
                            result.message ||
                            "Delete failed."
                        );

                        return;

                    }


                    if(!result.success){

                        showMessage(
                            result.message ||
                            "Delete failed."
                        );

                        return;

                    }


                    const comment =
                        button.closest(
                            ".comment-item"
                        );


                    if(comment){

                        comment.remove();

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
                finally{

                    button.disabled = false;

                }

            }
        );

    });

}


/*=========================================================
  START FEED
=========================================================*/

if(
    document.readyState === "loading"
){

    document.addEventListener(
        "DOMContentLoaded",
        initializeFeed
    );

}
else{

    initializeFeed();

}