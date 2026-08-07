/*=========================================================
  MARK MAINTENANCE
=========================================================*/


function toggleMarkForm(id) {

    const form =
        document.getElementById(
            "mark-form-" + id
        );


    if (!form) return;


    form.classList.toggle(
        "active"
    );

}


window.toggleMarkForm =
    toggleMarkForm;