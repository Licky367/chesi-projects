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
                    "_id name"
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

                    user.name

                ]

            )

        );


    // ======================================================
    // RETURN ARREARS
    // ======================================================

    return arrearsPackages

        .map(

            pkg => ({

                _id:
                    pkg._id,

                clientName:
                    userMap.get(

                        String(
                            pkg.clientId
                        )

                    ) ||
                    "Unknown Client",

                phoneNumber:
                    pkg.phoneNumber ||
                    "",

                packageName:
                    String(
                        pkg._id
                    ),

                arrears:
                    pkg.arrears

            })

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