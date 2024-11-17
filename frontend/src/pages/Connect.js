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
    email: '',
  });
  const [groupSize, setGroupSize] = useState(1);
  const [currentUserEmail, setCurrentUserEmail] = useState('');

  const fetchTravelPlans = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/travelplans');
      setTravelPlans(response.data);
    } catch (error) {
      console.error('Error fetching travel plans:', error);
    }
  };

  const handleAddTravelPlan = async () => {
    try {
      await axios.post('http://localhost:5000/api/travelplans', {
        ...newPlan,
        landmarks: newPlan.landmarks.split(','), // Split landmarks into an array
        dateRange: {
          start: newPlan.dateRange.start,
          end: newPlan.dateRange.end,
        },
        email: currentUserEmail, // Automatically associate with logged-in user
      });
  
      fetchTravelPlans(); // Refresh plans
      setNewPlan({
        user: '',
        title: '',
        description: '',
        landmarks: '',
        maxPeople: '',
        dateRange: { start: null, end: null },
        email: '',
      });
    } catch (error) {
      console.error('Error adding travel plan:', error);
    }
  };

  const handleSendInvite = (recipientEmail, planTitle) => {
    const subject = encodeURIComponent(`Join my travel plan: ${planTitle}`);
    const body = encodeURIComponent(`Hi there,\n\nI would like to join your travel plan titled "${planTitle}".\n\nPlease let me know if there's room for me!\n\nBest regards,`);
    const outlookLink = `https://outlook.live.com/owa/?path=/mail/action/compose&to=${recipientEmail}&subject=${subject}&body=${body}`;
    window.open(outlookLink, '_blank'); // Open Outlook compose window
  };
  

  useEffect(() => {
    setCurrentUserEmail('user@example.com');
    fetchTravelPlans();
  }, []);
  useEffect(() => {
    // Replace with actual logic to fetch user session
    const fetchCurrentUser = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/user'); // Example endpoint
        setCurrentUserEmail(response.data.email);
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };
  
    fetchCurrentUser();
    fetchTravelPlans();
  }, []);
  
  return (
    <div className="max-w-5xl mx-auto p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-800 dark:to-gray-900 min-h-screen">
      <h1 className="text-4xl font-extrabold text-gray-800 dark:text-white mb-6 text-center">
        Travel Plans
      </h1>

      <div className="mb-10 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <h2 className="text-2xl font-semibold text-gray-700 dark:text-white mb-4">
          Add Travel Plan
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Your Name"
            value={newPlan.user}
            onChange={(e) => setNewPlan({ ...newPlan, user: e.target.value })}
            className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <input
            type="text"
            placeholder="Title"
            value={newPlan.title}
            onChange={(e) => setNewPlan({ ...newPlan, title: e.target.value })}
            className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <textarea
            placeholder="Description"
            value={newPlan.description}
            onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
            className="col-span-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <input
            type="text"
            placeholder="Landmarks (comma-separated)"
            value={newPlan.landmarks}
            onChange={(e) => setNewPlan({ ...newPlan, landmarks: e.target.value })}
            className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <input
            type="number"
            placeholder="Max People"
            value={newPlan.maxPeople}
            onChange={(e) => setNewPlan({ ...newPlan, maxPeople: e.target.value })}
            className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <div className="col-span-2 flex gap-4 items-center">
            <div>
              <label className="block text-gray-600 dark:text-gray-300 mb-1">Start Date</label>
              <DatePicker
                selected={newPlan.dateRange.start}
                onChange={(date) =>
                  setNewPlan({ ...newPlan, dateRange: { ...newPlan.dateRange, start: date } })
                }
                selectsStart
                startDate={newPlan.dateRange.start}
                endDate={newPlan.dateRange.end}
                className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2"
              />
            </div>
            <div>
              <label className="block text-gray-600 dark:text-gray-300 mb-1">End Date</label>
              <DatePicker
                selected={newPlan.dateRange.end}
                onChange={(date) =>
                  setNewPlan({ ...newPlan, dateRange: { ...newPlan.dateRange, end: date } })
                }
                selectsEnd
                startDate={newPlan.dateRange.start}
                endDate={newPlan.dateRange.end}
                className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-4 py-2"
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

      <div className="space-y-6">
      {travelPlans.map((plan) => (
        <div key={plan._id} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg hover:shadow-xl transition-all">
          <h3 className="text-xl font-bold text-gray-700 dark:text-white">{plan.title}</h3>
          <p className="text-gray-600 dark:text-gray-300 mt-2">{plan.description}</p>
          <p className="text-gray-700 dark:text-gray-300 mt-4">
            <span className="font-semibold">Landmarks:</span> {plan.landmarks.join(', ')}
          </p>
          <p className="text-gray-700 dark:text-gray-300 mt-2">
            <span className="font-semibold">People:</span> {plan.currentPeople}/{plan.maxPeople}
          </p>
          <p className="text-gray-700 dark:text-gray-300 mt-2">
            <span className="font-semibold">Created By:</span> {plan.email}
          </p>
          <div className="mt-4">
            <button
              onClick={() => handleSendInvite(plan.email, plan.title)}
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