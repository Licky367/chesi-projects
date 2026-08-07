/*=========================================================
  DAIRY STRUCTURES
  INDEX
=========================================================*/

document.addEventListener("DOMContentLoaded", () => {

    initializeStructureForms();

});


/*=========================================================
  INITIALIZE
=========================================================*/

function initializeStructureForms() {

    window.toggleMarkForm = toggleMarkForm;

    window.toggleUnmarkForm = toggleUnmarkForm;

}


/*=========================================================
  TOGGLE FORM
=========================================================*/

function toggleForm(formId) {

    const form = document.getElementById(formId);

    if (!form) return;

    form.classList.toggle("active");

}


/*=========================================================
  MARK MAINTENANCE
=========================================================*/

function toggleMarkForm(id) {

    toggleForm(`mark-form-${id}`);

}


/*=========================================================
  CLEAR MAINTENANCE
=========================================================*/

function toggleUnmarkForm(id) {

    toggleForm(`unmark-form-${id}`);

}