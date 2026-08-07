/*=========================================================
  UPDATE PAGE
  LIKES
=========================================================*/


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

                const type =
                    button.dataset.type ||
                    "post";

                button.disabled = true;

                try{

                    const response =
                        await fetch(

                            type === "post"
                            ? `/post/${id}/like`
                            : `/${type}/${id}/like`,

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