import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

function LandmarkDetail() {
  const { id } = useParams();
  const [landmark, setLandmark] = useState(null);

  useEffect(() => {
    const fetchLandmark = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/explore/detail/${id}`);
        setLandmark(response.data);
      } catch (error) {
        console.error("Error fetching landmark details:", error);
      }
    };

    fetchLandmark();
  }, [id]);

  if (!landmark) return <p>Loading...</p>;

  return (
    <div className="landmark-detail">
      <h1>{landmark.name}</h1>
      <p>{landmark.description}</p>
      <img src={landmark.imageUrl} alt={landmark.name} />
      <p>Activities: {landmark.activities.join(', ')}</p>
      <p>Cuisines: {landmark.cuisines.join(', ')}</p>
      <button onClick={() => console.log("Booking...")}>Book Now</button>
    </div>
  );
}

export default LandmarkDetail;
