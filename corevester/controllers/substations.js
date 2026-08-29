const service=require('../services/substationService');
exports.list=async(req,res)=>{try{res.render('substations/index',{title:'Substations',substations:await service.list(),error:req.query.error||null,saved:req.query.saved||''})}catch(e){res.status(500).render('substations/index',{title:'Substations',substations:[],error:e.message,saved:''})}};
exports.newForm=(req,res)=>res.render('substations/new',{title:'New Substation',error:null,old:{}});
exports.create=async(req,res)=>{try{await service.create(req.body);res.redirect('/substations?saved=1')}catch(e){res.status(400).render('substations/new',{title:'New Substation',error:e.message,old:req.body})}};
exports.detail=async(req,res)=>{const substation=await service.getWithProducts(req.params.id);if(!substation)return res.redirect('/substations?error=Substation+not+found');res.render('substations/detail',{title:substation.name,substation})};
exports.productDetail=async(req,res)=>{const product=await service.getProduct(req.params.id);if(!product)return res.redirect('/substations?error=Product+not+found');res.render('substations/product-detail',{title:product.name,product})};
