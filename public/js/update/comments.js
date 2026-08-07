/*=========================================================
  UPDATE PAGE
  COMMENTS
=========================================================*/


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

                const type =
                    form.dataset.type ||
                    "post";

                const submitButton =
                    form.querySelector(
                        'button[type="submit"]'
                    );

                submitButton &&
                    (submitButton.disabled = true);

                try{

                    const response =
                        await fetch(

                            type === "post"
                                ? `/post/${id}/comment`
                                : `/${type}/${id}/comment`,

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

                    submitButton &&
                        (submitButton.disabled = false);

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

                    button.closest(
                        ".comment-item"
                    )?.remove();

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