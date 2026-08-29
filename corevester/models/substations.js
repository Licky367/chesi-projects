const mongoose=require('mongoose');
const substationSchema=new mongoose.Schema({name:{type:String,required:true,trim:true,unique:true,index:true},location:{type:String,trim:true,default:''},description:{type:String,default:''},isActive:{type:Boolean,default:true}},{timestamps:true});
module.exports=mongoose.model('Substation',substationSchema);
