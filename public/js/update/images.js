/*=========================================================
  UPDATE PAGE
  FEED IMAGES
=========================================================*/


/*=========================================================
  FEED IMAGE LIGHTBOX
=========================================================*/

function initializeFeedImages(){

    $$(".feed-img")
    .forEach(image=>{

        image.style.cursor =
            "zoom-in";

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