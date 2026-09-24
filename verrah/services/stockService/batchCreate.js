
// ==========================================================
// services/stockService/createFifoBatch.js
// STOCK FIFO BATCH SERVICE
// VERRAH COSMETICS
// ==========================================================
//
// Creates a NEW FIFO purchase batch from scratch.
//
// The user provides:
//
//     units
//     totalBuyingPrice
//     purchasedAt
//
// The service calculates:
//
//     buyPrice
//         = totalBuyingPrice / units
//
// Example:
//
//     units = 100
//     totalBuyingPrice = 5000
//
//     buyPrice = 5000 / 100
//              = 50
//
// The batch is then stored as:
//
//     units: 100
//     buyPrice: 50
//
// purchaseBatches.units represents CURRENT REMAINING STOCK.
//
// Therefore:
//
//     Stock.units
//         = SUM(purchaseBatches.units)
//
// ==========================================================

const mongoose =
require("mongoose");

const Stock =
require("../../models/stock");

// ==========================================================
// CREATE FIFO BATCH
// ==========================================================
//
// Parameters:
//
//     stockId
//     body
//
// Expected body:
//
//     {
//         units,
//         totalBuyingPrice,
//         purchasedAt
//     }
//
// purchasedAt is optional.
//
// If purchasedAt is not supplied, the current date/time is
// used.
//
// Returns:
//
//     updated Stock document
//
// ==========================================================

async function createFifoBatch(
stockId,
body
) {

// ======================================================  
// VALIDATE STOCK ID  
// ======================================================  

if (  
    !mongoose.Types.ObjectId.isValid(  
        stockId  
    )  
) {  

    throw new Error(  
        "Invalid stock ID."  
    );  
}  


// ======================================================  
// SAFELY READ BODY  
// ======================================================  

body =  
    body || {};  


// ======================================================  
// READ UNITS  
// ======================================================  

const units =  
    Number(  
        body.units  
    );  


if (  
    !Number.isFinite(  
        units  
    ) ||  
    !Number.isInteger(  
        units  
    ) ||  
    units <= 0  
) {  

    throw new Error(  
        "Units must be a whole number greater than 0."  
    );  
}  


// ======================================================  
// READ TOTAL BUYING PRICE  
// ======================================================  

const totalBuyingPrice =  
    Number(  
        body.totalBuyingPrice  
    );  


if (  
    !Number.isFinite(  
        totalBuyingPrice  
    ) ||  
    totalBuyingPrice < 0  
) {  

    throw new Error(  
        "Total buying price must be a valid number greater than or equal to 0."  
    );  
}  


// ======================================================  
// CALCULATE BUY PRICE PER UNIT  
// ======================================================  

const buyPrice =  
    totalBuyingPrice /  
    units;  


if (  
    !Number.isFinite(  
        buyPrice  
    )  
) {  

    throw new Error(  
        "Unable to calculate buy price per unit."  
    );  
}  


// ======================================================  
// READ PURCHASE DATE  
// ======================================================  

let purchasedAt =  
    body.purchasedAt  
        ? new Date(  
            body.purchasedAt  
        )  
        : new Date();  


if (  
    Number.isNaN(  
        purchasedAt.getTime()  
    )  
) {  

    throw new Error(  
        "Invalid purchase date."  
    );  
}  


// ======================================================  
// START TRANSACTION  
// ======================================================  

const session =  
    await mongoose.startSession();  


try {  

    let updatedStock;  


    await session.withTransaction(  
        async () => {  

            // ==========================================  
            // LOAD ACTIVE STOCK  
            // ==========================================  

            const stock =  
                await Stock.findOne({  
                    _id: stockId,  
                    isActive: {  
                        $ne: false  
                    }  
                })  
                .session(  
                    session  
                );  


            if (!stock) {  

                throw new Error(  
                    "Stock not found."  
                );  
            }  


            // ==========================================  
            // ENSURE PURCHASE BATCH ARRAY EXISTS  
            // ==========================================  

            if (  
                !Array.isArray(  
                    stock.purchaseBatches  
                )  
            ) {  

                stock.purchaseBatches =  
                    [];  
            }  


            // ==========================================  
            // CREATE NEW FIFO BATCH  
            // ==========================================  

            stock.purchaseBatches.push({  

                units,  

                buyPrice,  

                purchasedAt  

            });  


            // ==========================================  
            // RECALCULATE TOTAL STOCK UNITS  
            // ==========================================  
            //  
            // Recalculate from every purchase batch.  
            //  
            // Do not simply add `units` to stock.units.  
            //  
            // This guarantees:  
            //  
            //     Stock.units  
            //         =  
            //     SUM(purchaseBatches.units)  
            //  
            // ==========================================  

            let totalUnits = 0;  


            for (  
                const batch  
                of stock.purchaseBatches  
            ) {  

                const batchUnits =  
                    Number(  
                        batch.units  
                    );  


                if (  
                    Number.isFinite(  
                        batchUnits  
                    ) &&  
                    batchUnits > 0  
                ) {  

                    totalUnits +=  
                        batchUnits;  
                }  
            }  


            // ==========================================  
            // UPDATE STOCK TOTAL  
            // ==========================================  

            stock.units =  
                totalUnits;  


            // ==========================================  
            // SAVE STOCK  
            // ==========================================  

            await stock.save({  
                session  
            });  


            updatedStock =  
                stock;  
        }  
    );  


    // ==================================================  
    // RETURN UPDATED STOCK  
    // ==================================================  

    return updatedStock;  

} finally {  

    await session.endSession();  
}

}

// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {

createFifoBatch

};