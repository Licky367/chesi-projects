/*=========================================================
  MEDICAL ACTION MENU
=========================================================*/

function toggleMedicalMenu(id) {

    const menu = document.getElementById("medicalMenu-" + id);

    if (!menu) return;

    const button = menu.previousElementSibling;

    const isOpen = menu.classList.contains("medical-menu-visible");

    // Close all other medical menus
    document
        .querySelectorAll(".medical-action-menu.medical-menu-visible")
        .forEach(openMenu => {

            openMenu.classList.remove("medical-menu-visible");

            const openButton = openMenu.previousElementSibling;

            if (openButton) {
                openButton.setAttribute("aria-expanded", "false");
            }

        });

    // Open selected menu
    if (!isOpen) {

        menu.classList.add("medical-menu-visible");

        if (button) {
            button.setAttribute("aria-expanded", "true");
        }

    }

}


/*=========================================================
  CLOSE WHEN CLICKING OUTSIDE
=========================================================*/

document.addEventListener("click", event => {

    if (
        event.target.closest(".medical-menu-toggle") ||
        event.target.closest(".medical-action-menu")
    ) {
        return;
    }

    document
        .querySelectorAll(".medical-action-menu.medical-menu-visible")
        .forEach(menu => {

            menu.classList.remove("medical-menu-visible");

            const button = menu.previousElementSibling;

            if (button) {
                button.setAttribute("aria-expanded", "false");
            }

        });

});


/*=========================================================
  GLOBAL ACCESS
=========================================================*/

window.toggleMedicalMenu = toggleMedicalMenu;