import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

function LandmarkDetails() {
  const { landmarkId } = useParams();
  const [landmark, setLandmark] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState("");

  useEffect(() => {
    const fetchLandmarkDetails = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/landmarks/${landmarkId}`);
        setLandmark(response.data);
      } catch (error) {
        console.error("Error fetching landmark details:", error);
      }
    };

    const fetchReviews = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/landmarks/${landmarkId}/reviews`);
        setReviews(response.data);
      } catch (error) {
        console.error("Error fetching reviews:", error);
      }
    };

    fetchLandmarkDetails();
    fetchReviews();
  }, [landmarkId]);

  const handleAddReview = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`http://localhost:5000/api/landmarks/${landmarkId}/reviews`, { review: newReview });
      setReviews([...reviews, response.data]);
      setNewReview("");
    } catch (error) {
      console.error("Error adding review:", error);
    }
  };

  if (!landmark) {
    return <div className="text-center mt-10">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Image and Summary */}
        <div className="col-span-1 lg:col-span-2">
          <img
            src={landmark.imageUrl}
            alt={landmark.name}
            className="w-full h-64 lg:h-96 object-cover rounded-lg shadow-md"
          />
          <h2 className="text-4xl font-bold mt-4">{landmark.name}</h2>
          <p className="text-gray-700 mt-2">{landmark.description}</p>
          <p className="text-gray-500 mt-2">Location: {landmark.location || "Unknown"}</p>
        </div>

        {/* Reviews Section */}
        <div>
          <h3 className="text-2xl font-semibold mb-4">Reviews</h3>
          <div className="space-y-4">
            {reviews.length > 0 ? (
              reviews.map((review, index) => (
                <div key={index} className="p-4 bg-gray-100 rounded-lg shadow-md">
                  <p className="text-gray-700">{review.review}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-500">No reviews yet.</p>
            )}
          </div>
          <form onSubmit={handleAddReview} className="mt-6">
            <textarea
              value={newReview}
              onChange={(e) => setNewReview(e.target.value)}
              placeholder="Add your review..."
              className="w-full p-3 border rounded-lg focus:outline-none"
              rows="4"
            />
            <button
              type="submit"
              className="w-full mt-2 bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700"
            >
              Submit Review
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LandmarkDetails;
