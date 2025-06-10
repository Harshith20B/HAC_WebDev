import React, { useState, useEffect } from 'react';
import { 
  Cloud, Sun, CloudRain, Wind, Droplets, Thermometer, Calendar, 
  Loader2, AlertCircle, TrendingUp, MapPin, Clock, Star, Umbrella,
  Eye, Activity, ChevronDown, ChevronUp, Info, ChevronLeft, ChevronRight
} from 'lucide-react';

const WeatherForecast = ({ city, tripDetails, isVisible = true, darkMode = false }) => {
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('forecast');
  const [selectedTimeframe, setSelectedTimeframe] = useState('week');
  const [expandedDay, setExpandedDay] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(0);
  
  // Mock API for demonstration
  const generateMockWeatherData = () => {
    const mockData = {
      city: city || "Demo City",
      lastUpdated: new Date().toISOString(),
      future: [],
      summary: {
        recommendation: "Great weather conditions expected for your trip! Pack light clothing and carry an umbrella for occasional showers.",
        avgTempMax: 28,
        avgTempMin: 22,
        avgRainfall: 45,
        avgHumidity: 68,
        avgWindSpeed: 12,
        rainyDays: 8,
        heavyRainDays: 2,
        extremeHeatDays: 3,
        coolDays: 5,
        highHumidityDays: 12,
        bestWeatherPeriod: {
          startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          avgTemp: 26,
          rainyDays: 1
        },
        monthlyBreakdown: [
          { month: 1, avgTempMax: 28, avgTempMin: 22, totalRainfall: 125, rainyDays: 8 },
          { month: 2, avgTempMax: 30, avgTempMin: 24, totalRainfall: 85, rainyDays: 5 },
          { month: 3, avgTempMax: 32, avgTempMin: 26, totalRainfall: 65, rainyDays: 4 }
        ]
      }
    };

    // Generate 90 days of mock data
    for (let i = 0; i < 90; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      
      const baseTemp = 25 + Math.sin(i / 30) * 8;
      const tempVariation = Math.random() * 6 - 3;
      const rainfall = Math.random() < 0.3 ? Math.random() * 15 : Math.random() * 3;
      
      mockData.future.push({
        date: date.toISOString().split('T')[0],
        temp_max: Math.round(baseTemp + tempVariation + 3),
        temp_min: Math.round(baseTemp + tempVariation - 3),
        rainfall: Math.round(rainfall * 10) / 10,
        humidity: Math.round(60 + Math.random() * 30),
        wind_speed: Math.round((8 + Math.random() * 12) * 10) / 10
      });
    }

    return mockData;
  };

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://hac-webdev-2.onrender.com/api';

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateFull = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateShort = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric'
    });
  };

  // Get weather icon based on conditions
  const getWeatherIcon = (temp, rainfall, humidity, size = 'h-6 w-6') => {
    if (rainfall > 10) {
      return <CloudRain className={`${size} text-blue-600`} />;
    } else if (rainfall > 2) {
      return <CloudRain className={`${size} text-blue-400`} />;
    } else if (temp > 35) {
      return <Sun className={`${size} text-red-500`} />;
    } else if (temp > 30) {
      return <Sun className={`${size} text-orange-500`} />;
    } else if (temp < 15) {
      return <Cloud className={`${size} text-gray-500`} />;
    } else if (humidity > 80) {
      return <Cloud className={`${size} text-gray-400`} />;
    } else {
      return <Sun className={`${size} text-yellow-500`} />;
    }
  };

  // Get weather condition text
  const getWeatherCondition = (temp, rainfall, humidity) => {
    if (rainfall > 15) return 'Heavy Rain Expected';
    if (rainfall > 5) return 'Moderate Rain';
    if (rainfall > 1) return 'Light Rain';
    if (temp > 40) return 'Extremely Hot';
    if (temp > 35) return 'Very Hot';
    if (temp > 30) return 'Hot';
    if (temp > 25) return 'Warm';
    if (temp > 20) return 'Pleasant';
    if (temp > 15) return 'Cool';
    if (temp < 15) return 'Cold';
    if (humidity > 85) return 'Very Humid';
    if (humidity > 70) return 'Humid';
    return 'Pleasant';
  };

  const getTemperatureColor = (temp) => {
    if (temp > 35) return 'text-red-600';
    if (temp > 30) return 'text-orange-500';
    if (temp > 25) return 'text-yellow-500';
    if (temp > 20) return 'text-green-500';
    if (temp > 15) return 'text-blue-500';
    return 'text-blue-600';
  };

  // Fetch weather data
  const fetchWeatherData = async () => {
    if (!city) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // For demo purposes, use mock data
      // In production, uncomment the API call below
      setTimeout(() => {
        const mockData = generateMockWeatherData();
        setWeatherData(mockData);
        setLoading(false);
      }, 1500);

      /*
      const response = await fetch(`${API_BASE_URL}/explore/weather-prediction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ city: city })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setWeatherData(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch weather data');
      }
      */
    } catch (err) {
      console.error('Weather fetch error:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  // Effect to fetch data when city changes
  useEffect(() => {
    if (city && isVisible) {
      fetchWeatherData();
    }
  }, [city, isVisible]);

  // Get filtered data with improved navigation
  const getFilteredData = () => {
    if (!weatherData?.future) return [];
    
    switch (selectedTimeframe) {
      case 'week':
        return weatherData.future.slice(0, 7);
      case 'month':
        // For month, show as calendar grid instead of scrolling
        return weatherData.future.slice(0, 30);
      case 'quarter':
        // For quarter, group by months
        const quarterData = weatherData.future.slice(0, 90);
        const monthStart = selectedMonth * 30;
        return quarterData.slice(monthStart, monthStart + 30);
      default:
        return weatherData.future.slice(0, 7);
    }
  };

  // Reset navigation when timeframe changes
  useEffect(() => {
    setSelectedWeek(0);
    setSelectedMonth(0);
  }, [selectedTimeframe]);

  // Calendar view for month
  const renderCalendarView = (data) => {
    const weeks = [];
    for (let i = 0; i < data.length; i += 7) {
      weeks.push(data.slice(i, i + 7));
    }

    return (
      <div className="space-y-4">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-2">
            {week.map((day, dayIndex) => (
              <div
                key={dayIndex}
                className={`p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all ${
                  darkMode 
                    ? 'border-gray-600 bg-gray-700 hover:bg-gray-600' 
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
                onClick={() => setExpandedDay(expandedDay === `${weekIndex}-${dayIndex}` ? null : `${weekIndex}-${dayIndex}`)}
              >
                <div className="text-center">
                  <div className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {formatDateShort(day.date)}
                  </div>
                  <div className="flex justify-center mb-2">
                    {getWeatherIcon(day.temp_max, day.rainfall, day.humidity, 'h-5 w-5')}
                  </div>
                  <div className={`text-sm font-medium ${getTemperatureColor(day.temp_max)}`}>
                    {Math.round(day.temp_max)}°
                  </div>
                  <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {Math.round(day.temp_min)}°
                  </div>
                  {day.rainfall > 1 && (
                    <div className="text-xs text-blue-500 mt-1">
                      {day.rainfall.toFixed(1)}mm
                    </div>
                  )}
                </div>
                
                {/* Expanded Details for Calendar */}
                {expandedDay === `${weekIndex}-${dayIndex}` && (
                  <div className={`mt-3 pt-3 border-t space-y-2 ${
                    darkMode ? 'border-gray-600' : 'border-gray-200'
                  }`}>
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Humidity:</span>
                        <span className="font-medium">{Math.round(day.humidity)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Wind:</span>
                        <span className="font-medium">{day.wind_speed.toFixed(1)} km/h</span>
                      </div>
                      <div className={`text-center mt-2 text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {getWeatherCondition(day.temp_max, day.rainfall, day.humidity)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
            <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Analyzing weather patterns for {city}...
            </p>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-2`}>
              This may take a few moments
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 font-medium">Weather data unavailable</p>
            <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} text-sm mt-2`}>
              {error}
            </p>
            <button
              onClick={fetchWeatherData}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (!weatherData) {
    return (
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <Cloud className="h-8 w-8 text-gray-400 mx-auto mb-4" />
            <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              No weather data available
            </p>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-2`}>
              Please select a city to view forecast
            </p>
          </div>
        </div>
      </div>
    );
  }

  const filteredData = getFilteredData();

  return (
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg overflow-hidden`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-5 w-5" />
              <h2 className="text-xl font-bold">{weatherData.city}</h2>
            </div>
            <div className="flex items-center gap-2 text-blue-100">
              <Clock className="h-4 w-4" />
              <span className="text-sm">
                Last updated: {new Date(weatherData.lastUpdated).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">
              {filteredData.length > 0 ? `${Math.round(filteredData[0].temp_max)}°C` : '--'}
            </div>
            <div className="text-sm text-blue-100">
              {filteredData.length > 0 ? getWeatherCondition(
                filteredData[0].temp_max, 
                filteredData[0].rainfall, 
                filteredData[0].humidity
              ) : 'No data'}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className={`flex border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <button
          onClick={() => setActiveTab('forecast')}
          className={`flex-1 px-4 py-3 text-sm font-medium ${
            activeTab === 'forecast' 
              ? `border-b-2 border-blue-500 text-blue-600 ${darkMode ? 'bg-gray-700' : 'bg-blue-50'}` 
              : `${darkMode ? 'text-gray-300 hover:text-gray-100' : 'text-gray-600 hover:text-gray-800'}`
          }`}
        >
          <Calendar className="h-4 w-4 inline mr-2" />
          Forecast
        </button>
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex-1 px-4 py-3 text-sm font-medium ${
            activeTab === 'summary' 
              ? `border-b-2 border-blue-500 text-blue-600 ${darkMode ? 'bg-gray-700' : 'bg-blue-50'}` 
              : `${darkMode ? 'text-gray-300 hover:text-gray-100' : 'text-gray-600 hover:text-gray-800'}`
          }`}
        >
          <TrendingUp className="h-4 w-4 inline mr-2" />
          Summary
        </button>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'forecast' && (
          <div>
            {/* Timeframe Selector */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setSelectedTimeframe('week')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  selectedTimeframe === 'week'
                    ? 'bg-blue-500 text-white'
                    : `${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`
                }`}
              >
                7 Days
              </button>
              <button
                onClick={() => setSelectedTimeframe('month')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  selectedTimeframe === 'month'
                    ? 'bg-blue-500 text-white'
                    : `${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`
                }`}
              >
                30 Days
              </button>
              <button
                onClick={() => setSelectedTimeframe('quarter')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  selectedTimeframe === 'quarter'
                    ? 'bg-blue-500 text-white'
                    : `${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`
                }`}
              >
                3 Months
              </button>
            </div>

            {/* Quarter Month Selector */}
            {selectedTimeframe === 'quarter' && (
              <div className="flex gap-2 mb-6 justify-center">
                {['Month 1', 'Month 2', 'Month 3'].map((month, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedMonth(index)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      selectedMonth === index
                        ? 'bg-blue-500 text-white'
                        : `${darkMode ? 'bg-gray-700 text-gray-400 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`
                    }`}
                  >
                    {month}
                  </button>
                ))}
              </div>
            )}

            {/* Weather Display */}
            {selectedTimeframe === 'week' ? (
              // Week view - List format
              <div className="space-y-3">
                {filteredData.map((day, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${
                      darkMode 
                        ? 'border-gray-600 bg-gray-700 hover:bg-gray-600' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                    onClick={() => setExpandedDay(expandedDay === index ? null : index)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {getWeatherIcon(day.temp_max, day.rainfall, day.humidity, 'h-8 w-8')}
                        <div>
                          <div className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                            {formatDate(day.date)}
                          </div>
                          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {getWeatherCondition(day.temp_max, day.rainfall, day.humidity)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <span className={`text-lg font-bold ${getTemperatureColor(day.temp_max)}`}>
                            {Math.round(day.temp_max)}°
                          </span>
                          <span className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {Math.round(day.temp_min)}°
                          </span>
                          {expandedDay === index ? 
                            <ChevronUp className={`h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} /> : 
                            <ChevronDown className={`h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} />
                          }
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedDay === index && (
                      <div className={`mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4 ${
                        darkMode ? 'border-gray-600' : 'border-gray-200'
                      }`}>
                        <div className="flex items-center gap-2">
                          <Droplets className="h-4 w-4 text-blue-500" />
                          <div>
                            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              Rainfall
                            </div>
                            <div className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                              {day.rainfall.toFixed(1)}mm
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4 text-gray-500" />
                          <div>
                            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              Humidity
                            </div>
                            <div className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                              {Math.round(day.humidity)}%
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Wind className="h-4 w-4 text-green-500" />
                          <div>
                            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              Wind Speed
                            </div>
                            <div className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                              {day.wind_speed.toFixed(1)} km/h
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Thermometer className="h-4 w-4 text-red-500" />
                          <div>
                            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              Feels Like
                            </div>
                            <div className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                              {Math.round((day.temp_max + day.temp_min) / 2)}°C
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              // Month/Quarter view - Calendar format
              renderCalendarView(filteredData)
            )}
          </div>
        )}

        {activeTab === 'summary' && weatherData.summary && (
          <div className="space-y-6">
            {/* Overall Summary */}
            <div className={`${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'} rounded-lg p-4`}>
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className={`font-medium mb-2 ${darkMode ? 'text-blue-200' : 'text-blue-900'}`}>
                    Travel Recommendation
                  </h3>
                  <p className={`text-sm leading-relaxed ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                    {weatherData.summary.recommendation}
                  </p>
                </div>
              </div>
            </div>

            {/* Best Weather Period */}
            {weatherData.summary.bestWeatherPeriod && (
              <div className={`${darkMode ? 'bg-green-900/30' : 'bg-green-50'} rounded-lg p-4`}>
                <div className="flex items-start gap-3">
                  <Star className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h3 className={`font-medium mb-2 ${darkMode ? 'text-green-200' : 'text-green-900'}`}>
                      Best Weather Period
                    </h3>
                    <p className={`text-sm mb-2 ${darkMode ? 'text-green-300' : 'text-green-800'}`}>
                      {formatDateFull(weatherData.summary.bestWeatherPeriod.startDate)} - {formatDateFull(weatherData.summary.bestWeatherPeriod.endDate)}
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className={`${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                          Average Temperature: 
                        </span>
                        <span className="font-medium">{weatherData.summary.bestWeatherPeriod.avgTemp}°C</span>
                      </div>
                      <div>
                        <span className={`${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                          Rainy Days: 
                        </span>
                        <span className="font-medium">{weatherData.summary.bestWeatherPeriod.rainyDays}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Weather Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-4`}>
                <h3 className={`font-medium mb-3 ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>30-Day Averages</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Max Temperature:</span>
                    <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>{weatherData.summary.avgTempMax}°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Min Temperature:</span>
                    <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>{weatherData.summary.avgTempMin}°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Average Rainfall:</span>
                    <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>{weatherData.summary.avgRainfall}mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Average Humidity:</span>
                    <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>{weatherData.summary.avgHumidity}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Average Wind Speed:</span>
                    <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>{weatherData.summary.avgWindSpeed} km/h</span>
                  </div>
                </div>
              </div>

              <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-4`}>
                <h3 className={`font-medium mb-3 ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>Weather Patterns</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Rainy Days:</span>
                    <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>{weatherData.summary.rainyDays}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Heavy Rain Days:</span>
                    <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>{weatherData.summary.heavyRainDays}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Hot Days (&gt;35°C):</span>
                    <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>{weatherData.summary.extremeHeatDays}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Cool Days (&lt;20°C):</span>
                    <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>{weatherData.summary.coolDays}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>High Humidity Days:</span>
                    <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>{weatherData.summary.highHumidityDays}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Monthly Breakdown */}
            {weatherData.summary.monthlyBreakdown && weatherData.summary.monthlyBreakdown.length > 0 && (
              <div>
                <h3 className={`font-medium mb-4 ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>3-Month Outlook</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {weatherData.summary.monthlyBreakdown.map((month, index) => (
                    <div key={index} className={`border rounded-lg p-4 ${
                      darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-white'
                    }`}>
                      <h4 className={`font-medium mb-3 ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                        Month {month.month}
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Avg Max Temp:</span>
                          <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>{month.avgTempMax}°C</span>
                        </div>
                        <div className="flex justify-between">
                          <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Avg Min Temp:</span>
                          <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>{month.avgTempMin}°C</span>
                        </div>
                        <div className="flex justify-between">
                          <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Rainfall:</span>
                          <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>{month.totalRainfall}mm</span>
                        </div>
                        <div className="flex justify-between">
                          <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Rainy Days:</span>
                          <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>{month.rainyDays}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WeatherForecast;