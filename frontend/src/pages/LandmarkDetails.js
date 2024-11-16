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
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-3xl font-bold mb-4">{landmark.name}</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <img
          src={landmark.imageUrl}
          alt={landmark.name}
          className="rounded-lg shadow-lg object-cover w-full max-h-96"
        />
        <div>
          <p className="text-gray-700 mb-4">{landmark.description}</p>
          <p className="text-gray-500 mb-4">
            Location: {landmark.location ? `${landmark.location.lat}, ${landmark.location.lon}` : "Unknown"}
          </p>
          {/* Additional Landmark Details */}
        </div>
      </div>

      {/* Reviews Section */}
      <div className="mt-8">
        <h3 className="text-2xl font-semibold mb-4">Reviews</h3>
        <div className="space-y-4">
          {reviews.length > 0 ? (
            reviews.map((review, index) => (
              <div key={index} className="border-b pb-2">
                <p className="text-gray-800">{review.text}</p>
                <p className="text-sm text-gray-500">- {review.createdAt}</p>
              </div>
            ))
          ) : (
            <p className="text-gray-600">No reviews yet. Be the first to add one!</p>
          )}
        </div>
      </div>

      {/* Add Review Section */}
      <form onSubmit={handleReviewSubmit} className="mt-6">
        <h4 className="text-xl font-medium mb-2">Add a Review</h4>
        <textarea
          value={newReview}
          onChange={(e) => setNewReview(e.target.value)}
          className="w-full p-3 border rounded-lg focus:outline-none focus:ring"
          rows="3"
          placeholder="Write your review here..."
        ></textarea>
        <button
          type="submit"
          className="px-4 py-2 mt-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Submit Review
        </button>
      </form>
    </div>
  );
}

export default LandmarkDetails;
