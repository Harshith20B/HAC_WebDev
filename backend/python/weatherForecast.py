import requests
import pandas as pd
from prophet import Prophet
from datetime import datetime
import sys
import warnings
import logging
import os

# Set UTF-8 encoding for Windows compatibility
if sys.platform.startswith('win'):
    os.environ['PYTHONIOENCODING'] = 'utf-8'

# Suppress warnings and logging to reduce output
warnings.filterwarnings('ignore')
logging.getLogger('prophet').setLevel(logging.ERROR)
logging.getLogger('cmdstanpy').setLevel(logging.ERROR)

# Function to safe print (avoid Unicode errors)
def safe_print(message):
    try:
        print(message)
    except UnicodeEncodeError:
        # Fallback to ASCII-safe version
        ascii_message = message.encode('ascii', 'ignore').decode('ascii')
        print(ascii_message)

# Function to get latitude and longitude from a city name
def get_lat_lon(city_name):
    try:
        geocode_url = f"https://geocoding-api.open-meteo.com/v1/search?name={city_name}&count=1"
        response = requests.get(geocode_url, timeout=10).json()

        if "results" in response and len(response["results"]) > 0:
            lat = response["results"][0]["latitude"]
            lon = response["results"][0]["longitude"]
            return lat, lon
        else:
            safe_print("ERROR: City not found! Please try again with a valid location.")
            return None, None
    except Exception as e:
        safe_print(f"ERROR: Error getting coordinates: {str(e)}")
        return None, None

# Function to get historical weather data
def get_historical_weather(city_name, years=5):  # Reduced from 10 to 5 years for faster processing
    lat, lon = get_lat_lon(city_name)
    if lat is None:
        return None

    try:
        # Define date range (last 5 years for faster processing)
        start_date = f"{datetime.today().year - years}-01-01"
        end_date = datetime.today().strftime("%Y-%m-%d")

        # API URL for past weather data
        url = f"https://archive-api.open-meteo.com/v1/era5?latitude={lat}&longitude={lon}&start_date={start_date}&end_date={end_date}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_mean,wind_speed_10m_max&timezone=Asia/Kolkata"

        response = requests.get(url, timeout=30).json()

        if "daily" in response:
            df_hist = pd.DataFrame({
                "ds": response["daily"]["time"],
                "temp_max": response["daily"]["temperature_2m_max"],
                "temp_min": response["daily"]["temperature_2m_min"],
                "rainfall": response["daily"]["precipitation_sum"],
                "humidity": response["daily"]["relative_humidity_2m_mean"],
                "wind_speed": response["daily"]["wind_speed_10m_max"]
            })
            df_hist["ds"] = pd.to_datetime(df_hist["ds"])
            
            # Clean data - remove any null values
            df_hist = df_hist.dropna()
            
            # Save historical data
            df_hist.to_csv(f"{city_name}_historical_weather.csv", index=False)
            safe_print(f"SUCCESS: Historical weather data saved for {city_name}")
            return df_hist
        else:
            safe_print("ERROR: Could not fetch historical weather data.")
            return None
    except Exception as e:
        safe_print(f"ERROR: Error fetching historical data: {str(e)}")
        return None

# Function to predict future weather for the next 3-6 months
def predict_future_weather(city_name):
    safe_print(f"PROCESSING: Starting weather prediction for {city_name}...")
    
    df_hist = get_historical_weather(city_name, years=5)
    if df_hist is None:
        return None

    future_forecasts = {}
    prediction_days = 90  # Reduced to 3 months for faster processing

    try:
        # Train separate Prophet models for each weather parameter
        for param in ["temp_max", "temp_min", "rainfall", "humidity", "wind_speed"]:
            safe_print(f"PROCESSING: Processing {param}...")
            
            # Prepare data for Prophet
            df = df_hist[["ds", param]].rename(columns={param: "y"})
            df = df.dropna()  # Remove any remaining null values
            
            # Configure Prophet for faster processing
            model = Prophet(
                daily_seasonality=True,
                weekly_seasonality=True,
                yearly_seasonality=True,
                changepoint_prior_scale=0.05,  # Less flexible = faster
                seasonality_prior_scale=10.0,
                n_changepoints=25,  # Reduced changepoints
                interval_width=0.8
            )
            
            # Fit model
            model.fit(df)

            # Create future dataframe for 3 months
            future = model.make_future_dataframe(periods=prediction_days)
            
            # Make predictions
            forecast = model.predict(future)

            # Filter only future predictions
            future_forecast = forecast[forecast["ds"] > df_hist["ds"].max()].copy()
            future_forecast = future_forecast[["ds", "yhat", "yhat_lower", "yhat_upper"]]
            future_forecast.rename(columns={
                "yhat": param, 
                "yhat_lower": f"{param}_lower", 
                "yhat_upper": f"{param}_upper"
            }, inplace=True)

            # Ensure realistic values
            if param in ["temp_max", "temp_min"]:
                future_forecast[param] = future_forecast[param].clip(-10, 50)  # Realistic temperature range
            elif param == "rainfall":
                future_forecast[param] = future_forecast[param].clip(0, None)  # No negative rainfall
            elif param == "humidity":
                future_forecast[param] = future_forecast[param].clip(0, 100)  # 0-100% humidity
            elif param == "wind_speed":
                future_forecast[param] = future_forecast[param].clip(0, None)  # No negative wind speed

            # Store in dictionary
            future_forecasts[param] = future_forecast

        # Combine all future forecasts into one DataFrame
        safe_print("PROCESSING: Combining forecasts...")
        final_forecast = future_forecasts["temp_max"][["ds"]].copy()
        
        for param in future_forecasts:
            final_forecast = final_forecast.merge(future_forecasts[param], on="ds", how="left")

        # Clean up the data
        final_forecast = final_forecast.fillna(method='ffill')  # Forward fill any missing values
        
        # Format dates
        final_forecast["ds"] = final_forecast["ds"].dt.strftime("%Y-%m-%d")

        # Save future forecast to CSV
        final_forecast.to_csv(f"{city_name}_future_weather.csv", index=False)
        safe_print(f"SUCCESS: 3-month weather forecast saved for {city_name}")
        
        # Print summary
        avg_temp = final_forecast["temp_max"].mean()
        total_rainfall = final_forecast["rainfall"].sum()
        safe_print(f"SUMMARY: Forecast Summary: Avg Max Temp: {avg_temp:.1f}C, Total Rainfall: {total_rainfall:.1f}mm")
        
        return True

    except Exception as e:
        safe_print(f"ERROR: Error in prediction: {str(e)}")
        return False

if __name__ == "__main__":
    if len(sys.argv) > 1:
        city_name = sys.argv[1]
        safe_print(f"WEATHER: Processing weather prediction for: {city_name}")
        success = predict_future_weather(city_name)
        if success:
            safe_print(f"SUCCESS: Weather prediction completed successfully for {city_name}")
            sys.exit(0)
        else:
            safe_print(f"ERROR: Weather prediction failed for {city_name}")
            sys.exit(1)
    else:
        safe_print("ERROR: City name argument required")
        sys.exit(1)