/*=========================================================
  UPDATE PAGE
  PROFILE
=========================================================*/


/*=========================================================
  PROFILE CARD
  MENU + EDIT MODE
=========================================================*/

function initializeProfileUpdate(){


    const menuButton =
        $("#profileMenuBtn");


    const dropdown =
        $("#profileDropdown");


    const editButton =
        $("#editProfileBtn");


    const saveButton =
        $("#saveProfile");


    const saveArea =
        $("#saveArea");



    /*
       PROFILE DROPDOWN
    */

    if(menuButton && dropdown){

        menuButton.addEventListener(
            "click",
            (event)=>{

                event.stopPropagation();

                dropdown.classList.toggle(
                    "show"
                );

            }
        );

    }



    /*
       CLOSE DROPDOWN
    */

    document.addEventListener(
        "click",
        (event)=>{

            if(
                dropdown &&
                !event.target.closest(".profile-menu")
            ){

                dropdown.classList.remove(
                    "show"
                );

            }

        }
    );



    /*
       ENABLE EDIT MODE
    */

    if(editButton){

        editButton.addEventListener(
            "click",
            ()=>{

                enableEditMode();

                dropdown?.classList.remove(
                    "show"
                );

            }
        );

    }



    /*
       SAVE BUTTON
    */

    if(saveButton){

        saveButton.addEventListener(
            "click",
            saveProfile
        );

    }



    function enableEditMode(){

        $$(".edit-mode")
        .forEach(element=>{

            element.hidden = false;

        });


        $$(".view-mode")
        .forEach(element=>{

            element.hidden = true;

        });


        if(saveArea){

            saveArea.hidden = false;

        }

    }

}





/*=========================================================
  SAVE PROFILE
=========================================================*/

async function saveProfile(){


    const card =
        $(".profile-card");


    if(!card){

        return;

    }


    const dairyId =
        card.dataset.dairyId;


    if(!dairyId){

        showMessage(
            "Missing dairy ID."
        );

        return;

    }


    const data = {

        name:
            $("#name")?.value.trim(),

        code:
            Number(
                $("#code")?.value
            ),

        mass:
            Number(
                $("#mass")?.value
            ),

        dateOfBirth:
            $("#dateOfBirth")?.value || ""

    };


    try{


        const response =
            await fetch(

                `/dairy/${dairyId}/update`,

                {

                    method:"PUT",

                    headers:{

                        "Content-Type":
                        "application/json"

                    },

                    body:
                    JSON.stringify(data)

                }

            );


        const result =
            await response.json();


        if(result.success){

            showMessage(
                "Profile updated successfully."
            );

            location.reload();

            return;

        }


        showMessage(

            result.message ||
            "Profile update failed."

        );


    }
    catch(error){

        console.error(
            "PROFILE UPDATE ERROR:",
            error
        );

        showMessage(
            "Unable to update profile."
        );

    }

}