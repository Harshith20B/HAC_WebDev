import React, { useEffect, useState } from 'react';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

function Connect() {
  const [travelPlans, setTravelPlans] = useState([]);
  const [newPlan, setNewPlan] = useState({
    user: '',
    title: '',
    description: '',
    landmarks: '',
    maxPeople: '',
    dateRange: { start: null, end: null },
  });
  const [groupSize, setGroupSize] = useState(1);

  // Fetch all travel plans
  const fetchTravelPlans = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/travelplans');
      setTravelPlans(response.data);
    } catch (error) {
      console.error('Error fetching travel plans:', error);
    }
  };

  // Add a new travel plan
  const handleAddTravelPlan = async () => {
    try {
      await axios.post('http://localhost:5000/api/travelplans', {
        ...newPlan,
        landmarks: newPlan.landmarks.split(','),
        dateRange: {
          start: newPlan.dateRange.start,
          end: newPlan.dateRange.end,
        },
      });
      fetchTravelPlans(); // Refresh the list
    } catch (error) {
      console.error('Error adding travel plan:', error);
    }
  };

  // Join a travel plan
  const handleJoinPlan = async (id) => {
    try {
      await axios.post(`http://localhost:5000/api/travelplans/${id}/join`, { groupSize });
      fetchTravelPlans(); // Refresh the list
    } catch (error) {
      console.error('Error joining travel plan:', error);
    }
  };

  useEffect(() => {
    fetchTravelPlans();
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Travel Plans</h1>

      {/* Add Travel Plan Form */}
      <div className="mb-10 p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Add Travel Plan</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Your Name"
            value={newPlan.user}
            onChange={(e) => setNewPlan({ ...newPlan, user: e.target.value })}
            className="border border-gray-300 rounded px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <input
            type="text"
            placeholder="Title"
            value={newPlan.title}
            onChange={(e) => setNewPlan({ ...newPlan, title: e.target.value })}
            className="border border-gray-300 rounded px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <textarea
            placeholder="Description"
            value={newPlan.description}
            onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
            className="col-span-2 border border-gray-300 rounded px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <input
            type="text"
            placeholder="Landmarks (comma-separated)"
            value={newPlan.landmarks}
            onChange={(e) => setNewPlan({ ...newPlan, landmarks: e.target.value })}
            className="border border-gray-300 rounded px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <input
            type="number"
            placeholder="Max People"
            value={newPlan.maxPeople}
            onChange={(e) => setNewPlan({ ...newPlan, maxPeople: e.target.value })}
            className="border border-gray-300 rounded px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <div className="col-span-2 flex gap-4 items-center">
            <div>
              <label className="block text-gray-600 mb-1">Start Date</label>
              <DatePicker
                selected={newPlan.dateRange.start}
                onChange={(date) => setNewPlan({ ...newPlan, dateRange: { ...newPlan.dateRange, start: date } })}
                selectsStart
                startDate={newPlan.dateRange.start}
                endDate={newPlan.dateRange.end}
                className="border border-gray-300 rounded px-4 py-2"
              />
            </div>
            <div>
              <label className="block text-gray-600 mb-1">End Date</label>
              <DatePicker
                selected={newPlan.dateRange.end}
                onChange={(date) => setNewPlan({ ...newPlan, dateRange: { ...newPlan.dateRange, end: date } })}
                selectsEnd
                startDate={newPlan.dateRange.start}
                endDate={newPlan.dateRange.end}
                className="border border-gray-300 rounded px-4 py-2"
              />
            </div>
          </div>
        </div>
        <button
          onClick={handleAddTravelPlan}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Add Travel Plan
        </button>
      </div>

      {/* List Travel Plans */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Available Travel Plans</h2>
        {travelPlans.length === 0 ? (
          <p className="text-gray-500">No travel plans available yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {travelPlans.map((plan) => (
              <div key={plan._id} className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-bold text-gray-700">{plan.title}</h3>
                <p className="text-gray-600 mt-2">{plan.description}</p>
                <p className="text-gray-700 mt-4">
                  <span className="font-semibold">Landmarks:</span> {plan.landmarks.join(', ')}
                </p>
                <p className="text-gray-700 mt-2">
                  <span className="font-semibold">People:</span> {plan.currentPeople}/{plan.maxPeople}
                </p>
                {plan.currentPeople < plan.maxPeople ? (
                  <div className="mt-4">
                    <input
                      type="number"
                      placeholder="Group Size"
                      value={groupSize}
                      onChange={(e) => setGroupSize(Number(e.target.value))}
                      className="border border-gray-300 rounded px-4 py-2 mr-2 w-20"
                    />
                    <button
                      onClick={() => handleJoinPlan(plan._id)}
                      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                    >
                      Join
                    </button>
                  </div>
                ) : (
                  <button
                    disabled
                    className="mt-4 bg-gray-400 text-white px-4 py-2 rounded cursor-not-allowed"
                  >
                    Full
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Connect;
