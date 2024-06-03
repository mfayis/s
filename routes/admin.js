var express = require('express');
const app = require('../app');
var router = express.Router();
var productHelper = require('../helpers/product-helpers')

/* GET users listing. */
router.get('/', function(req, res, next) {
 productHelper.getAllProducts().then((products)=>{
 
  res.render('admin/view-products',{admin:true,products});

 })
  
});

router.get('/add-product',function (req,res) {
  res.render('admin/add-product')
})

router.post('/add-product',(req,res)=>{
 console.log(req.body);
  productHelper.addProduct(req.body,(id)=>{
    let image = req.files.Image
  
    image.mv('./public/product-images/'+id+'.jpg',(err,done)=>{
      if(!err){
        res.render('admin/add-product')
      }else{
        console.log(err);
      }
    })
   
  })
})
router.get('/delete-Product/:id',(req,res)=>{  //in case2 router.get('/deleteProduct',(req,res)=>{
  let  prodId=req.params.id                   //case2 let prodId=req.query.id in case of (<a href="/admin/deleteProduct?id={{this._id}}&name={{this.Name}}" class="btn btn-danger">Delete</a>
  productHelper.deleteProduct(prodId).then((response)=>{
    res.redirect('/admin/')
  })

})
router.get('/edit-Product/:id',async(req,res)=>{
  let product =  await productHelper.getProductDetails(req.params.id)
  res.render('admin/edit-product',{product})
})
router.post('/edit-product/:id',(req,res)=>{
  let id =req.params.id
productHelper.updateProduct(id,req.body).then((response)=>{
res.redirect('/admin')
if(req.files.Image){
  let image = req.files.Image
  image.mv('./public/product-images/'+id+'.jpg')
}
})
})
module.exports = router;
