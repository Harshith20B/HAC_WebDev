import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://hac-webdev-2.onrender.com/api';
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleOtpChange = (e) => {
    setOtp(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/signup`, formData);
      localStorage.setItem('email', formData.email);
      setOtpSent(true);
      navigate('/verify-otp');
    } catch (error) {
      alert(error.response.data.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const email = localStorage.getItem('email');
      const response = await axios.post(`${API_BASE_URL}/auth/verify-otp`, { otp, email });
      navigate('/login');
    } catch (error) {
      alert(error.response?.data?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen dark:bg-darkBackground bg-lightBackground">
      <form
        onSubmit={otpSent ? handleOtpSubmit : handleSubmit}
        className="dark:bg-gray-800 bg-white p-6 rounded-lg shadow-lg w-full max-w-md space-y-6"
      >
        <h2 className="text-2xl font-semibold text-center dark:text-blue-400 text-blue-600">
          {otpSent ? 'Enter OTP' : 'Create an Account'}
        </h2>

        {!otpSent ? (
          <>
            <input
              type="text"
              name="name"
              placeholder="Name"
              onChange={handleChange}
              className="w-full p-3 border dark:border-gray-600 border-gray-300 rounded-lg 
                       dark:bg-gray-700 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="email"
              name="email"
              placeholder="Email"
              onChange={handleChange}
              className="w-full p-3 border dark:border-gray-600 border-gray-300 rounded-lg 
                       dark:bg-gray-700 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              onChange={handleChange}
              className="w-full p-3 border dark:border-gray-600 border-gray-300 rounded-lg 
                       dark:bg-gray-700 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button
              type="submit"
              className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 
                       dark:bg-blue-500 dark:hover:bg-blue-600
                       transition duration-300"
              disabled={loading}
            >
              {loading ? 'Signing Up...' : 'Sign Up'}
            </button>
          </>
        ) : (
          <>
            <input
              type="text"
              value={otp}
              onChange={handleOtpChange}
              placeholder="Enter OTP"
              className="w-full p-3 border dark:border-gray-600 border-gray-300 rounded-lg 
                       dark:bg-gray-700 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button
              type="submit"
              className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 
                       dark:bg-blue-500 dark:hover:bg-blue-600
                       transition duration-300"
              disabled={loading}
            >
              {loading ? 'Verifying OTP...' : 'Verify OTP'}
            </button>
          </>
        )}
      </form>
    </div>
  );
};

export default Signup;