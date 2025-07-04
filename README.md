# TravelSphere: AI-Powered Itinerary and Landmark Discovery

TravelSphere is a smart, AI-driven travel planning web application designed to simplify and enhance trip planning. It leverages advanced AI (Gemini API), real-time data integrations, and a modern tech stack to generate personalized itineraries, suggest nearby landmarks, provide weather forecasts, and enable social travel planning.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [AI Modules](#ai-modules)
- [User Flow](#user-flow)
- [Screenshots](#screenshots)
- [How It Works](#how-it-works)
- [Installation](#installation)
- [Future Scope](#future-scope)
- [Contributors](#contributors)
- [License](#license)

---

## Features

✅ AI-powered itinerary generation with Gemini API  
✅ Landmark discovery with images and descriptions  
✅ Real-time weather forecast integration  
✅ Optimized route planning (K-Means clustering, nearest-neighbor)  
✅ User authentication and profile management  
✅ Social features to share travel posts/vlogs and connect with other travelers  
✅ Collaborative trip planning with invitations and community engagement  

---

## Architecture

TravelSphere follows a three-tier architecture:

- **Frontend (React):** Dynamic UI with client-side routing and state management.
- **Backend (Node.js + Express):** REST API for business logic and data management.
- **Database (MongoDB):** NoSQL store for users, posts, itineraries, and connections.

![Architecture Diagram](docs/Architecture.jpg)

---

## Tech Stack

- **Frontend:** React.js
- **Backend:** Node.js, Express.js
- **Database:** MongoDB
- **AI/ML:** Google Gemini API, Prophet for weather forecasting, K-Means Clustering
- **APIs/Services:**
  - Google Places API
  - OpenWeatherMap API
  - Cloudinary
  - Pexels API
  - Open-Meteo API

---

## AI Modules

### Landmark Discovery
- Uses Gemini API for location-based landmark suggestions.
- Fetches images via Pexels API.
- Enriches landmarks with geolocation metadata and descriptions.

### Itinerary Generation
- Clusters landmarks day-wise using K-Means.
- Route optimization with nearest-neighbor algorithm.
- Structured itineraries via Gemini-based natural language generation.

### Weather Forecasting
- Historical data from Open-Meteo.
- Forecasts generated using Prophet for the next 90 days.
- Helps users plan weather-sensitive activities.

---

## User Flow

TravelSphere offers a clear and intuitive user journey:

- **Home Page:** Central entry point for navigation.
  - Landmark Search
  - Posts Feed
  - Travel Plans

### Landmark Search Module
- Enter a location or use GPS.
- Get landmark suggestions with images and descriptions.
- Add selected landmarks to your itinerary.
- Assign visits to specific days.
- View real-time weather forecasts for destinations.
- Generate an optimized, day-wise itinerary.

### Posts Feed Module
- View posts and travel vlogs shared by other travelers.
- Create and upload your own posts with text and images.
- Like and comment to engage with the community.

### Travel Plans Module
- Create new travel plans with trip details.
- Invite friends via email or make plans public.
- Browse existing plans and send join requests.
- Get notifications for requests and approvals.
- Collaborate on group travel itineraries.

---

## Screenshots

Below are key pages of the TravelSphere app:

### Home Page
![Home Page](docs/Home_Page.jpg)

### User Registration and Profile Editing
![Edit Profile](docs/Edit_Profile.jpg)

### Landmark Selection
![Landmark Selection](docs/Landmarks_Selection.jpg)

### Itinerary Generation (Step 1)
![Itinerary Generation 1](docs/itinerary_generation1.jpg)

### Itinerary Generation (Step 2)
![Itinerary Generation 2](docs/Itinerary_generation2.jpg)

### Weather Forecast
![Weather Forecast](docs/Weather_Forecast.jpg)

### Connect Feature (Join Travel Plans)
![Connect Feature](docs/Connect.jpg)

### User Flow Diagram
![User Flow Diagram](docs/User_Flow.jpg)

### Add Post / Travel Vlog
![Add Post](docs/AddPost.jpg)

### Posts Feed
![Posts Feed](docs/Posts.jpg)

---

## How It Works

1️⃣ **Register/Login**  
   - Secure authentication with JWT.  
   - Edit and manage your profile.  

2️⃣ **Search Landmarks**  
   - Enter destination or use GPS.  
   - View AI-generated landmarks with images and descriptions.  
   - Add to your itinerary.

3️⃣ **Plan Itinerary**  
   - Cluster landmarks into day-wise trips.  
   - Optimize routes automatically.  
   - Get clear day-by-day plans with costs and travel times.

4️⃣ **Weather Integration**  
   - View detailed forecasts for trip destinations.  
   - Plan weather-sensitive activities confidently.

5️⃣ **Connect Feature**  
   - Create travel plans.  
   - Invite friends via email or make public plans others can join.  
   - Browse and join community travel plans.

6️⃣ **Posts and Vlogs**  
   - Share travel stories and photos.  
   - Browse other users’ posts for inspiration.  
   - Engage with the community via likes and comments.

---

## Installation

### Prerequisites
- Node.js
- MongoDB

### Steps

```bash
# Clone the repository
git clone https://github.com/Harshith20B/HAC_WebDev.git
cd HAC_WebDev

# Install backend dependencies
npm install

# Install frontend dependencies
cd client
npm install
