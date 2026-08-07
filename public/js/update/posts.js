/*=========================================================
  UPDATE PAGE
  POSTS
=========================================================*/


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