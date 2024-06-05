var db = require('../config/connection')
var collection = require('../config/collection')
const bcrypt = require('bcrypt')
const e = require('express')
const { response } = require('express')
var objectId = require('mongodb').ObjectId
const Razorpay = require('razorpay');

var instance = new Razorpay({
  key_id: 'rzp_test_3FKRDwHvLYGoxX',
  key_secret: 'rBtzenhdRnEsYtCKXVFKqHCd',
});


module.exports = {
  doSignUp: (userData) => {
    return new Promise(async (resolve, reject) => {
      userData.Password = await bcrypt.hash(userData.Password, 10)
      db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data) => {
        userData._id = data.insertedId;
        resolve(userData);
      })
    })
  },
  doLogin: (userData) => {
    return new Promise(async (resolve, reject) => {
      let loginStatus = false;
      let response = {}
      let user = await db.get().collection(collection.USER_COLLECTION).findOne({ Email: userData.Email })
      if (user) {
        bcrypt.compare(userData.Password, user.Password).then((status) => {
          if (status) {
            response.status = true
            response.user = user
            resolve(response)
          } else {
            resolve({ status: false })
          }
        })
      } else {
        resolve({ status: false })
      }
    })
  },
  addToCart: (prodId, userId) => {
    let prodObj = {
      item: objectId(prodId),
      quandity: 1
    }
    return new Promise(async (resolve, reject) => {
      let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })

      if (userCart) {
        let prodExist = userCart.products.findIndex(product => product.item == prodId)
        if (prodExist != -1) {
          let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
          db.get().collection(collection.CART_COLLECTION).updateOne({ 'products.item': objectId(prodId), user: objectId(userId) }, {
            $inc: { 'products.$.quandity': 1 }
          }).then((response) => {
            resolve(false)
          })
        } else {
          db.get().collection(collection.CART_COLLECTION).updateOne({ user: objectId(userId) }, {
            $push: { products: prodObj }
          }).then((response) => {
            resolve(true)
          })

        }

      } else {
        let cartObj = {
          user: objectId(userId),
          products: [prodObj]
        }
        db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response) => {
          resolve(true)
        })
      }

    })

  },
  getCartProducts: (userId) => {
    return new Promise(async (resolve, reject) => {
      let cartProducts = await db.get().collection(collection.CART_COLLECTION).aggregate([
        {
          $match: { user: objectId(userId) }
        }, {
          $unwind: '$products'
        }, {
          $project: {
            item: "$products.item",
            quandity: "$products.quandity"
          }
        }, {
          $lookup: {
            from: collection.PRODUCT_COLLECTION,
            localField: "item",
            foreignField: "_id",
            as: "product"
          }
        }, {
          $project: {
            item: 1,
            quandity: 1,
            product: { $arrayElemAt: ['$product', 0] }
          }
        }
      ]).toArray()

      //   {                 //(older code)
      //     $lookup:
      //     {
      //       from: collection.PRODUCT_COLLECTION,
      //       localField: "products",
      //       foreignField: "_id",
      //       as: "cartItems"
      //     }
      //   }

      let cartCheck = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
      if (cartCheck) {
        resolve(cartProducts)

      } else {
        resolve()
      }
    })
  },
  getCartCount: (userId) => {
    return new Promise(async (resolve, reject) => {
      let count = 0
      let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
      if (cart) {
        count = cart.products.length   ///(flipkart like cart count)

        //  count= await db.get().collection(collection.CART_COLLECTION).aggregate([  ///(amazon like cart count)
        //     { $match: { user: objectId(userId) } },
        //       {$project:{"_id":0,totalquandity:{$sum:"$products.quandity"}}},
        //     ]).toArray()
        // console.log(count[0].totalquandity);
      }

      resolve(count)
    })
  },
  changeProductQuandity: (details) => {
    count = parseInt(details.count)
    quandity = parseInt(details.quandity)
    return new Promise((resolve, reject) => {
      if (quandity == 1 && count == -1) {
        db.get().collection(collection.CART_COLLECTION).updateOne({ _id: objectId(details.cart) }, {
          $pull: { products: { item: objectId(details.product) } }
        }).then((response) => {
          resolve({ removeProduct: true })
        })
      } else {
        db.get().collection(collection.CART_COLLECTION).updateOne({ _id: objectId(details.cart), 'products.item': objectId(details.product) },
          {
            $inc: { 'products.$.quandity': count }
          }).then((response => {
            resolve({ status: true })
          }))
      }
    })
  },
  removeProduct: (data) => {
    return new Promise((resolve, reject) => {
      db.get().collection(collection.CART_COLLECTION).updateOne({ _id: objectId(data.cart) }, {
        $pull: { products: { item: objectId(data.product) } }
      }).then((res) => {

        resolve(true)
      })
    })
  },
  getTotalAmount: (userId) => {
    return new Promise(async (resolve, reject) => {
      let total = await db.get().collection(collection.CART_COLLECTION).aggregate([
        {
          $match: { user: objectId(userId) }
        }, {
          $unwind: '$products'
        }, {
          $project: {
            item: '$products.item',
            quandity: '$products.quandity'
          }
        }, {
          $lookup: {
            from: collection.PRODUCT_COLLECTION,
            localField: 'item',
            foreignField: '_id',
            as: 'product'
          }
        }, {

          $project: {
            item: 1,
            quandity: 1,
            product: { $arrayElemAt: ['$product', 0] }
          }

        }, {
          $group: {
            _id: null,
            total: { $sum: { $multiply: ['$quandity', '$product.Price'] } }
          }
        }
      ]).toArray()

      resolve(total[0].total);

    })
  },
  placeOrder: (order, products, price) => {
    console.log(order, products, price);
    return new Promise((resolve, reject) => {
      let orderStatus = order['payment-method'] === 'COD' ? 'placed' : 'pending'
      let orderObj = {
        deliveryDetails: {
          mobile: order.mobile,
          address: order.address,
          pincode: order.pincode
        },
        userId: objectId(order.userId),
        date: new Date(),
        totalAmount: price,
        products: products,
        orderStatus: orderStatus,
        paymentMethod: order['payment-method']

      }

      db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response) => {
        db.get().collection(collection.CART_COLLECTION).deleteOne({ user: objectId(order.userId) })
        resolve(response.insertedId)
      })
    })
  },
  getCartProductList: (userId) => {
    return new Promise(async (resolve, reject) => {
      let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
      resolve(cart.products);
    })
  },
  getUserOrders: (userId) => {
    return new Promise(async (resolve, reject) => {
      let orders = await db.get().collection(collection.ORDER_COLLECTION).find({ userId: objectId(userId) }).toArray()
      resolve(orders)
    })
  },
  getOrderProducts: (orderId) => {
    return new Promise(async (resolve, reject) => {
      let orderItems = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
        {
          $match: { _id: objectId(orderId) }
        }, {
          $unwind: '$products'
        }, {
          $project: {
            item: '$products.item',
            quandity: '$products.quandity'
          }                                                    // these is sonu way
        }, {
          $lookup: {
            from: collection.PRODUCT_COLLECTION,
            localField: 'item',
            foreignField: '_id',
            as: 'product'
          }
        }, {
          $project: {
            item: 1,
            quandity: 1,
            product: { $arrayElemAt: ['$product', 0] }
          }
        }]).toArray()

      resolve(orderItems)
    })
  },

  //   },{
  //     $lookup:{        
  //       from:collection.PRODUCT_COLLECTION,
  //       localField:'products.item',
  //       foreignField:'_id',
  //       as:'product'
  //     }
  //   },{              //myway
  //       $project:{
  //         _id:0,
  //         product:1
  //       }
  //     }
  // ]).toArray()

  generateRazorPay: (orderId, totalAmount) => {
    return new Promise((resolve, reject) => {
      instance.orders.create({
        amount: totalAmount * 100,
        currency: "INR",
        receipt: "" + orderId,

      }).then((response) => {
        console.log(response)
        resolve(response)
      }).catch((err) => {
        reject("vannneeeee", err)
      })
    })
  },

  verifyPayment: (details) => {
    return new Promise((resolve, reject) => {
      const crypto = require('node:crypto')
      const secret = 'rBtzenhdRnEsYtCKXVFKqHCd';
      const hash = crypto.createHmac('sha256', secret)
        .update(details['payment[razorpay_order_id]'] + "|" + details['payment[razorpay_payment_id]'], secret)
        .digest('hex');


      if (hash == details['payment[razorpay_signature]']) {
        resolve()
      } else {
        reject()
      }
    })
  },

  changePaymentStatus:(orderId)=>{
   return new Promise((resolve,reject)=>{
    db.get().collection(collection.ORDER_COLLECTION).updateOne({_id:objectId(orderId)},
    {
      $set:{
        orderStatus:'placed'
      }
    }).then(()=>{
      resolve()
    })
   })
  }

}