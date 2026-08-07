/*=========================================================
  UNMARK MEDICAL
=========================================================*/

function toggleUnmarkForm(id) {

    const form = document.getElementById("unmarkForm-" + id);

    if (!form) return;

    form.classList.toggle("inline-visible");

}

window.toggleUnmarkForm = toggleUnmarkForm;