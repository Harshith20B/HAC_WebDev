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
        const landmarkResponse = await axios.get(`http://localhost:5000/api/landmarks/${landmarkId}`);
        setLandmark(landmarkResponse.data);
        const reviewsResponse = await axios.get(`http://localhost:5000/api/landmarks/${landmarkId}/reviews`);
        setReviews(reviewsResponse.data);
      } catch (error) {
        console.error("Error fetching landmark details or reviews:", error);
      }
    };
    fetchLandmarkDetails();
  }, [landmarkId]);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (newReview.trim() === "") return;

    try {
      const response = await axios.post(`http://localhost:5000/api/landmarks/${landmarkId}/reviews`, {
        review: newReview,
      });
      setReviews((prev) => [...prev, response.data]);
      setNewReview("");
    } catch (error) {
      console.error("Error submitting review:", error);
    }
  };

  if (!landmark) {
    return (
      <div className="flex justify-center items-center min-h-screen dark:bg-gray-900 bg-gray-50">
        <div className="dark:text-white text-gray-800">Loading...</div>
      </div>
    );
  }

  return (
    <div className="dark:bg-gray-900 bg-gray-50 min-h-screen">
      <div className="container mx-auto p-6">
        <h2 className="text-3xl font-bold dark:text-white text-gray-800 mb-6">{landmark.name}</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <img
            src={landmark.imageUrl}
            alt={landmark.name}
            className="rounded-lg shadow-lg object-cover w-full max-h-96"
          />
          <div className="dark:bg-gray-800 bg-white p-6 rounded-lg shadow-lg">
            <p className="dark:text-gray-300 text-gray-700 mb-4">{landmark.description}</p>
            <p className="dark:text-gray-400 text-gray-500 mb-4">
              Location: {landmark.location ? `${landmark.location.lat}, ${landmark.location.lon}` : "Unknown"}
            </p>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-2xl font-semibold dark:text-white text-gray-800 mb-4">Reviews</h3>
          <div className="space-y-4">
            {reviews.length > 0 ? (
              reviews.map((review, index) => (
                <div key={index} className="dark:bg-gray-800 bg-white p-4 rounded-lg shadow-lg">
                  <p className="dark:text-gray-300 text-gray-800">{review.text}</p>
                  <p className="text-sm dark:text-gray-400 text-gray-500 mt-2">- {review.createdAt}</p>
                </div>
              ))
            ) : (
              <p className="dark:text-gray-400 text-gray-600">No reviews yet. Be the first to add one!</p>
            )}
          </div>
        </div>

        <form onSubmit={handleReviewSubmit} className="mt-8">
          <h4 className="text-xl font-medium dark:text-white text-gray-800 mb-2">Add a Review</h4>
          <textarea
            value={newReview}
            onChange={(e) => setNewReview(e.target.value)}
            className="w-full p-4 border dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="3"
            placeholder="Write your review here..."
          ></textarea>
          <button
            type="submit"
            className="px-6 py-2 mt-4 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors duration-300"
          >
            Submit Review
          </button>
        </form>
      </div>
    </div>
  );
}

export default LandmarkDetails;
