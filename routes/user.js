var express = require('express');
var router = express.Router();
var productHelpers = require('../helpers/product-helpers');
const userHelpers = require('../helpers/user-helpers');

/* GET home page. */
router.get('/', function(req, res, next) {

  productHelpers.getAllProducts().then((products)=>{
    res.render('user/user-viewProducts', { products , admin:false });
  })
  
});
 router.get('/login',(req,res)=>{
  res.render('user/login')
 })
 router.get('/signup',(req,res)=>{
  res.render('user/signup')
 })
 router.post('/signup',(req,res)=>{
  userHelpers.doSignUp(req.body).then((response)=>{
    console.log(response);
  })
 })
module.exports = router;
