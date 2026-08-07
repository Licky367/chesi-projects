/*=========================================================
  MAINTENANCE ACTION MENU
=========================================================*/


function toggleMaintenanceMenu(id) {

    const menu = document.getElementById(
        "maintenanceMenu-" + id
    );

    if (!menu) return;


    const button = menu.previousElementSibling;


    const isOpen =
        menu.classList.contains(
            "maintenance-menu-visible"
        );


    // Close all other menus

    document
        .querySelectorAll(
            ".maintenance-action-menu.maintenance-menu-visible"
        )
        .forEach(openMenu => {

            openMenu.classList.remove(
                "maintenance-menu-visible"
            );


            const openButton =
                openMenu.previousElementSibling;


            if (openButton) {

                openButton.setAttribute(
                    "aria-expanded",
                    "false"
                );

            }

        });


    // Open selected menu

    if (!isOpen) {

        menu.classList.add(
            "maintenance-menu-visible"
        );


        if (button) {

            button.setAttribute(
                "aria-expanded",
                "true"
            );

        }

    }

}



/*=========================================================
  CLOSE WHEN CLICKING OUTSIDE
=========================================================*/

document.addEventListener(
    "click",
    event => {


        if (

            event.target.closest(
                ".maintenance-menu-toggle"
            )

            ||

            event.target.closest(
                ".maintenance-action-menu"
            )

        ) {

            return;

        }



        document
            .querySelectorAll(
                ".maintenance-action-menu.maintenance-menu-visible"
            )
            .forEach(menu => {


                menu.classList.remove(
                    "maintenance-menu-visible"
                );


                const button =
                    menu.previousElementSibling;


                if (button) {

                    button.setAttribute(
                        "aria-expanded",
                        "false"
                    );

                }


            });


    }
);



window.toggleMaintenanceMenu =
    toggleMaintenanceMenu;