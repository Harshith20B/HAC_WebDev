import { useState, useEffect } from 'react';
import { MessageCircle, Heart, Send, Image, MapPin, Film, Plus, X, ChevronDown, Search } from 'lucide-react';

export default function PostsPage() {
  // API base URL from environment variable with fallback
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://hac-webdev-2.onrender.com/api';

  // State for posts data
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // State for creating a new post
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    mediaType: 'text',
    mediaUrl: '',
    location: '',
    landmark: ''
  });
  
  // State for comments
  const [newComment, setNewComment] = useState({});
  const [expandedComments, setExpandedComments] = useState({});
  
  // State for search
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('recent');
  
  // State for errors
  const [error, setError] = useState(null);

  // Check authentication on component mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
  }, []);

  // Fetch posts on component mount and when page or sort changes
  useEffect(() => {
    fetchPosts();
  }, [page, sortOption]);

  // Fetch all posts
  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/social/posts?page=${page}&limit=5&sort=${sortOption}`, {
        credentials: 'include' // Include cookies for CORS
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      const data = await response.json();
      setPosts(data.posts);
      setTotalPages(data.totalPages);
      setError(null);
    } catch (error) {
      console.error("Error fetching posts:", error);
      setError("Failed to load posts. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle search submit
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/social/search?query=${encodeURIComponent(searchQuery)}&sort=${sortOption}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      const data = await response.json();
      setPosts(data.posts);
      setTotalPages(data.totalPages);
      setPage(1);
      setError(null);
    } catch (error) {
      console.error("Error searching posts:", error);
      setError("Failed to search posts. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle like/unlike
  const handleLike = async (postId, isLiked) => {
    if (!isAuthenticated) {
      setError('Please log in to like posts');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const endpoint = isLiked 
        ? `${API_BASE_URL}/social/posts/${postId}/unlike` 
        : `${API_BASE_URL}/social/posts/${postId}/like`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error ${response.status}`);
      }
      
      // Update posts state to reflect the like/unlike action
      setPosts(posts.map(post => {
        if (post._id === postId) {
          return {
            ...post,
            likesCount: isLiked ? post.likesCount - 1 : post.likesCount + 1,
            isLiked: !isLiked
          };
        }
        return post;
      }));
      
      setError(null);
    } catch (error) {
      console.error("Error liking/unliking post:", error);
      setError(error.message || "Error processing like/unlike. Please try again.");
    }
  };

  // Toggle comments visibility
  const toggleComments = (postId) => {
    setExpandedComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  // Handle comment submission
  const handleAddComment = async (postId) => {
    if (!isAuthenticated) {
      setError('Please log in to comment');
      return;
    }

    if (!newComment[postId]?.trim()) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/social/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        body: JSON.stringify({ text: newComment[postId] })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error ${response.status}`);
      }
      
      const data = await response.json();
      
      // Update posts state to include the new comment
      setPosts(posts.map(post => {
        if (post._id === postId) {
          return {
            ...post,
            comments: [...(post.comments || []), data.comment],
            commentsCount: post.commentsCount + 1
          };
        }
        return post;
      }));
      
      // Clear the comment input field
      setNewComment({...newComment, [postId]: ''});
      setError(null);
    } catch (error) {
      console.error("Error adding comment:", error);
      setError(error.message || "Failed to add comment. Please try again.");
    }
  };

  // Submit new post - FIXED VERSION
  const handleSubmitPost = async () => {
    if (!isAuthenticated) {
      setError('Please log in to create a post');
      return;
    }

    try {
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
      
      // Make sure the token is available
      if (!token) {
        setError('Authentication token not found. Please log in again.');
        return;
      }
      
      console.log('Sending post with token:', token);
      
      const response = await fetch(`${API_BASE_URL}/social/posts`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`  // Make sure this header is included
        },
        credentials: 'include',
        body: JSON.stringify(newPost)
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        if (response.status === 403) {
          setError('Authentication failed. Please log in again.');
          localStorage.removeItem('token'); // Clear invalid token
          setIsAuthenticated(false);
          return;
        }
        
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error ${response.status}`);
      }
      
      // Reset form and close modal
      setNewPost({
        title: '',
        content: '',
        mediaType: 'text',
        mediaUrl: '',
        location: '',
        landmark: ''
      });
      setShowNewPostModal(false);
      setError(null);
      
      // Refresh posts to show the new one
      fetchPosts();
    } catch (error) {
      console.error("Error creating post:", error);
      setError(error.message || "Failed to create post. Please ensure you are logged in.");
    }
  };

  // Function to format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Check login status
  const checkAuthStatus = () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      setError('You need to log in first. Please sign in to continue.');
      setIsAuthenticated(false);
      return false;
    }
    
    return true;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800 mb-2 md:mb-0">Travel Stories</h1>
          
          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md mx-4 mb-2 md:mb-0 w-full">
            <div className="relative">
              <input
                type="text"
                placeholder="Search locations, landmarks, or posts..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <button type="submit" className="absolute right-3 top-2 text-blue-500">
                Search
              </button>
            </div>
          </form>
          
          {/* Add new post button - only show if authenticated */}
          <button 
            onClick={() => {
              if (checkAuthStatus()) {
                setShowNewPostModal(true);
              }
            }}
            className="flex items-center bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-full transition"
          >
            <Plus size={16} className="mr-1" /> Add Post
          </button>
        </div>
      </header>

      {/* Authentication status message */}
      {!isAuthenticated && (
        <div className="container mx-auto px-4 py-2">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
            <p>You are not logged in. Some features may be limited. Please log in to create posts, like, and comment.</p>
          </div>
        </div>
      )}

      {/* Sort options */}
      <div className="container mx-auto px-4 py-3 flex items-center">
        <div className="font-medium text-gray-700 mr-2">Sort by:</div>
        <select 
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
          className="bg-white border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="recent">Most Recent</option>
          <option value="popular">Most Popular</option>
        </select>
      </div>

      {/* Error display */}
      {error && (
        <div className="container mx-auto px-4 py-2">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No posts found.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <div key={post._id} className="bg-white rounded-lg shadow overflow-hidden">
                {/* Post header */}
                <div className="px-6 py-4 flex items-center">
                  <div className="h-10 w-10 rounded-full bg-gray-300 flex-shrink-0">
                    {post.user?.profilePicture ? (
                      <img 
                        src={post.user.profilePicture} 
                        alt={post.user.name} 
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                        {post.user?.name?.charAt(0) || 'U'}
                      </div>
                    )}
                  </div>
                  <div className="ml-3">
                    <p className="font-medium text-gray-800">{post.user?.name || 'Anonymous'}</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(post.createdAt)}
                      {post.location && (
                        <span className="flex items-center ml-2">
                          <MapPin size={12} className="mr-1 text-gray-400" />
                          {post.location}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Post content */}
                <div className="px-6 py-2">
                  {post.title && <h2 className="text-xl font-semibold mb-2">{post.title}</h2>}
                  
                  {post.mediaType === 'text' && post.content && (
                    <p className="text-gray-700 whitespace-pre-line">{post.content}</p>
                  )}
                  
                  {post.mediaType === 'image' && post.mediaUrl && (
                    <div className="mt-3 rounded-lg overflow-hidden">
                      <img 
                        src={post.mediaUrl} 
                        alt={post.title || 'Post image'} 
                        className="w-full h-auto max-h-96 object-cover"
                      />
                    </div>
                  )}
                  
                  {post.mediaType === 'video' && post.mediaUrl && (
                    <div className="mt-3 rounded-lg overflow-hidden">
                      <video 
                        src={post.mediaUrl} 
                        controls 
                        className="w-full h-auto max-h-96"
                      />
                    </div>
                  )}
                  
                  {post.landmark && (
                    <div className="mt-3 text-sm text-gray-500 flex items-center">
                      <span className="font-medium">Landmark:</span>
                      <span className="ml-1">{post.landmark}</span>
                    </div>
                  )}
                </div>

                {/* Post actions */}
                <div className="px-6 py-4 flex items-center justify-between border-t border-gray-100">
                  <div className="flex">
                    <button 
                      onClick={() => handleLike(post._id, post.isLiked)}
                      className={`flex items-center mr-6 ${post.isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}
                    >
                      <Heart 
                        size={18} 
                        className={post.isLiked ? 'fill-red-500' : ''} 
                      />
                      <span className="ml-1 text-sm">{post.likesCount || 0}</span>
                    </button>
                    
                    <button 
                      onClick={() => toggleComments(post._id)}
                      className="flex items-center text-gray-500 hover:text-blue-500"
                    >
                      <MessageCircle size={18} />
                      <span className="ml-1 text-sm">{post.commentsCount || 0}</span>
                    </button>
                  </div>
                </div>

                {/* Comments section */}
                {expandedComments[post._id] && (
                  <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                    {/* Comment list */}
                    <div className="mb-4 max-h-64 overflow-y-auto">
                      {post.comments && post.comments.length > 0 ? (
                        post.comments.map((comment) => (
                          <div key={comment._id} className="py-2 flex">
                            <div className="h-8 w-8 rounded-full bg-gray-300 flex-shrink-0">
                              {comment.user?.profilePicture ? (
                                <img 
                                  src={comment.user.profilePicture} 
                                  alt={comment.user.name} 
                                  className="h-8 w-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                                  {comment.user?.name?.charAt(0) || 'U'}
                                </div>
                              )}
                            </div>
                            <div className="ml-2 bg-white p-2 rounded-lg flex-1">
                              <p className="text-xs font-medium text-gray-800">{comment.user?.name || 'Anonymous'}</p>
                              <p className="text-sm text-gray-700">{comment.text}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-sm text-gray-500 py-2">No comments yet</p>
                      )}
                    </div>
                    
                    {/* Add comment form */}
                    <div className="flex items-center">
                      <input
                        type="text"
                        placeholder="Add a comment..."
                        className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={newComment[post._id] || ''}
                        onChange={(e) => setNewComment({...newComment, [post._id]: e.target.value})}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleAddComment(post._id);
                          }
                        }}
                      />
                      <button 
                        onClick={() => handleAddComment(post._id)}
                        className="ml-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-2"
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-8">
            <nav className="flex items-center">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className={`px-4 py-2 border rounded-l-md ${page === 1 ? 'text-gray-400 bg-gray-100' : 'text-blue-500 hover:bg-blue-50'}`}
              >
                Previous
              </button>
              <div className="px-4 py-2 border-t border-b">
                Page {page} of {totalPages}
              </div>
              <button 
                onClick={() => setPage(p => p < totalPages ? p + 1 : p)}
                disabled={page === totalPages}
                className={`px-4 py-2 border rounded-r-md ${page === totalPages ? 'text-gray-400 bg-gray-100' : 'text-blue-500 hover:bg-blue-50'}`}
              >
                Next
              </button>
            </nav>
          </div>
        )}
      </main>

      {/* New post modal - with scrollable content */}
      {showNewPostModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-screen flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b sticky top-0 bg-white rounded-t-lg">
              <h2 className="text-xl font-semibold">Create New Post</h2>
              <button 
                onClick={() => setShowNewPostModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {/* Media type selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Post Type</label>
                <div className="flex flex-wrap gap-2">
                  <button 
                    type="button"
                    onClick={() => setNewPost({...newPost, mediaType: 'text'})}
                    className={`flex items-center px-3 py-2 rounded-md ${newPost.mediaType === 'text' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
                  >
                    <span className="mr-1">Text</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setNewPost({...newPost, mediaType: 'image'})}
                    className={`flex items-center px-3 py-2 rounded-md ${newPost.mediaType === 'image' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
                  >
                    <Image size={16} className="mr-1" />
                    <span>Image</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setNewPost({...newPost, mediaType: 'video'})}
                    className={`flex items-center px-3 py-2 rounded-md ${newPost.mediaType === 'video' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
                  >
                    <Film size={16} className="mr-1" />
                    <span>Video</span>
                  </button>
                </div>
              </div>
              
              {/* Title */}
              <div className="mb-4">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Title (optional)
                </label>
                <input
                  type="text"
                  id="title"
                  placeholder="Add a title to your post"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newPost.title}
                  onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                />
              </div>
              
              {/* Content - conditional based on mediaType */}
              {newPost.mediaType === 'text' && (
                <div className="mb-4">
                  <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                    Content *
                  </label>
                  <textarea
                    id="content"
                    rows="5"
                    placeholder="Write your travel story here..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newPost.content}
                    onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                  ></textarea>
                </div>
              )}
              
              {(newPost.mediaType === 'image' || newPost.mediaType === 'video') && (
                <div className="mb-4">
                  <label htmlFor="mediaUrl" className="block text-sm font-medium text-gray-700 mb-1">
                    Media URL *
                  </label>
                  <input
                    type="text"
                    id="mediaUrl"
                    placeholder={`Enter ${newPost.mediaType} URL`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newPost.mediaUrl}
                    onChange={(e) => setNewPost({...newPost, mediaUrl: e.target.value})}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {newPost.mediaType === 'image' ? 'Paste a direct link to your image' : 'Paste a direct link to your video'}
                  </p>
                  
                  {/* Optional caption for media posts */}
                  <div className="mt-3">
                    <label htmlFor="caption" className="block text-sm font-medium text-gray-700 mb-1">
                      Caption (optional)
                    </label>
                    <textarea
                      id="caption"
                      rows="3"
                      placeholder="Add a caption to your media..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={newPost.content}
                      onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                    ></textarea>
                  </div>
                </div>
              )}
              
              {/* Location */}
              <div className="mb-4">
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                  Location *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="location"
                    placeholder="e.g. Paris, France"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newPost.location}
                    onChange={(e) => setNewPost({...newPost, location: e.target.value})}
                  />
                  <MapPin className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
              </div>
              
              {/* Landmark */}
              <div className="mb-6">
                <label htmlFor="landmark" className="block text-sm font-medium text-gray-700 mb-1">
                  Landmark (optional)
                </label>
                <input
                  type="text"
                  id="landmark"
                  placeholder="e.g. Eiffel Tower"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newPost.landmark}
                  onChange={(e) => setNewPost({...newPost, landmark: e.target.value})}
                />
              </div>
            </div>
            
            {/* Submit button - sticky at the bottom */}
            <div className="flex justify-end px-6 py-4 border-t sticky bottom-0 bg-white rounded-b-lg">
              <button
                type="button"
                onClick={() => setShowNewPostModal(false)}
                className="mr-2 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitPost}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md"
              >
                Create Post
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}