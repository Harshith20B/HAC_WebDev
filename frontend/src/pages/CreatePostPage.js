import { useState } from 'react';
import { Image, Film, MapPin, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CreatePostPage({ darkMode, toggleDarkMode }) {
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://hac-webdev-2.onrender.com/api';
  const navigate = useNavigate();

  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    mediaType: 'text',
    mediaUrl: '',
    location: '',
    landmark: ''
  });
  
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitPost = async () => {
    if (!localStorage.getItem('token')) {
      setError('Please log in to create a post');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Validate required fields
      if (!newPost.location) {
        setError('Location is required');
        return;
      }
      
      if (newPost.mediaType === 'text' && !newPost.content) {
        setError('Content is required for text posts');
        return;
      }
      
      if ((newPost.mediaType === 'image' || newPost.mediaType === 'video') && !newPost.mediaUrl) {
        setError('Media URL is required for image/video posts');
        return;
      }
      
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Authentication token not found. Please log in again.');
        return;
      }
      
      const response = await fetch(`${API_BASE_URL}/social/posts`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify(newPost)
      });
      
      if (!response.ok) {
        if (response.status === 403) {
          setError('Authentication failed. Please log in again.');
          localStorage.removeItem('token');
          return;
        }
        
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error ${response.status}`);
      }
      
      // Reset form and navigate back
      setNewPost({
        title: '',
        content: '',
        mediaType: 'text',
        mediaUrl: '',
        location: '',
        landmark: ''
      });
      setError(null);
      navigate('/');
    } catch (error) {
      console.error("Error creating post:", error);
      setError(error.message || "Failed to create post. Please ensure you are logged in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
      {/* Header */}
      <header className={`shadow ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Create New Post</h1>
          
          <div className="flex items-center space-x-4">
            {/* Dark mode toggle */}
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-full ${darkMode ? 'bg-gray-700 text-yellow-300' : 'bg-gray-200 text-gray-700'}`}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            
            {/* Close button */}
            <button 
              onClick={() => navigate('/')}
              className={`p-2 rounded-full ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Error display */}
      {error && (
        <div className="container mx-auto px-4 py-2">
          <div className={`border rounded px-4 py-3 ${
            darkMode ? 'bg-red-900 border-red-700 text-red-200' : 'bg-red-100 border-red-400 text-red-700'
          }`}>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Main form content */}
      <main className="container mx-auto px-4 py-6">
        <div className={`rounded-lg shadow overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="p-6">
            {/* Media type selection */}
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>Post Type</label>
              <div className="flex flex-wrap gap-2">
                <button 
                  type="button"
                  onClick={() => setNewPost({...newPost, mediaType: 'text'})}
                  className={`flex items-center px-3 py-2 rounded-md ${
                    newPost.mediaType === 'text' 
                      ? darkMode 
                        ? 'bg-blue-900 text-blue-200' 
                        : 'bg-blue-100 text-blue-600'
                      : darkMode 
                        ? 'bg-gray-700 text-gray-300' 
                        : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <span className="mr-1">Text</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setNewPost({...newPost, mediaType: 'image'})}
                  className={`flex items-center px-3 py-2 rounded-md ${
                    newPost.mediaType === 'image' 
                      ? darkMode 
                        ? 'bg-blue-900 text-blue-200' 
                        : 'bg-blue-100 text-blue-600'
                      : darkMode 
                        ? 'bg-gray-700 text-gray-300' 
                        : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <Image size={16} className="mr-1" />
                  <span>Image</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setNewPost({...newPost, mediaType: 'video'})}
                  className={`flex items-center px-3 py-2 rounded-md ${
                    newPost.mediaType === 'video' 
                      ? darkMode 
                        ? 'bg-blue-900 text-blue-200' 
                        : 'bg-blue-100 text-blue-600'
                      : darkMode 
                        ? 'bg-gray-700 text-gray-300' 
                        : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <Film size={16} className="mr-1" />
                  <span>Video</span>
                </button>
              </div>
            </div>
            
            {/* Title */}
            <div className="mb-4">
              <label 
                htmlFor="title" 
                className={`block text-sm font-medium mb-1 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                Title (optional)
              </label>
              <input
                type="text"
                id="title"
                placeholder="Add a title to your post"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'
                }`}
                value={newPost.title}
                onChange={(e) => setNewPost({...newPost, title: e.target.value})}
              />
            </div>
            
            {/* Content - conditional based on mediaType */}
            {newPost.mediaType === 'text' && (
              <div className="mb-4">
                <label 
                  htmlFor="content" 
                  className={`block text-sm font-medium mb-1 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}
                >
                  Content *
                </label>
                <textarea
                  id="content"
                  rows="5"
                  placeholder="Write your travel story here..."
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'
                  }`}
                  value={newPost.content}
                  onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                ></textarea>
              </div>
            )}
            
            {(newPost.mediaType === 'image' || newPost.mediaType === 'video') && (
              <div className="mb-4">
                <label 
                  htmlFor="mediaUrl" 
                  className={`block text-sm font-medium mb-1 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}
                >
                  Media URL *
                </label>
                <input
                  type="text"
                  id="mediaUrl"
                  placeholder={`Enter ${newPost.mediaType} URL`}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'
                  }`}
                  value={newPost.mediaUrl}
                  onChange={(e) => setNewPost({...newPost, mediaUrl: e.target.value})}
                />
                <p className={`mt-1 text-xs ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {newPost.mediaType === 'image' ? 'Paste a direct link to your image' : 'Paste a direct link to your video'}
                </p>
                
                {/* Optional caption for media posts */}
                <div className="mt-3">
                  <label 
                    htmlFor="caption" 
                    className={`block text-sm font-medium mb-1 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    Caption (optional)
                  </label>
                  <textarea
                    id="caption"
                    rows="3"
                    placeholder="Add a caption to your media..."
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'
                    }`}
                    value={newPost.content}
                    onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                  ></textarea>
                </div>
              </div>
            )}
            
            {/* Location */}
            <div className="mb-4">
              <label 
                htmlFor="location" 
                className={`block text-sm font-medium mb-1 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                Location *
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="location"
                  placeholder="e.g. Paris, France"
                  className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'
                  }`}
                  value={newPost.location}
                  onChange={(e) => setNewPost({...newPost, location: e.target.value})}
                />
                <MapPin className={`absolute left-3 top-2.5 h-5 w-5 ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`} />
              </div>
            </div>
            
            {/* Landmark */}
            <div className="mb-6">
              <label 
                htmlFor="landmark" 
                className={`block text-sm font-medium mb-1 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                Landmark (optional)
              </label>
              <input
                type="text"
                id="landmark"
                placeholder="e.g. Eiffel Tower"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'
                }`}
                value={newPost.landmark}
                onChange={(e) => setNewPost({...newPost, landmark: e.target.value})}
              />
            </div>
          </div>
          
          {/* Submit button */}
          <div className={`px-6 py-4 border-t ${
            darkMode ? 'border-gray-700' : 'border-gray-200'
          } flex justify-end`}>
            <button
              type="button"
              onClick={() => navigate('/')}
              className={`mr-2 px-4 py-2 border rounded-md ${
                darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmitPost}
              disabled={isSubmitting}
              className={`px-4 py-2 rounded-md text-white ${
                darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
              } ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isSubmitting ? 'Creating...' : 'Create Post'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}