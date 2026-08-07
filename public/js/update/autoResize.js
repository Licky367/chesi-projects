/*=========================================================
  UPDATE PAGE
  AUTO RESIZE
=========================================================*/


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