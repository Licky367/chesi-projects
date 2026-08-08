const mongoose = require("mongoose");

/* =========================================================
NET WORTH ASSET SCHEMA
========================================================= */

const netWorthSchema = new mongoose.Schema(

{

/* =====================================================  
   ITEM  
     
   For Dairy assets:  
   Automatically populated from Dairy.name.  

   For manual structure assets:  
   Entered by the user.  
===================================================== */  

item: {  

  type: String,  

  required: true,  

  trim: true  

},  


/* =====================================================  
   TYPE  
     
   Examples:  
   - cow  
   - dairy Facility  
   - Equipment  
   - Vehicle  
   - Water Tank  
   - etc.  
===================================================== */  

type: {  

  type: String,  

  required: true,  

  trim: true  

},  


/* =====================================================  
   BUYING PRICE  
     
   Original purchase/acquisition price.  

   For Dairy-generated assets this initially defaults  
   to zero and can later be updated from the frontend.  

   For manually created assets, the user supplies it.  
===================================================== */  

buyingPrice: {  

  type: Number,  

  default: 0,  

  min: 0  

},  


/* =====================================================  
   CURRENT WORTH  
     
   Current estimated value of the asset.  

   This is the value used in the net-worth calculation.  
===================================================== */  

currentWorth: {  

  type: Number,  

  default: 0,  

  min: 0  

},  


/* =====================================================  
   DESCRIPTION  
===================================================== */  

description: {  

  type: String,  

  trim: true,  

  default: ""  

},  


/* =====================================================  
   CONDITION  
     
   Examples:  
   - New  
   - Good  
   - Fair  
   - Poor  
===================================================== */  

condition: {  

  type: String,  

  trim: true,  

  default: ""  

},  


/* =====================================================  
   LOCATION  
===================================================== */  

location: {  

  type: String,  

  trim: true,  

  default: ""  

},  


/* =====================================================  
   ACQUISITION DATE  
     
   Dairy asset:  
   Comes from Dairy.createdAt.  

   Manual asset:  
   Set when the user saves the asset.  
===================================================== */  

acquisitionDate: {  

  type: Date,  

  required: true  

},  


/* =====================================================  
   VALUATION DATE  
     
   Date on which currentWorth was last evaluated.  
===================================================== */  

valuationDate: {  

  type: Date,  

  default: null  

},  


/* =====================================================  
   STATUS  
     
   Only active assets should normally contribute to  
   net worth.  
===================================================== */  

status: {  

  type: String,  

  enum: [  

    "active",  

    "sold",  

    "disposed",  

    "inactive"  

  ],  

  default: "active",  

  index: true  

},  


/* =====================================================  
   SOURCE  
     
   dairy:  
   Automatically created from a Dairy record.  

   structure:  
   Manually created asset belonging to a structure.  
===================================================== */  

source: {  

  type: String,  

  enum: [  

    "dairy",  

    "structure"  

  ],  

  required: true,  

  index: true  

},  


/* =====================================================  
   SOURCE ID  
     
   For Dairy-generated assets this points to the  
   original Dairy document.  
===================================================== */  

sourceId: {  

  type: mongoose.Schema.Types.ObjectId,  

  ref: "Dairy",  

  default: null,  

  index: true  

},  


/* =====================================================  
   PARENT STRUCTURE  
     
   Used when an asset belongs to a Dairy structure.  

   For example:  

   Structure:  
       Main Dairy Shed  
       code = -10  

   Cow:  
       code = 25  
       assetCode = -10  

   The corresponding Net Worth asset can point to  
   the structure through this field.  
===================================================== */  

parentStructure: {  

  type: mongoose.Schema.Types.ObjectId,  

  ref: "NetWorth",  

  default: null,  

  index: true  

},  


/* =====================================================  
   STRUCTURE CODE  
     
   Stores the Dairy structure code when the asset  
   belongs to a Dairy structure.  

   Example:  

   structure.code = -10  

   cow.assetCode = -10  

   structureCode = -10  
===================================================== */  

structureCode: {  

  type: Number,  

  default: null,  

  index: true  

}

},

{

timestamps: true,  

minimize: false

}

);

/* =========================================================
VIRTUAL
CURRENT ASSET VALUE
========================================================= */

netWorthSchema.virtual("assetValue").get(function () {

return Number(this.currentWorth) || 0;

});

/* =========================================================
STATIC
CALCULATE TOTAL NET WORTH

Net worth for now is simply:

SUM(currentWorth)

Only active assets are included.
========================================================= */

netWorthSchema.statics.calculateNetWorth = async function () {

const result = await this.aggregate([

{  
  $match: {  
    status: "active"  
  }  
},  

{  
  $group: {  

    _id: null,  

    totalNetWorth: {  

      $sum: "$currentWorth"  

    }  

  }  

}

]);

return result.length

? result[0].totalNetWorth  

: 0;

};

/* =========================================================
STATIC
CALCULATE TOTAL CURRENT WORTH
========================================================= */

netWorthSchema.statics.getTotalCurrentWorth = async function () {

return this.calculateNetWorth();

};

/* =========================================================
INDEXES
========================================================= */

/* ---------------------------------------------------------
Find all assets belonging to a structure
--------------------------------------------------------- */

netWorthSchema.index({

parentStructure: 1,

status: 1

});

/* ---------------------------------------------------------
Find Dairy-generated assets
--------------------------------------------------------- */

netWorthSchema.index({

source: 1,

sourceId: 1

});

/* ---------------------------------------------------------
Find assets by structure code
--------------------------------------------------------- */

netWorthSchema.index({

structureCode: 1,

status: 1

});

/* =========================================================
EXPORT
========================================================= */

module.exports = mongoose.model(

"NetWorth",

netWorthSchema

);