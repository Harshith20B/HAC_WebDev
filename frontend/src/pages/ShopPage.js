// pages/ShopPage.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';

function ShopPage() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/products');
        setProducts(response.data);
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    };
    fetchProducts();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold">Shop</h1>
      <p>Explore and buy travel essentials, souvenirs, and more!</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-6">
        {products.map(product => (
          <div key={product._id} className="border p-4 rounded-lg">
            {product.image ? (
              <img src={product.image} alt={product.name} className="w-full h-48 object-cover mb-4" />
            ) : (
              <div className="w-full h-48 bg-gray-300 mb-4" />
            )}
            <h2 className="text-xl font-semibold">{product.name}</h2>
            <p>{product.description}</p>
            <p className="text-lg font-bold">${product.price}</p>
            <p className="text-sm text-gray-600">Category: {product.category}</p>
            <p className="text-sm text-gray-600">Stock: {product.stock}</p>
            <div className="mt-4">
                <a
                    href={product.externalLink}  // Changed from product.externalLinks to product.externalLink
                    className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-400"
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
  );
}

export default ShopPage;
