var db = require("../config/connection")
var collection = require('../config/collection')
const { response } = require("../app")
var objectId = require('mongodb').ObjectId

module.exports = {

  addProduct: (product, callback) => {
    product.Price=parseInt(product.Price)
    db.get().collection('product').insertOne(product).then((data) => {

      callback(data.insertedId);
    })
  },
  getAllProducts: () => {
    return new Promise(async (resolve, reject) => {
      let products = await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
      resolve(products)
    })
  },
  deleteProduct: (prodId) => {
    return new Promise((resolve, reject) => {
      db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({ _id: objectId(prodId) }).then((response) => {
        resolve(response)
      })
    })
  },
  getProductDetails:(prodId)=>{
    return new Promise((resolve,reject)=>{
      db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:objectId(prodId)}).then((product)=>{
        resolve(product)
      })
    })
  },
  updateProduct:(prodId,prodDetils)=>{
    return new Promise((resolve,reject)=>{
      db.get().collection(collection.PRODUCT_COLLECTION).updateOne({_id:objectId(prodId)},{
        $set:{
        Name:prodDetils.Name,
        Category:prodDetils.Category,
        Description:prodDetils.Description,
        Price:prodDetils.Price
      }}).then((response)=>{
        resolve(response)
      })
    })
   
  }
}