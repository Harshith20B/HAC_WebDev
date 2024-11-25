// models/product.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  externalLink: { type: String, required: true },  // Updated to single external link
  image: { type: String, default: '' },  // URL of product image
  stock: { type: Number, required: true },
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
