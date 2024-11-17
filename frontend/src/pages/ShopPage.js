import React, { useEffect, useState } from 'react';
import axios from 'axios';

function ShopPage() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get('https://hac-webdev-2.onrender.com/api/products');
        setProducts(response.data);
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    };
    fetchProducts();
  }, []);

  return (
    <div className="dark:bg-gray-900 bg-gray-50 min-h-screen">
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold dark:text-white text-gray-800 mb-2">Shop</h1>
        <p className="dark:text-gray-300 text-gray-600 mb-6">Explore and buy travel essentials, souvenirs, and more!</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map(product => (
            <div key={product._id} className="dark:bg-gray-800 bg-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300">
              {product.image ? (
                <img src={product.image} alt={product.name} className="w-full h-48 object-cover rounded-t-lg" />
              ) : (
                <div className="w-full h-48 bg-gray-300 dark:bg-gray-700 rounded-t-lg" />
              )}
              <div className="p-4">
                <h2 className="text-xl font-semibold dark:text-white text-gray-800 mb-2">{product.name}</h2>
                <p className="dark:text-gray-300 text-gray-600 mb-2">{product.description}</p>
                <p className="text-lg font-bold dark:text-blue-400 text-blue-600">${product.price}</p>
                <p className="text-sm dark:text-gray-400 text-gray-600">Category: {product.category}</p>
                <p className="text-sm dark:text-gray-400 text-gray-600 mb-4">Stock: {product.stock}</p>
                <a
                  href={product.externalLink}
                  className="block text-center bg-blue-600 dark:bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors duration-300"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Buy Now
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ShopPage;
