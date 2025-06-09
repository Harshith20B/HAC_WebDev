const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser'); // Move this to the top

// Weather prediction controller
const getWeatherPrediction = async (req, res) => {
  try {
    const { city } = req.body;
    
    if (!city) {
      return res.status(400).json({
        success: false,
        message: 'City name is required'
      });
    }

    console.log(`Starting weather prediction for city: ${city}`);

    // Path to the Python script
    const pythonScriptPath = path.join(__dirname, '../python/weatherForecast.py');
    
    // Check if Python script exists
    if (!fs.existsSync(pythonScriptPath)) {
      return res.status(500).json({
        success: false,
        message: 'Weather prediction script not found'
      });
    }

    // Create a promise to handle the Python process
    const weatherPrediction = new Promise((resolve, reject) => {
      // Spawn Python process with the city name as argument
      const pythonProcess = spawn('python', [pythonScriptPath, city], {
        cwd: path.dirname(pythonScriptPath),
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: false
      });

      let outputData = '';
      let errorData = '';

      // Collect stdout data
      pythonProcess.stdout.on('data', (data) => {
        const output = data.toString();
        outputData += output;
        console.log('Python output:', output.trim());
      });

      // Collect stderr data
      pythonProcess.stderr.on('data', (data) => {
        const error = data.toString();
        errorData += error;
        console.log('Python stderr:', error.trim());
      });

      // Handle process completion
      pythonProcess.on('close', (code) => {
        console.log(`Python process finished with code: ${code}`);
        
        if (code === 0) {
          console.log('✅ Python script executed successfully');
          
          // Try to parse weather data from CSV files
          parseWeatherData(city)
            .then(weatherData => {
              if (weatherData && weatherData.future && weatherData.future.length > 0) {
                resolve(weatherData);
              } else {
                reject(new Error('No weather data generated'));
              }
            })
            .catch(err => reject(err));
        } else {
          console.error('❌ Python script failed with code:', code);
          console.error('Error output:', errorData);
          reject(new Error(`Weather prediction failed: ${errorData || `Process exited with code ${code}`}`));
        }
      });

      // Handle process errors
      pythonProcess.on('error', (error) => {
        console.error('Failed to start Python process:', error);
        reject(new Error(`Failed to start weather prediction: ${error.message}`));
      });

      // Set timeout for the process (3 minutes - reduced from 5)
      const timeout = setTimeout(() => {
        console.log('⏰ Python process timeout, killing...');
        pythonProcess.kill('SIGTERM');
        
        // Force kill after 5 seconds if still running
        setTimeout(() => {
          pythonProcess.kill('SIGKILL');
        }, 5000);
        
        reject(new Error('Weather prediction timed out - please try again'));
      }, 180000);

      // Clear timeout if process completes normally
      pythonProcess.on('close', () => {
        clearTimeout(timeout);
      });
    });

    // Wait for the prediction to complete
    const weatherData = await weatherPrediction;

    res.json({
      success: true,
      message: 'Weather prediction completed successfully',
      data: weatherData
    });

  } catch (error) {
    console.error('Weather prediction error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate weather prediction',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Function to parse CSV weather data
const parseWeatherData = async (city) => {
  const pythonDir = path.join(__dirname, '../python');
  const historicalFile = path.join(pythonDir, `${city}_historical_weather.csv`);
  const futureFile = path.join(pythonDir, `${city}_future_weather.csv`);

  const weatherData = {
    city: city,
    historical: [],
    future: [],
    lastUpdated: new Date().toISOString()
  };

  try {
    // Parse historical data if available (last 30 days)
    if (fs.existsSync(historicalFile)) {
      console.log('📊 Parsing historical weather data...');
      const historicalData = await parseCSV(historicalFile);
      weatherData.historical = historicalData.slice(-30); // Last 30 days
    }

    // Parse future data if available
    if (fs.existsSync(futureFile)) {
      console.log('🔮 Parsing future weather data...');
      const futureData = await parseCSV(futureFile);
      weatherData.future = futureData.slice(0, 90); // Next 3 months (90 days)
    }

    // Generate summary statistics
    if (weatherData.future.length > 0) {
      weatherData.summary = generateWeatherSummary(weatherData.future);
      console.log('📈 Generated weather summary');
    }

    console.log(`✅ Parsed weather data: ${weatherData.historical.length} historical days, ${weatherData.future.length} future days`);
    return weatherData;

  } catch (error) {
    console.error('Error parsing weather data:', error);
    throw new Error('Failed to parse weather data files');
  }
};

// Helper function to parse CSV files
const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  CSV file not found: ${filePath}`);
      resolve([]);
      return;
    }
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        try {
          // Convert string values to numbers where appropriate
          const processedData = {
            date: data.ds || data.date,
            temp_max: parseFloat(data.temp_max) || 0,
            temp_min: parseFloat(data.temp_min) || 0,
            rainfall: parseFloat(data.rainfall) || 0,
            humidity: parseFloat(data.humidity) || 0,
            wind_speed: parseFloat(data.wind_speed) || 0,
            // Include confidence bounds if available
            temp_max_upper: parseFloat(data.temp_max_upper) || null,
            temp_max_lower: parseFloat(data.temp_max_lower) || null,
            temp_min_upper: parseFloat(data.temp_min_upper) || null,
            temp_min_lower: parseFloat(data.temp_min_lower) || null,
            rainfall_upper: parseFloat(data.rainfall_upper) || null,
            rainfall_lower: parseFloat(data.rainfall_lower) || null,
            humidity_upper: parseFloat(data.humidity_upper) || null,
            humidity_lower: parseFloat(data.humidity_lower) || null,
            wind_speed_upper: parseFloat(data.wind_speed_upper) || null,
            wind_speed_lower: parseFloat(data.wind_speed_lower) || null
          };
          results.push(processedData);
        } catch (err) {
          console.error('Error processing CSV row:', err);
        }
      })
      .on('end', () => {
        console.log(`📄 Parsed ${results.length} rows from ${path.basename(filePath)}`);
        resolve(results);
      })
      .on('error', (error) => {
        console.error('CSV parsing error:', error);
        reject(error);
      });
  });
};

// Generate comprehensive weather summary for the trip
const generateWeatherSummary = (futureData) => {
  if (!futureData || futureData.length === 0) {
    return null;
  }

  const next30Days = futureData.slice(0, 30);
  const next90Days = futureData.slice(0, 90);
  
  const summary = {
    // 30-day averages
    avgTempMax: (next30Days.reduce((sum, day) => sum + day.temp_max, 0) / next30Days.length).toFixed(1),
    avgTempMin: (next30Days.reduce((sum, day) => sum + day.temp_min, 0) / next30Days.length).toFixed(1),
    avgRainfall: (next30Days.reduce((sum, day) => sum + day.rainfall, 0) / next30Days.length).toFixed(1),
    avgHumidity: (next30Days.reduce((sum, day) => sum + day.humidity, 0) / next30Days.length).toFixed(1),
    avgWindSpeed: (next30Days.reduce((sum, day) => sum + day.wind_speed, 0) / next30Days.length).toFixed(1),
    
    // Weather pattern analysis
    rainyDays: next30Days.filter(day => day.rainfall > 1).length,
    heavyRainDays: next30Days.filter(day => day.rainfall > 10).length,
    extremeHeatDays: next30Days.filter(day => day.temp_max > 35).length,
    coolDays: next30Days.filter(day => day.temp_max < 20).length,
    highHumidityDays: next30Days.filter(day => day.humidity > 80).length,
    
    // 3-month overview
    monthlyBreakdown: [],
    
    // Seasonal insights
    bestWeatherPeriod: null,
    weatherTrends: {},
    
    recommendation: ''
  };

  // Generate monthly breakdown
  for (let month = 0; month < 3; month++) {
    const startIdx = month * 30;
    const endIdx = Math.min((month + 1) * 30, next90Days.length);
    const monthData = next90Days.slice(startIdx, endIdx);
    
    if (monthData.length > 0) {
      const monthSummary = {
        month: month + 1,
        avgTempMax: (monthData.reduce((sum, day) => sum + day.temp_max, 0) / monthData.length).toFixed(1),
        avgTempMin: (monthData.reduce((sum, day) => sum + day.temp_min, 0) / monthData.length).toFixed(1),
        totalRainfall: monthData.reduce((sum, day) => sum + day.rainfall, 0).toFixed(1),
        rainyDays: monthData.filter(day => day.rainfall > 1).length,
        avgHumidity: (monthData.reduce((sum, day) => sum + day.humidity, 0) / monthData.length).toFixed(1)
      };
      summary.monthlyBreakdown.push(monthSummary);
    }
  }

  // Find best weather period (7-day window with ideal conditions)
  let bestPeriodStart = 0;
  let bestScore = -1;
  
  for (let i = 0; i <= next30Days.length - 7; i++) {
    const weekData = next30Days.slice(i, i + 7);
    const avgTemp = weekData.reduce((sum, day) => sum + day.temp_max, 0) / 7;
    const rainyDays = weekData.filter(day => day.rainfall > 1).length;
    const avgHumidity = weekData.reduce((sum, day) => sum + day.humidity, 0) / 7;
    
    // Score based on comfortable temperature, low rain, and moderate humidity
    let score = 100;
    score -= Math.abs(avgTemp - 25) * 2; // Ideal temp around 25°C
    score -= rainyDays * 10; // Penalize rainy days
    score -= Math.abs(avgHumidity - 60) * 0.5; // Ideal humidity around 60%
    
    if (score > bestScore) {
      bestScore = score;
      bestPeriodStart = i;
    }
  }
  
  if (bestPeriodStart < next30Days.length - 7) {
    const bestPeriod = next30Days.slice(bestPeriodStart, bestPeriodStart + 7);
    summary.bestWeatherPeriod = {
      startDate: bestPeriod[0].date,
      endDate: bestPeriod[6].date,
      avgTemp: (bestPeriod.reduce((sum, day) => sum + day.temp_max, 0) / 7).toFixed(1),
      rainyDays: bestPeriod.filter(day => day.rainfall > 1).length
    };
  }

  // Generate comprehensive recommendation
  let recommendations = [];
  
  if (summary.rainyDays > 15) {
    recommendations.push('Heavy monsoon season expected - pack waterproof gear and plan indoor activities');
  } else if (summary.rainyDays > 8) {
    recommendations.push('Moderate rainfall expected - carry umbrella and rain jacket');
  } else if (summary.rainyDays < 3) {
    recommendations.push('Dry season - perfect for outdoor activities');
  }
  
  if (summary.extremeHeatDays > 20) {
    recommendations.push('Very hot weather - plan activities during early morning/evening hours');
  } else if (summary.extremeHeatDays > 10) {
    recommendations.push('Hot weather expected - stay hydrated and use sun protection');
  } else if (parseFloat(summary.avgTempMax) < 20) {
    recommendations.push('Cool weather - pack warm clothing for comfortable travel');
  }
  
  if (summary.highHumidityDays > 20) {
    recommendations.push('High humidity expected - choose breathable fabrics');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Pleasant weather conditions expected - ideal for sightseeing and outdoor activities');
  }
  
  summary.recommendation = recommendations.join('. ') + '.';
  
  return summary;
};

// Get weather prediction for multiple cities (for itinerary)
const getWeatherForItinerary = async (req, res) => {
  try {
    const { cities } = req.body;
    
    if (!cities || !Array.isArray(cities) || cities.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cities array is required'
      });
    }

    console.log(`Getting weather predictions for cities: ${cities.join(', ')}`);

    const weatherPromises = cities.slice(0, 5).map(async (city) => { // Limit to 5 cities
      try {
        // Check if we have existing recent data first
        const existingData = await parseWeatherData(city.trim());
        
        if (existingData && existingData.future && existingData.future.length > 0) {
          // Check if data is recent (less than 24 hours old)
          const lastUpdate = new Date(existingData.lastUpdated);
          const now = new Date();
          const hoursDiff = (now - lastUpdate) / (1000 * 60 * 60);
          
          if (hoursDiff < 24) {
            console.log(`Using existing data for ${city} (${hoursDiff.toFixed(1)} hours old)`);
            return {
              city: city.trim(),
              success: true,
              data: existingData
            };
          }
        }
        
        // Generate new prediction if no recent data exists
        console.log(`Generating new prediction for ${city}`);
        
        const weatherData = await new Promise((resolve, reject) => {
          const pythonScriptPath = path.join(__dirname, '../python/weatherForecast.py');
          const pythonProcess = spawn('python', [pythonScriptPath, city.trim()]);
          
          let outputData = '';
          
          pythonProcess.stdout.on('data', (data) => {
            outputData += data.toString();
          });
          
          pythonProcess.on('close', async (code) => {
            if (code === 0) {
              try {
                const data = await parseWeatherData(city.trim());
                resolve(data);
              } catch (parseError) {
                reject(parseError);
              }
            } else {
              reject(new Error(`Failed to generate prediction for ${city}`));
            }
          });

          pythonProcess.on('error', (error) => {
            reject(error);
          });

          // Timeout after 2 minutes per city
          setTimeout(() => {
            pythonProcess.kill('SIGTERM');
            reject(new Error(`Timeout generating prediction for ${city}`));
          }, 120000);
        });

        return {
          city: city.trim(),
          success: true,
          data: weatherData
        };
        
      } catch (error) {
        console.error(`Failed to get weather for ${city}:`, error);
        return {
          city: city.trim(),
          success: false,
          error: error.message
        };
      }
    });

    const results = await Promise.all(weatherPromises);

    res.json({
      success: true,
      message: 'Weather data retrieved successfully',
      data: results
    });

  } catch (error) {
    console.error('Weather prediction error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get weather predictions',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

module.exports = {
  getWeatherPrediction,
  getWeatherForItinerary
};