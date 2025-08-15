# TripPlanner 🗺️

A modern, AI-powered trip planning web application that generates personalized travel itineraries with routes, weather forecasts, and AI-generated narratives.

## ✨ Features

- **AI-Powered Trip Generation**: Uses Groq AI to create personalized trip narratives
- **Interactive Maps**: Built with Leaflet.js for route visualization
- **Route Planning**: Generates optimized routes using OpenRouteService API
- **Weather Integration**: Real-time weather forecasts for trip destinations
- **Modern UI**: Clean, responsive design with card-based layouts
- **User Authentication**: Secure login/registration system
- **Trip History**: Save and revisit your planned trips
- **Real-time Updates**: Live weather data and current forecasts

## 🏗️ Project Structure

```
FullStackClass/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── contexts/       # React context providers
│   │   ├── pages/          # Main application pages
│   │   └── api.js          # API configuration
│   ├── public/             # Static assets
│   └── package.json        # Frontend dependencies
├── server/                 # Node.js backend
│   ├── config/             # Database configuration
│   ├── db/                 # Database operations
│   ├── middleware/         # Authentication middleware
│   ├── routes/             # API endpoints
│   └── package.json        # Backend dependencies
├── docker-compose.yml      # Docker configuration
└── README.md               # This file
```

## 🚀 Tech Stack

### Frontend

- **React 18** - Modern React with hooks
- **React Router** - Client-side routing
- **Leaflet.js** - Interactive maps
- **CSS3** - Modern styling with CSS variables
- **Responsive Design** - Mobile-first approach

### Backend

- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **JWT** - Authentication tokens

### External APIs

- **Groq AI** - AI-powered trip narratives
- **OpenRouteService** - Route planning and optimization
- **Open-Meteo** - Weather forecasts
- **Nominatim** - Geocoding services

## 📋 Prerequisites

Before running this project, make sure you have:

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **MongoDB** (local or cloud instance)
- **API Keys** for external services

## 🔑 Required API Keys

Create a `.env` file in the `server/` directory with:

```env
# Database
MONGODB_URI=your_mongodb_connection_string

# Authentication
JWT_SECRET=your_jwt_secret_key

# External APIs
ORS_API_KEY=your_openrouteservice_api_key
GROQ_API_KEY=your_groq_api_key
```

### Getting API Keys

1. **OpenRouteService**: [Sign up here](https://openrouteservice.org/dev/#/signup)
2. **Groq AI**: [Get API key here](https://console.groq.com/)
3. **MongoDB**: [Create free cluster](https://www.mongodb.com/atlas)

## 🛠️ Installation & Setup

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd FullStackClass
```

### 2. Install Dependencies

```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 3. Configure Environment

```bash
# In server/ directory
cp .env.example .env
# Edit .env with your API keys
```

### 4. Start the Application

```bash
# Terminal 1 - Start backend
cd server
npm start

# Terminal 2 - Start frontend
cd client
npm start

# From project root - use Docker to run DB
docker-compose up
```

## 🌐 Running the Application

1. **Backend**: Runs on `http://localhost:8080`
2. **Frontend**: Runs on `http://localhost:3000`
3. **Database**: MongoDB connection (local or cloud)

## 📱 How to Use

### 1. **Registration/Login**

- Create an account or log in to access the trip planner
- Secure authentication with JWT tokens

### 2. **Plan a Trip**

- Enter a destination (city, landmark, etc.)
- Choose trip type: **Bike** or **Trek**
- Click "Generate Plan" to create your itinerary

### 3. **Trip Generation Process**

The system generates your trip in three steps:

1. **Route Planning**: Calculates optimal route and distances
2. **AI Content**: Generates image and narrative (in parallel)
3. **Finalization**: Combines all data into your trip plan

### 4. **Save and View Trips**

- Save your generated trips with custom names
- View trip history and details
- Get current weather updates for saved trips
