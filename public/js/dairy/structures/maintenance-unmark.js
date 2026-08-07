/*=========================================================
  CLEAR MAINTENANCE
=========================================================*/


function toggleUnmarkForm(id) {

    const form =
        document.getElementById(
            "unmark-form-" + id
        );


    if (!form) return;


    form.classList.toggle(
        "active"
    );

}


window.toggleUnmarkForm =
    toggleUnmarkForm;