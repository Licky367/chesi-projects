/*=========================================================
  UPDATE PAGE
  HELPERS
=========================================================*/


/*=========================================================
  SELECTORS
=========================================================*/

const $ = (selector) =>
    document.querySelector(selector);


const $$ = (selector) =>
    [...document.querySelectorAll(selector)];


/*=========================================================
  RESIZE TEXTAREA
=========================================================*/

function resizeTextarea(element){

    if(!element){

        return;

    }

    element.style.height =
        "auto";

    element.style.height =
        element.scrollHeight + "px";

}


/*=========================================================
  BUTTON LOADING STATE
=========================================================*/

function setButtonLoading(
    button,
    loading
){

    if(!button){

        return;

    }

    if(loading){

        button.dataset.originalHTML =
            button.innerHTML;

        button.disabled = true;

        button.innerHTML =
            '<i class="bi bi-hourglass-split"></i>';

        return;

    }

    button.disabled = false;

    if(button.dataset.originalHTML){

        button.innerHTML =
            button.dataset.originalHTML;

    }

}


/*=========================================================
  MESSAGE HELPER
=========================================================*/

function showMessage(message){

    alert(message);

}