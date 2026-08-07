/*=========================================================
  UPDATE PAGE
  IMAGE PREVIEW
=========================================================*/


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