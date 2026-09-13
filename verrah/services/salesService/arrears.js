// ==========================================================
// verrah/services/salesService/arrears.js
//
// VERRAH COSMETICS
// CUSTOMER ARREARS SERVICE
// ==========================================================


const Package =
    require("../../models/package");

const User =
    require("../../models/user");


// ==========================================================
// GET CUSTOMER ARREARS
// ==========================================================

async function getCustomerArrears(
    filter
) {

    const packages =
        await Package.find({

            status:
                "delivered",

            createdAt: {

                $gte:
                    filter.startDate,

                $lt:
                    filter.endDate

            }

        })

            .select(
                "_id clientId phoneNumber totalAmount paidAmount"
            )

            .lean();


    // ======================================================
    // CALCULATE ARREARS
    // ======================================================

    const arrearsPackages =
        packages

            .map(

                pkg => ({

                    ...pkg,

                    arrears:
                        Math.max(

                            0,

                            Number(
                                pkg.totalAmount || 0
                            ) -

                            Number(
                                pkg.paidAmount || 0
                            )

                        )

                })

            )

            .filter(

                pkg =>
                    pkg.arrears > 0

            );


    if (
        !arrearsPackages.length
    ) {

        return [];

    }


    // ======================================================
    // CLIENT IDS
    // ======================================================

    const clientIds = [

        ...new Set(

            arrearsPackages

                .map(

                    pkg =>
                        String(
                            pkg.clientId || ""
                        )

                )

                .filter(Boolean)

        )

    ];


    // ======================================================
    // LOAD CLIENTS
    //
    // phone is the phone field in User.
    // ======================================================

    const users =
        clientIds.length

            ? await User.find({

                _id: {

                    $in:
                        clientIds

                }

            })

                .select(
                    "_id name phone"
                )

                .lean()

            : [];


    // ======================================================
    // CLIENT MAP
    // ======================================================

    const userMap =
        new Map(

            users.map(

                user => [

                    String(
                        user._id
                    ),

                    {

                        name:
                            user.name,

                        phone:
                            user.phone || ""

                    }

                ]

            )

        );


    // ======================================================
    // RETURN ARREARS
    // ======================================================

    return arrearsPackages

        .map(

            pkg => {

                const user =
                    userMap.get(
                        String(
                            pkg.clientId
                        )
                    );


                return {

                    _id:
                        pkg._id,

                    clientName:
                        user?.name ||
                        "Unknown Client",

                    // ------------------------------------------------
                    // USE PACKAGE PHONE FIRST.
                    // IF EMPTY, USE USER PHONE.
                    // ------------------------------------------------

                    phoneNumber:
                        pkg.phoneNumber ||
                        user?.phone ||
                        "",

                    packageName:
                        String(
                            pkg._id
                        ),

                    arrears:
                        pkg.arrears

                };

            }

        )

        .sort(

            (a, b) =>
                b.arrears -
                a.arrears

        );

}


// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

    getCustomerArrears

};