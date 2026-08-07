/*=========================================================
  UPDATE PAGE
  SOCKET
=========================================================*/


/*=========================================================
  SOCKET INITIALIZATION
=========================================================*/

function initializeSocket(){

    const socket =
        typeof io !== "undefined"
            ? io()
            : null;


    if(!socket){

        return;

    }


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