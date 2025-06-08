import { useState } from 'react';
import { X, Plus, Image, Film, MapPin, Upload, FileImage, FileVideo } from 'lucide-react';

const PostForm = ({ onClose, onPostCreated, darkMode }) => {
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://hac-webdev-2.onrender.com/api';
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    mediaType: 'text',
    mediaFile: null,
    location: '',
    landmark: ''
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filePreview, setFilePreview] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type based on mediaType
      if (newPost.mediaType === 'image' && !file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }
      if (newPost.mediaType === 'video' && !file.type.startsWith('video/')) {
        setError('Please select a valid video file');
        return;
      }

      // Check file size (limit to 10MB for images, 50MB for videos)
      const maxSize = newPost.mediaType === 'image' ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
      if (file.size > maxSize) {
        setError(`File size too large. Maximum size is ${newPost.mediaType === 'image' ? '10MB' : '50MB'}`);
        return;
      }

      setNewPost({...newPost, mediaFile: file});
      setError('');

      // Create preview for images
      if (newPost.mediaType === 'image') {
        const reader = new FileReader();
        reader.onload = (e) => setFilePreview(e.target.result);
        reader.readAsDataURL(file);
      } else {
        setFilePreview(URL.createObjectURL(file));
      }
    }
  };

  const handleMediaTypeChange = (mediaType) => {
    setNewPost({...newPost, mediaType, mediaFile: null});
    setFilePreview(null);
    setError('');
  };

  const handleSubmitPost = async () => {
    if (!newPost.location) {
      setError('Location is required');
      return;
    }
    
    if (newPost.mediaType === 'text' && !newPost.content) {
      setError('Content is required for text posts');
      return;
    }
    
    if ((newPost.mediaType === 'image' || newPost.mediaType === 'video') && !newPost.mediaFile) {
      setError(`${newPost.mediaType === 'image' ? 'Image' : 'Video'} file is required`);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found. Please log in again.');
        return;
      }
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('title', newPost.title);
      formData.append('content', newPost.content);
      formData.append('mediaType', newPost.mediaType);
      formData.append('location', newPost.location);
      formData.append('landmark', newPost.landmark);
      
      if (newPost.mediaFile) {
        formData.append('mediaFile', newPost.mediaFile);
      }
      
      const response = await fetch(`${API_BASE_URL}/social/posts`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`
          // Don't set Content-Type header - let browser set it with boundary for FormData
        },
        credentials: 'include',
        body: formData
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
      
      setNewPost({
        title: '',
        content: '',
        mediaType: 'text',
        mediaFile: null,
        location: '',
        landmark: ''
      });
      setFilePreview(null);
      setError(null);
      onPostCreated();
    } catch (error) {
      console.error("Error creating post:", error);
      setError(error.message || "Failed to create post. Please ensure you are logged in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 ${
      darkMode ? 'dark' : ''
    }`}>
      <div className={`rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-screen flex flex-col ${
        darkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className={`flex justify-between items-center px-6 py-4 border-b sticky top-0 ${
          darkMode ? 'bg-gray-800 border-gray-700 rounded-t-lg' : 'bg-white rounded-t-lg'
        }`}>
          <h2 className={`text-xl font-semibold ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Create New Post
          </h2>
          <button 
            onClick={onClose}
            className={`${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-500'}`}
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          {/* Media type selection */}
          <div className="mb-4">
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Post Type
            </label>
            <div className="flex flex-wrap gap-2">
              <button 
                type="button"
                onClick={() => handleMediaTypeChange('text')}
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
                onClick={() => handleMediaTypeChange('image')}
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
                onClick={() => handleMediaTypeChange('video')}
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
            <label htmlFor="title" className={`block text-sm font-medium mb-1 ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Title (optional)
            </label>
            <input
              type="text"
              id="title"
              placeholder="Add a title to your post"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'border-gray-300'
              }`}
              value={newPost.title}
              onChange={(e) => setNewPost({...newPost, title: e.target.value})}
            />
          </div>
          
          {/* Content - conditional based on mediaType */}
          {newPost.mediaType === 'text' && (
            <div className="mb-4">
              <label htmlFor="content" className={`block text-sm font-medium mb-1 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Content *
              </label>
              <textarea
                id="content"
                rows="5"
                placeholder="Write your travel story here..."
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'border-gray-300'
                }`}
                value={newPost.content}
                onChange={(e) => setNewPost({...newPost, content: e.target.value})}
              ></textarea>
            </div>
          )}
          
          {/* File upload for image/video */}
          {(newPost.mediaType === 'image' || newPost.mediaType === 'video') && (
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-1 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {newPost.mediaType === 'image' ? 'Upload Image' : 'Upload Video'} *
              </label>
              
              {/* File input */}
              <div className={`border-2 border-dashed rounded-lg p-4 text-center ${
                darkMode 
                  ? 'border-gray-600 bg-gray-700' 
                  : 'border-gray-300 bg-gray-50'
              }`}>
                <input
                  type="file"
                  id="mediaFile"
                  accept={newPost.mediaType === 'image' ? 'image/*' : 'video/*'}
                  onChange={handleFileChange}
                  className="hidden"
                />
                
                {!newPost.mediaFile ? (
                  <label 
                    htmlFor="mediaFile" 
                    className={`cursor-pointer flex flex-col items-center ${
                      darkMode ? 'text-gray-300' : 'text-gray-600'
                    }`}
                  >
                    {newPost.mediaType === 'image' ? (
                      <FileImage size={40} className="mb-2" />
                    ) : (
                      <FileVideo size={40} className="mb-2" />
                    )}
                    <span className="font-medium">
                      Click to upload {newPost.mediaType}
                    </span>
                    <span className="text-sm">
                      {newPost.mediaType === 'image' 
                        ? 'PNG, JPG, GIF up to 10MB' 
                        : 'MP4, MOV, AVI up to 50MB'
                      }
                    </span>
                  </label>
                ) : (
                  <div className="space-y-2">
                    <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      Selected: {newPost.mediaFile.name}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setNewPost({...newPost, mediaFile: null});
                        setFilePreview(null);
                      }}
                      className={`text-red-500 hover:text-red-700 text-sm`}
                    >
                      Remove file
                    </button>
                  </div>
                )}
              </div>
              
              {/* File preview */}
              {filePreview && (
                <div className="mt-3">
                  {newPost.mediaType === 'image' ? (
                    <img 
                      src={filePreview} 
                      alt="Preview" 
                      className="max-w-full h-40 object-cover rounded-md"
                    />
                  ) : (
                    <video 
                      src={filePreview} 
                      controls 
                      className="max-w-full h-40 rounded-md"
                    >
                      Your browser does not support the video tag.
                    </video>
                  )}
                </div>
              )}
              
              {/* Optional caption for media posts */}
              <div className="mt-3">
                <label htmlFor="caption" className={`block text-sm font-medium mb-1 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Caption (optional)
                </label>
                <textarea
                  id="caption"
                  rows="3"
                  placeholder="Add a caption to your media..."
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'border-gray-300'
                  }`}
                  value={newPost.content}
                  onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                ></textarea>
              </div>
            </div>
          )}
          
          {/* Location */}
          <div className="mb-4">
            <label htmlFor="location" className={`block text-sm font-medium mb-1 ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Location *
            </label>
            <div className="relative">
              <input
                type="text"
                id="location"
                placeholder="e.g. Paris, France"
                className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'border-gray-300'
                }`}
                value={newPost.location}
                onChange={(e) => setNewPost({...newPost, location: e.target.value})}
              />
              <MapPin className={`absolute left-3 top-2.5 h-5 w-5 ${
                darkMode ? 'text-gray-400' : 'text-gray-400'
              }`} />
            </div>
          </div>
          
          {/* Landmark */}
          <div className="mb-6">
            <label htmlFor="landmark" className={`block text-sm font-medium mb-1 ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Landmark (optional)
            </label>
            <input
              type="text"
              id="landmark"
              placeholder="e.g. Eiffel Tower"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'border-gray-300'
              }`}
              value={newPost.landmark}
              onChange={(e) => setNewPost({...newPost, landmark: e.target.value})}
            />
          </div>
        </div>
        
        {/* Error display */}
        {error && (
          <div className={`px-6 py-2 ${
            darkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-700'
          }`}>
            <p>{error}</p>
          </div>
        )}
        
        {/* Submit button - sticky at the bottom */}
        <div className={`flex justify-end px-6 py-4 border-t sticky bottom-0 ${
          darkMode ? 'bg-gray-800 border-gray-700 rounded-b-lg' : 'bg-white rounded-b-lg'
        }`}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className={`mr-2 px-4 py-2 border rounded-md ${
              darkMode 
                ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmitPost}
            disabled={isSubmitting}
            className={`px-4 py-2 rounded-md ${
              darkMode 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isSubmitting ? 'Creating...' : 'Create Post'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PostForm;