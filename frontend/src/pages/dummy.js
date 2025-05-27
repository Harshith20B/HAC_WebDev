// import { useState, useEffect } from 'react';
// import { MessageCircle, Heart, Send, Image, MapPin, Film, Plus, X, ChevronDown, Search } from 'lucide-react';

// export default function PostsPage() {
//   // API base URL from environment variable with fallback
//   const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  
//   // State for posts data
//   const [posts, setPosts] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [page, setPage] = useState(1);
//   const [totalPages, setTotalPages] = useState(1);
//   const [isAuthenticated, setIsAuthenticated] = useState(false);
  
//   // State for creating a new post
//   const [showNewPostModal, setShowNewPostModal] = useState(false);
//   const [newPost, setNewPost] = useState({
//     title: '',
//     content: '',
//     mediaType: 'text',
//     mediaUrl: '',
//     location: '',
//     landmark: ''
//   });
  
//   // State for comments
//   const [newComment, setNewComment] = useState({});
//   const [expandedComments, setExpandedComments] = useState({});
  
//   // State for search
//   const [searchQuery, setSearchQuery] = useState('');
//   const [sortOption, setSortOption] = useState('recent');
  
//   // State for errors
//   const [error, setError] = useState(null);

//   // Check authentication on component mount
//   useEffect(() => {
//     const token = localStorage.getItem('token');
//     setIsAuthenticated(!!token);
//   }, []);

//   // Fetch posts on component mount and when page or sort changes
//   useEffect(() => {
//     fetchPosts();
//   }, [page, sortOption]);

//   // Helper function to get auth headers
//   const getAuthHeaders = () => {
//     const token = localStorage.getItem('token');
//     return token ? { 'Authorization': `Bearer ${token}` } : {};
//   };

//   // Fetch all posts
//   const fetchPosts = async () => {
//     try {
//       setLoading(true);
//       const response = await fetch(`${API_BASE_URL}/api/social/posts?page=${page}&limit=5&sort=${sortOption}`, {
//         credentials: 'include' // Include cookies for CORS
//       });
      
//       if (!response.ok) {
//         throw new Error(`HTTP error ${response.status}`);
//       }
      
//       const data = await response.json();
//       setPosts(data.posts);
//       setTotalPages(data.totalPages);
//       setError(null);
//     } catch (error) {
//       console.error("Error fetching posts:", error);
//       setError("Failed to load posts. Please try again.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Handle search submit
//   const handleSearch = async (e) => {
//     e.preventDefault();
//     if (!searchQuery.trim()) return;
    
//     try {
//       setLoading(true);
//       const response = await fetch(`${API_BASE_URL}/api/social/search?query=${encodeURIComponent(searchQuery)}&sort=${sortOption}`, {
//         credentials: 'include'
//       });
      
//       if (!response.ok) {
//         throw new Error(`HTTP error ${response.status}`);
//       }
      
//       const data = await response.json();
//       setPosts(data.posts);
//       setTotalPages(data.totalPages);
//       setPage(1);
//       setError(null);
//     } catch (error) {
//       console.error("Error searching posts:", error);
//       setError("Failed to search posts. Please try again.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Handle like/unlike
//   const handleLike = async (postId, isLiked) => {
//     if (!isAuthenticated) {
//       setError('Please log in to like posts');
//       return;
//     }

//     try {
//       const endpoint = isLiked 
//         ? `${API_BASE_URL}/api/social/posts/${postId}/unlike` 
//         : `${API_BASE_URL}/api/social/posts/${postId}/like`;
      
//       const response = await fetch(endpoint, {
//         method: 'POST',
//         headers: { 
//           'Content-Type': 'application/json',
//           ...getAuthHeaders()
//         },
//         credentials: 'include'
//       });
      
//       if (!response.ok) {
//         const errorData = await response.json();
//         throw new Error(errorData.message || `HTTP error ${response.status}`);
//       }
      
//       // Update posts state to reflect the like/unlike action
//       setPosts(posts.map(post => {
//         if (post._id === postId) {
//           return {
//             ...post,
//             likesCount: isLiked ? post.likesCount - 1 : post.likesCount + 1,
//             isLiked: !isLiked
//           };
//         }
//         return post;
//       }));
      
//       setError(null);
//     } catch (error) {
//       console.error("Error liking/unliking post:", error);
//       setError(error.message || "Error processing like/unlike. Please try again.");
//     }
//   };

//   // Toggle comments visibility
//   const toggleComments = (postId) => {
//     setExpandedComments(prev => ({
//       ...prev,
//       [postId]: !prev[postId]
//     }));
//   };

//   // Handle comment submission
//   const handleAddComment = async (postId) => {
//     if (!isAuthenticated) {
//       setError('Please log in to comment');
//       return;
//     }

//     if (!newComment[postId]?.trim()) return;
    
//     try {
//       const response = await fetch(`${API_BASE_URL}/api/social/posts/${postId}/comments`, {
//         method: 'POST',
//         headers: { 
//           'Content-Type': 'application/json',
//           ...getAuthHeaders()
//         },
//         credentials: 'include',
//         body: JSON.stringify({ text: newComment[postId] })
//       });
      
//       if (!response.ok) {
//         const errorData = await response.json();
//         throw new Error(errorData.message || `HTTP error ${response.status}`);
//       }
      
//       const data = await response.json();
      
//       // Update posts state to include the new comment
//       setPosts(posts.map(post => {
//         if (post._id === postId) {
//           return {
//             ...post,
//             comments: [...(post.comments || []), data.comment],
//             commentsCount: post.commentsCount + 1
//           };
//         }
//         return post;
//       }));
      
//       // Clear the comment input field
//       setNewComment({...newComment, [postId]: ''});
//       setError(null);
//     } catch (error) {
//       console.error("Error adding comment:", error);
//       setError(error.message || "Failed to add comment. Please try again.");
//     }
//   };

//   // Submit new post
//   const handleSubmitPost = async () => {
//     if (!isAuthenticated) {
//       setError('Please log in to create a post');
//       return;
//     }

//     try {
//       // Validate required fields
//       if (!newPost.location) {
//         setError('Location is required');
//         return;
//       }
      
//       if (newPost.mediaType === 'text' && !newPost.content) {
//         setError('Content is required for text posts');
//         return;
//       }
      
//       if ((newPost.mediaType === 'image' || newPost.mediaType === 'video') && !newPost.mediaUrl) {
//         setError('Media URL is required for image/video posts');
//         return;
//       }
      
//       const response = await fetch(`${API_BASE_URL}/api/social/posts`, {
//         method: 'POST',
//         headers: { 
//           'Content-Type': 'application/json',
//           ...getAuthHeaders() // Use the helper function
//         },
//         credentials: 'include',
//         body: JSON.stringify(newPost)
//       });
      
//       if (!response.ok) {
//         const errorData = await response.json();
//         throw new Error(errorData.message || `HTTP error ${response.status}`);
//       }
      
//       // Reset form and close modal
//       setNewPost({
//         title: '',
//         content: '',
//         mediaType: 'text',
//         mediaUrl: '',
//         location: '',
//         landmark: ''
//       });
//       setShowNewPostModal(false);
//       setError(null);
      
//       // Refresh posts to show the new one
//       fetchPosts();
//     } catch (error) {
//       console.error("Error creating post:", error);
//       setError(error.message || "Failed to create post. Please ensure you are logged in.");
//     }
//   };

//   // Function to format date
//   const formatDate = (dateString) => {
//     const date = new Date(dateString);
//     return date.toLocaleDateString('en-US', { 
//       year: 'numeric', 
//       month: 'short', 
//       day: 'numeric' 
//     });
//   };

//   return (
//     <div className="min-h-screen bg-gray-100">
//       {/* Header */}
//       <header className="bg-white shadow">
//         <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center">
//           <h1 className="text-xl font-bold text-gray-800 mb-2 md:mb-0">Travel Stories</h1>
          
//           {/* Search bar */}
//           <form onSubmit={handleSearch} className="flex-1 max-w-md mx-4 mb-2 md:mb-0 w-full">
//             <div className="relative">
//               <input
//                 type="text"
//                 placeholder="Search locations, landmarks, or posts..."
//                 className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 value={searchQuery}
//                 onChange={(e) => setSearchQuery(e.target.value)}
//               />
//               <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
//               <button type="submit" className="absolute right-3 top-2 text-blue-500">
//                 Search
//               </button>
//             </div>
//           </form>
          
//           {/* Add new post button - only show if authenticated */}
//           <button 
//             onClick={() => {
//               if (isAuthenticated) {
//                 setShowNewPostModal(true);
//               } else {
//                 setError('Please log in to create a post');
//               }
//             }}
//             className="flex items-center bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-full transition"
//           >
//             <Plus size={16} className="mr-1" /> Add Post
//           </button>
//         </div>
//       </header>

//       {/* Authentication status message */}
//       {!isAuthenticated && (
//         <div className="container mx-auto px-4 py-2">
//           <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
//             <p>You are not logged in. Some features may be limited. Please log in to create posts, like, and comment.</p>
//           </div>
//         </div>
//       )}

//       {/* Sort options */}
//       <div className="container mx-auto px-4 py-3 flex items-center">
//         <div className="font-medium text-gray-700 mr-2">Sort by:</div>
//         <select 
//           value={sortOption}
//           onChange={(e) => setSortOption(e.target.value)}
//           className="bg-white border border-gray-300 rounded-md px-3 py-1