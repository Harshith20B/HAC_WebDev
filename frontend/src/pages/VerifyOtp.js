import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const VerifyOtp = () => {
  const navigate = useNavigate();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle OTP input change
  const handleChange = (e) => {
    setOtp(e.target.value);
  };

  // Handle OTP form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');  // Reset error message

    try {
      // Get the email from localStorage (from Signup)
      const email = localStorage.getItem('email');

      // Send OTP to backend for verification
      const response = await axios.post('http://localhost:5000/api/auth/verify-otp', { otp, email });

      //alert(response.data.message);  // Display success message
      navigate('/login');  // Redirect to login page after successful OTP verification
    } catch (error) {
      setError(error.response?.data?.message || 'Something went wrong.');
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-lg shadow-md w-full max-w-md space-y-4"
      >
        <h2 className="text-2xl font-semibold text-center text-blue-600">Enter OTP to Verify</h2>
        
        {/* Display OTP input */}
        <input
          type="text"
          value={otp}
          onChange={handleChange}
          placeholder="Enter OTP"
          className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
          required
        />
        
        {/* Display error message */}
        {error && <p className="text-red-500 text-sm">{error}</p>}

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition duration-300"
          disabled={loading}
        >
          {loading ? 'Verifying OTP...' : 'Verify OTP'}
        </button>
      </form>
    </div>
  );
};

export default VerifyOtp;
