const mongoose=require('mongoose'); const Substation=require('../models/substations'); const Product=require('../models/products'); const t=v=>String(v??'').trim();
exports.list=()=>Substation.find({isActive:true}).sort({name:1}).lean();
exports.create=async body=>{const name=t(body.name);if(!name)throw Error('Substation name is required.');if(await Substation.findOne({name}))throw Error('A substation with that name already exists.');return Substation.create({name,location:t(body.location),description:t(body.description)})};
exports.getWithProducts=async id=>{if(!mongoose.isValidObjectId(id))return null;const s=await Substation.findById(id).lean();if(!s)return null;const products=await Product.find({substation:s._id,isActive:true}).sort({createdAt:-1}).lean();return {...s,products}};
exports.getProduct=id=>mongoose.isValidObjectId(id)?Product.findById(id).populate('stock','name category').populate('substation','name location').lean():null;
