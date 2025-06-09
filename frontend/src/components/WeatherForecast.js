import React, { useState, useEffect } from 'react';
import { 
  Cloud, Sun, CloudRain, Wind, Droplets, Thermometer, Calendar, 
  Loader2, AlertCircle, TrendingUp, MapPin, Clock, Star, Umbrella,
  Eye, Activity, ChevronDown, ChevronUp, Info
} from 'lucide-react';

const WeatherForecast = ({ city, tripDetails, isVisible = true }) => {
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('forecast');
  const [selectedTimeframe, setSelectedTimeframe] = useState('week');
  const [expandedDay, setExpandedDay] = useState(null);
  
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
    } catch (err) {
      console.error('Weather fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Effect to fetch data when city changes
  useEffect(() => {
    if (city && isVisible) {
      fetchWeatherData();
    }
  }, [city, isVisible]);

  // Get filtered data based on timeframe
  const getFilteredData = () => {
    if (!weatherData?.future) return [];
    
    switch (selectedTimeframe) {
      case 'week':
        return weatherData.future.slice(0, 7);
      case 'month':
        return weatherData.future.slice(0, 30);
      case 'quarter':
        return weatherData.future.slice(0, 90);
      default:
        return weatherData.future.slice(0, 7);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-gray-600">Analyzing weather patterns for {city}...</p>
            <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 font-medium">Weather data unavailable</p>
            <p className="text-gray-600 text-sm mt-2">{error}</p>
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
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <Cloud className="h-8 w-8 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No weather data available</p>
            <p className="text-sm text-gray-500 mt-2">Please select a city to view forecast</p>
          </div>
        </div>
      </div>
    );
  }

  const filteredData = getFilteredData();

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
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
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('forecast')}
          className={`flex-1 px-4 py-3 text-sm font-medium ${
            activeTab === 'forecast' 
              ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <Calendar className="h-4 w-4 inline mr-2" />
          Forecast
        </button>
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex-1 px-4 py-3 text-sm font-medium ${
            activeTab === 'summary' 
              ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50' 
              : 'text-gray-600 hover:text-gray-800'
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
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                7 Days
              </button>
              <button
                onClick={() => setSelectedTimeframe('month')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  selectedTimeframe === 'month'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                30 Days
              </button>
              <button
                onClick={() => setSelectedTimeframe('quarter')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  selectedTimeframe === 'quarter'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                3 Months
              </button>
            </div>

            {/* Weather Cards */}
            <div className="space-y-3">
              {filteredData.map((day, index) => (
                <div
                  key={index}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setExpandedDay(expandedDay === index ? null : index)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {getWeatherIcon(day.temp_max, day.rainfall, day.humidity, 'h-8 w-8')}
                      <div>
                        <div className="font-medium">{formatDate(day.date)}</div>
                        <div className="text-sm text-gray-600">
                          {getWeatherCondition(day.temp_max, day.rainfall, day.humidity)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-bold ${getTemperatureColor(day.temp_max)}`}>
                          {Math.round(day.temp_max)}°
                        </span>
                        <span className="text-gray-500">
                          {Math.round(day.temp_min)}°
                        </span>
                        {expandedDay === index ? 
                          <ChevronUp className="h-4 w-4 text-gray-400" /> : 
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        }
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedDay === index && (
                    <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="flex items-center gap-2">
                        <Droplets className="h-4 w-4 text-blue-500" />
                        <div>
                          <div className="text-sm text-gray-600">Rainfall</div>
                          <div className="font-medium">{day.rainfall.toFixed(1)}mm</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-gray-500" />
                        <div>
                          <div className="text-sm text-gray-600">Humidity</div>
                          <div className="font-medium">{Math.round(day.humidity)}%</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Wind className="h-4 w-4 text-green-500" />
                        <div>
                          <div className="text-sm text-gray-600">Wind Speed</div>
                          <div className="font-medium">{day.wind_speed.toFixed(1)} km/h</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Thermometer className="h-4 w-4 text-red-500" />
                        <div>
                          <div className="text-sm text-gray-600">Feels Like</div>
                          <div className="font-medium">
                            {Math.round((day.temp_max + day.temp_min) / 2)}°C
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'summary' && weatherData.summary && (
          <div className="space-y-6">
            {/* Overall Summary */}
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-900 mb-2">Travel Recommendation</h3>
                  <p className="text-blue-800 text-sm leading-relaxed">
                    {weatherData.summary.recommendation}
                  </p>
                </div>
              </div>
            </div>

            {/* Best Weather Period */}
            {weatherData.summary.bestWeatherPeriod && (
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Star className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-green-900 mb-2">Best Weather Period</h3>
                    <p className="text-green-800 text-sm mb-2">
                      {formatDateFull(weatherData.summary.bestWeatherPeriod.startDate)} - {formatDateFull(weatherData.summary.bestWeatherPeriod.endDate)}
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-green-700">Average Temperature: </span>
                        <span className="font-medium">{weatherData.summary.bestWeatherPeriod.avgTemp}°C</span>
                      </div>
                      <div>
                        <span className="text-green-700">Rainy Days: </span>
                        <span className="font-medium">{weatherData.summary.bestWeatherPeriod.rainyDays}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Weather Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">30-Day Averages</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Max Temperature:</span>
                    <span className="font-medium">{weatherData.summary.avgTempMax}°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Min Temperature:</span>
                    <span className="font-medium">{weatherData.summary.avgTempMin}°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Average Rainfall:</span>
                    <span className="font-medium">{weatherData.summary.avgRainfall}mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Average Humidity:</span>
                    <span className="font-medium">{weatherData.summary.avgHumidity}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Average Wind Speed:</span>
                    <span className="font-medium">{weatherData.summary.avgWindSpeed} km/h</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Weather Patterns</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Rainy Days:</span>
                    <span className="font-medium">{weatherData.summary.rainyDays}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Heavy Rain Days:</span>
                    <span className="font-medium">{weatherData.summary.heavyRainDays}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Hot Days (&gt;35°C):</span>
                    <span className="font-medium">{weatherData.summary.extremeHeatDays}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cool Days (&lt;20°C):</span>
                    <span className="font-medium">{weatherData.summary.coolDays}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">High Humidity Days:</span>
                    <span className="font-medium">{weatherData.summary.highHumidityDays}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Monthly Breakdown */}
            {weatherData.summary.monthlyBreakdown && weatherData.summary.monthlyBreakdown.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-900 mb-4">3-Month Outlook</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {weatherData.summary.monthlyBreakdown.map((month, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <h4 className="font-medium mb-3">Month {month.month}</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Avg Max Temp:</span>
                          <span className="font-medium">{month.avgTempMax}°C</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Avg Min Temp:</span>
                          <span className="font-medium">{month.avgTempMin}°C</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Rainfall:</span>
                          <span className="font-medium">{month.totalRainfall}mm</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Rainy Days:</span>
                          <span className="font-medium">{month.rainyDays}</span>
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