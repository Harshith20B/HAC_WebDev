import { useState, useEffect } from 'react';
import { MessageCircle, Heart, Send, Search, Plus, MapPin } from 'lucide-react';
import PostForm from './PostForm';

export default function PostsPage({ darkMode, setDarkMode }) {
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  // State for posts data
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [newComment, setNewComment] = useState({});
  const [expandedComments, setExpandedComments] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('recent');
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

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/social/posts?page=${page}&limit=5&sort=${sortOption}`, {
        credentials: 'include'
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
        if (
          (isLiked && errorData.message === 'You have not liked this post') ||
          (!isLiked && errorData.message === 'You have already liked this post')
        ) {
          setPosts(posts.map(post => {
            if (post._id === postId) {
              const newLikesCount = isLiked ? (post.likesCount - 1) : (post.likesCount + 1);
              return {
                ...post,
                likesCount: newLikesCount >= 0 ? newLikesCount : 0,
                isLiked: !isLiked
              };
            }
            return post;
          }));
          return;
        }
        throw new Error(errorData.message || `HTTP error ${response.status}`);
      }
      
      const data = await response.json();
      setPosts(posts.map(post => {
        if (post._id === postId) {
          return {
            ...post,
            likesCount: data.likesCount,
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

  const toggleComments = (postId) => {
    setExpandedComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

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
      const currentUser = JSON.parse(localStorage.getItem('user')) || {};
      const newCommentObj = {
        _id: data.post.comments[data.post.comments.length - 1]._id,
        text: newComment[postId],
        createdAt: new Date().toISOString(),
        user: {
          _id: currentUser.id || 'unknown',
          name: currentUser.name || 'You',
          profilePicture: currentUser.profilePicture || null
        }
      };
      
      setPosts(posts.map(post => {
        if (post._id === postId) {
          return {
            ...post,
            comments: [...(post.comments || []), newCommentObj],
            commentsCount: (post.commentsCount || 0) + 1
          };
        }
        return post;
      }));
      
      setNewComment({...newComment, [postId]: ''});
      setError(null);
    } catch (error) {
      console.error("Error adding comment:", error);
      setError(error.message || "Failed to add comment. Please try again.");
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

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
    <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className={`shadow ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center">
          <h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'} mb-2 md:mb-0`}>
            Travel Stories
          </h1>
          
          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md mx-4 mb-2 md:mb-0 w-full">
            <div className="relative">
              <input
                type="text"
                placeholder="Search locations, landmarks, or posts..."
                className={`w-full pl-10 pr-4 py-2 border rounded-full focus:outline-none focus:ring-2 ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white focus:ring-blue-500' 
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className={`absolute left-3 top-2.5 h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} />
              <button 
                type="submit" 
                className={`absolute right-3 top-2 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`}
              >
                Search
              </button>
            </div>
          </form>
          
          {/* Add post button */}
          <button 
            onClick={() => {
              if (checkAuthStatus()) {
                setShowNewPostModal(true);
              }
            }}
            className={`flex items-center px-4 py-2 rounded-full transition-all duration-300 ${
              darkMode 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            <Plus size={16} className="mr-1" /> Add Post
          </button>
        </div>
      </header>

      {/* Authentication status message */}
      {!isAuthenticated && (
        <div className="container mx-auto px-4 py-2">
          <div className={`border rounded px-4 py-3 ${
            darkMode 
              ? 'bg-yellow-900 border-yellow-700 text-yellow-200' 
              : 'bg-yellow-100 border-yellow-400 text-yellow-700'
          }`}>
            <p>You are not logged in. Some features may be limited. Please log in to create posts, like, and comment.</p>
          </div>
        </div>
      )}

      {/* Sort options */}
      <div className={`container mx-auto px-4 py-3 flex items-center ${
        darkMode ? 'text-gray-300' : 'text-gray-700'
      }`}>
        <div className="font-medium mr-2">Sort by:</div>
        <select 
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
          className={`border rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            darkMode 
              ? 'bg-gray-700 border-gray-600 text-white' 
              : 'bg-white border-gray-300'
          }`}
        >
          <option value="recent">Most Recent</option>
          <option value="popular">Most Popular</option>
        </select>
      </div>

      {/* Error display */}
      {error && (
        <div className="container mx-auto px-4 py-2">
          <div className={`border rounded px-4 py-3 ${
            darkMode 
              ? 'bg-red-900 border-red-700 text-red-200' 
              : 'bg-red-100 border-red-400 text-red-700'
          }`}>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className={`animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 ${
              darkMode ? 'border-blue-400' : 'border-blue-500'
            }`}></div>
          </div>
        ) : posts.length === 0 ? (
          <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <p className="text-lg">No posts found.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <div 
                key={post._id} 
                className={`rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden ${
                  darkMode ? 'bg-gray-800' : 'bg-white'
                }`}
              >
                {/* Post header */}
                <div className="px-6 py-4 flex items-center">
                  <div className="h-10 w-10 rounded-full flex-shrink-0">
                    {post.user?.profilePicture ? (
                      <img 
                        src={post.user.profilePicture} 
                        alt={post.user.name} 
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold ${
                        darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                      }`}>
                        {post.user?.name?.charAt(0) || 'U'}
                      </div>
                    )}
                  </div>
                  <div className="ml-3">
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      {post.user?.name || 'Anonymous'}
                    </p>
                    <p className={`text-xs flex items-center ${
                      darkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {formatDate(post.createdAt)}
                      {post.location && (
                        <span className="flex items-center ml-2">
                          <MapPin size={12} className={`mr-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                          {post.location}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Post content */}
                <div className="px-6 py-2">
                  {post.title && (
                    <h2 className={`text-xl font-semibold mb-2 ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {post.title}
                    </h2>
                  )}
                  
                  {post.mediaType === 'text' && post.content && (
                    <p className={`whitespace-pre-line ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {post.content}
                    </p>
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
                    <div className={`mt-3 text-sm flex items-center ${
                      darkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      <span className="font-medium">Landmark:</span>
                      <span className="ml-1">{post.landmark}</span>
                    </div>
                  )}
                </div>

                {/* Post actions */}
                <div className={`px-6 py-4 flex items-center justify-between border-t ${
                  darkMode ? 'border-gray-700' : 'border-gray-100'
                }`}>
                  <div className="flex">
                    <button 
                      onClick={() => handleLike(post._id, post.isLiked)}
                      className={`flex items-center mr-6 transition-colors duration-300 ${
                        post.isLiked 
                          ? 'text-red-500' 
                          : darkMode 
                            ? 'text-gray-400 hover:text-red-500' 
                            : 'text-gray-500 hover:text-red-500'
                      }`}
                    >
                      <Heart 
                        size={18} 
                        className={post.isLiked ? 'fill-red-500' : ''} 
                      />
                      <span className="ml-1 text-sm">{post.likesCount ?? post.likes?.length ?? 0}</span>
                    </button>
                    
                    <button 
                      onClick={() => toggleComments(post._id)}
                      className={`flex items-center transition-colors duration-300 ${
                        darkMode 
                          ? 'text-gray-400 hover:text-blue-400' 
                          : 'text-gray-500 hover:text-blue-500'
                      }`}
                    >
                      <MessageCircle size={18} />
                      <span className="ml-1 text-sm">{post.commentsCount || 0}</span>
                    </button>
                  </div>
                </div>

                {/* Comments section */}
                {expandedComments[post._id] && (
                  <div className={`px-6 py-3 border-t ${
                    darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-100'
                  }`}>
                    {/* Comment list */}
                    <div className="mb-4 max-h-64 overflow-y-auto">
                      {post.comments && post.comments.length > 0 ? (
                        post.comments.map((comment) => (
                          <div key={comment._id} className="py-2 flex">
                            <div className="h-8 w-8 rounded-full flex-shrink-0">
                              {comment.user?.profilePicture ? (
                                <img 
                                  src={comment.user.profilePicture} 
                                  alt={comment.user.name} 
                                  className="h-8 w-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                  darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                                }`}>
                                  {comment.user?.name?.charAt(0) || 'U'}
                                </div>
                              )}
                            </div>
                            <div className={`ml-2 p-2 rounded-lg flex-1 ${
                              darkMode ? 'bg-gray-600' : 'bg-white'
                            }`}>
                              <p className={`text-xs font-medium ${
                                darkMode ? 'text-gray-200' : 'text-gray-800'
                              }`}>
                                {comment.user?.name || 'Anonymous'}
                              </p>
                              <p className={`text-sm ${
                                darkMode ? 'text-gray-300' : 'text-gray-700'
                              }`}>
                                {comment.text}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className={`text-center text-sm py-2 ${
                          darkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          No comments yet
                        </p>
                      )}
                    </div>
                    
                    {/* Add comment form */}
                    <div className="flex items-center">
                      <input
                        type="text"
                        placeholder="Add a comment..."
                        className={`flex-1 border rounded-full px-4 py-2 focus:outline-none focus:ring-2 ${
                          darkMode 
                            ? 'bg-gray-600 border-gray-500 text-white focus:ring-blue-500' 
                            : 'border-gray-300 focus:ring-blue-500'
                        }`}
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
                        className={`ml-2 rounded-full p-2 transition-colors duration-300 ${
                          darkMode 
                            ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                            : 'bg-blue-500 hover:bg-blue-600 text-white'
                        }`}
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
                className={`px-4 py-2 border rounded-l-md transition-colors duration-300 ${
                  page === 1 
                    ? darkMode 
                      ? 'text-gray-500 bg-gray-700 border-gray-600' 
                      : 'text-gray-400 bg-gray-100' 
                    : darkMode 
                      ? 'text-blue-400 hover:bg-gray-700 border-gray-600' 
                      : 'text-blue-500 hover:bg-blue-50'
                }`}
              >
                Previous
              </button>
              <div className={`px-4 py-2 border-t border-b ${
                darkMode 
                  ? 'border-gray-600 text-gray-300' 
                  : 'border-gray-300 text-gray-700'
              }`}>
                Page {page} of {totalPages}
              </div>
              <button 
                onClick={() => setPage(p => p < totalPages ? p + 1 : p)}
                disabled={page === totalPages}
                className={`px-4 py-2 border rounded-r-md transition-colors duration-300 ${
                  page === totalPages 
                    ? darkMode 
                      ? 'text-gray-500 bg-gray-700 border-gray-600' 
                      : 'text-gray-400 bg-gray-100' 
                    : darkMode 
                      ? 'text-blue-400 hover:bg-gray-700 border-gray-600' 
                      : 'text-blue-500 hover:bg-blue-50'
                }`}
              >
                Next
              </button>
            </nav>
          </div>
        )}
      </main>

      {/* New post modal */}
      {showNewPostModal && (
        <PostForm 
          onClose={() => setShowNewPostModal(false)}
          onPostCreated={() => {
            setShowNewPostModal(false);
            fetchPosts();
          }}
          darkMode={darkMode}
        />
      )}
    </div>
  );
}