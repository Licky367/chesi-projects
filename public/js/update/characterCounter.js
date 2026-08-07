/*=========================================================
  UPDATE PAGE
  CHARACTER COUNTER
=========================================================*/


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