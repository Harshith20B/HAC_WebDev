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
    email: '', // Add email to the new plan
  });
  const [groupSize, setGroupSize] = useState(1);
  const [currentUserEmail, setCurrentUserEmail] = useState(''); // Store current user email

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
        email: currentUserEmail, // Include current user email
      });
      fetchTravelPlans(); // Refresh the list

      // Reset the form fields after adding the travel plan
      setNewPlan({
        user: '',
        title: '',
        description: '',
        landmarks: '',
        maxPeople: '',
        dateRange: { start: null, end: null },
        email: '', // Reset email
      });
    } catch (error) {
      console.error('Error adding travel plan:', error);
    }
  };

  // Send Invite to Outlook
  const handleSendInvite = (email, planTitle) => {
    const subject = encodeURIComponent(`Join my travel plan: ${planTitle}`);
    const body = encodeURIComponent(`Hi there, \n\nI would like to invite you to join my travel plan titled "${planTitle}". \n\nPlease let me know if you're interested!\n\nBest regards,`);
    const outlookLink = `https://outlook.live.com/owa/?path=/mail/action/compose&to=${email}&subject=${subject}&body=${body}`;

    window.open(outlookLink, '_blank'); // Open the Outlook email composer
  };

  useEffect(() => {
    // Fetch current user email if needed, assuming it's part of your authentication system.
    setCurrentUserEmail('user@example.com'); // Replace with actual user email after authentication
    fetchTravelPlans();
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-6 bg-gradient-to-br from-blue-50 to-blue-100 min-h-screen">
      <h1 className="text-4xl font-extrabold text-gray-800 mb-6 text-center">
        Travel Plans
      </h1>

      {/* Add Travel Plan Form */}
      <div className="mb-10 p-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">
          Add Travel Plan
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Your Name"
            value={newPlan.user}
            onChange={(e) => setNewPlan({ ...newPlan, user: e.target.value })}
            className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <input
            type="text"
            placeholder="Title"
            value={newPlan.title}
            onChange={(e) => setNewPlan({ ...newPlan, title: e.target.value })}
            className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <textarea
            placeholder="Description"
            value={newPlan.description}
            onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
            className="col-span-2 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <input
            type="text"
            placeholder="Landmarks (comma-separated)"
            value={newPlan.landmarks}
            onChange={(e) => setNewPlan({ ...newPlan, landmarks: e.target.value })}
            className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <input
            type="number"
            placeholder="Max People"
            value={newPlan.maxPeople}
            onChange={(e) => setNewPlan({ ...newPlan, maxPeople: e.target.value })}
            className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <div className="col-span-2 flex gap-4 items-center">
            <div>
              <label className="block text-gray-600 mb-1">Start Date</label>
              <DatePicker
                selected={newPlan.dateRange.start}
                onChange={(date) =>
                  setNewPlan({ ...newPlan, dateRange: { ...newPlan.dateRange, start: date } })
                }
                selectsStart
                startDate={newPlan.dateRange.start}
                endDate={newPlan.dateRange.end}
                className="border border-gray-300 rounded-lg px-4 py-2"
              />
            </div>
            <div>
              <label className="block text-gray-600 mb-1">End Date</label>
              <DatePicker
                selected={newPlan.dateRange.end}
                onChange={(date) =>
                  setNewPlan({ ...newPlan, dateRange: { ...newPlan.dateRange, end: date } })
                }
                selectsEnd
                startDate={newPlan.dateRange.start}
                endDate={newPlan.dateRange.end}
                className="border border-gray-300 rounded-lg px-4 py-2"
              />
            </div>
          </div>
          <button
            onClick={handleAddTravelPlan}
            className="col-span-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow transition-all"
          >
            Add Travel Plan
          </button>
        </div>
      </div>

      {/* Display Existing Travel Plans */}
      <div className="space-y-6">
        {travelPlans.map((plan) => (
          <div key={plan._id} className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-all">
            <h3 className="text-xl font-bold text-gray-700">{plan.title}</h3>
            <p className="text-gray-600 mt-2">{plan.description}</p>
            <p className="text-gray-700 mt-4">
              <span className="font-semibold">Landmarks:</span> {plan.landmarks.join(', ')}
            </p>
            <p className="text-gray-700 mt-2">
              <span className="font-semibold">People:</span> {plan.currentPeople}/{plan.maxPeople}
            </p>
            <div className="mt-4">
              <button
                onClick={() => handleSendInvite(plan.email, plan.title)} // Send invite
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow transition-all"
              >
                Send Request
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Connect;
