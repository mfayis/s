var express = require('express');
const session = require('express-session');
const { Db } = require('mongodb');
const { response } = require('../app');
var router = express.Router();
var productHelpers = require('../helpers/product-helpers');
const userHelpers = require('../helpers/user-helpers');
const verifyLogin = (req, res, next) => {
  if (req.session.userLoggedIn) {
    next()
  } else {
    res.redirect('/login')
  }
}
/* GET home page. */
router.get('/', async function (req, res, next) {
  let user = req.session.user
  let cartCount
  if (user) {
    cartCount = await userHelpers.getCartCount(user._id)
  } else {
    cartCount = null
  }
  productHelpers.getAllProducts().then((products) => {
    res.render('user/user-viewProducts', { products, admin: false, user, cartCount });
  })
})

router.get('/login', (req, res) => {
  if (req.session.user) {
    res.redirect('/')
  } else {
    res.render('user/login', { loginErr: req.session.userLoginErr })
    req.session.userLoginErr = false
  }
})

router.get('/signup', (req, res) => {
  res.render('user/signup')
})

router.post('/signup', (req, res) => {
  userHelpers.doSignUp(req.body).then((response) => {

    req.session.user = response
    req.session.userLoggedIn = true
    res.redirect('/')

  })
})

router.post('/login', (req, res) => {

  userHelpers.doLogin(req.body).then((response) => {
    if (response.status) {
      
      req.session.user = response.user
      req.session.userLoggedIn = true
      res.redirect('/')
    } else {
      req.session.userLoginErr = true
      res.redirect('/login')
    }
  })
})

router.get('/logout', (req, res) => {
  // req.session.destroy()
  req.session.user=null
  req.session.userLoggedIn=false
  res.redirect('/')
})

router.get('/cart', verifyLogin, async (req, res) => {
  let user = req.session.user
  let products = await userHelpers.getCartProducts(user._id)
  console.log(products);
  let total = 0
if(products.length>0){
  total = await userHelpers.getTotalAmount(user._id)
}
  res.render('user/cart', { products, user, total })
})

router.get('/add-to-cart/:id', (req, res) => {//(check using verify login)

  userHelpers.addToCart(req.params.id, req.session.user._id).then((response) => {
    res.json({ status: response })
  })
})
router.post('/change-product-quandity', (req, res, next) => {
  userHelpers.changeProductQuandity(req.body).then(async (response) => {
    response.total = await userHelpers.getTotalAmount(req.body.user)

    res.json(response)
  })
})

router.post('/remove-product', (req, res, next) => {

  userHelpers.removeProduct(req.body).then((response) => {
    res.json(response)
  })
})

router.get('/place-order', verifyLogin, async (req, res) => {
  let user = req.session.user
  let total = await userHelpers.getTotalAmount(user._id)
  res.render('user/place-order', { total, user })
})



router.post('/place-order', verifyLogin, async (req, res) => {
  let products = await userHelpers.getCartProductList(req.body.userId);
  let totalAmount = await userHelpers.getTotalAmount(req.body.userId)
  userHelpers.placeOrder(req.body, products, totalAmount).then((orderId) => {
    orderId = "" + orderId
    if (req.body['payment-method'] === 'COD') {
      res.json({ codsuccess: true })
    } else if (req.body['payment-method'] === 'ONLINE') {
      userHelpers.generateRazorPay(orderId, totalAmount).then((response) => {
        res.json(response)
      })
    } else {
      res.send('Error!')
    }
  })
})

router.get('/order-success', (req, res) => {
  res.render('user/order-success', { user: req.session.user })
})

router.get('/orders', async (req, res) => {
  let orders = await userHelpers.getUserOrders(req.session.user._id)
  res.render('user/orders', { user: req.session.user, orders })
})

router.get('/view-order-products/:id', async (req, res) => {
  let products = await userHelpers.getOrderProducts(req.params.id)
  res.render('user/view-order-products', { user: req.session.user, products })

})

router.post('/verify-payment', (req, res) => {
  userHelpers.verifyPayment(req.body).then(() => {
    userHelpers.changePaymentStatus(req.body['order[receipt]']).then(() => {
      console.log('Payment successful')
      res.json({ status: true })
    }).catch((err) => {
      console.log(err);
      res.json({ status: false , errMsg:'' })
    })
  })
})
module.exports = router;
