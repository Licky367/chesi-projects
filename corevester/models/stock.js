const mongoose=require('mongoose');
const stockSchema=new mongoose.Schema({name:{type:String,required:true,trim:true,index:true},category:{type:String,required:true,trim:true,lowercase:true,index:true},image:{type:String,trim:true,default:''},units:{type:Number,required:true,min:0,default:0},buyPrice:{type:Number,min:0,default:0},description:{type:String,default:''},isActive:{type:Boolean,default:true}},{timestamps:true});
module.exports=mongoose.model('Stock',stockSchema);
