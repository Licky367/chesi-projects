/*=========================================================
  MARK MEDICAL
=========================================================*/

function toggleMarkForm(id) {

    const form = document.getElementById("markForm-" + id);

    if (!form) return;

    form.classList.toggle("inline-visible");

}

window.toggleMarkForm = toggleMarkForm;