import requests
import pandas as pd
import matplotlib.pyplot as plt
from prophet import Prophet
from datetime import datetime

# Function to get latitude and longitude from a city name
def get_lat_lon(city_name):
    geocode_url = f"https://geocoding-api.open-meteo.com/v1/search?name={city_name}&count=1"
    response = requests.get(geocode_url).json()

    if "results" in response:
        lat = response["results"][0]["latitude"]
        lon = response["results"][0]["longitude"]
        return lat, lon
    else:
        print("❌ City not found! Please try again with a valid location in India.")
        return None, None

# Function to get historical weather data
def get_historical_weather(city_name, years=10):
    lat, lon = get_lat_lon(city_name)
    if lat is None:
        return None

    # Define date range (last 10 years)
    start_date = f"{datetime.today().year - years}-01-01"
    end_date = datetime.today().strftime("%Y-%m-%d")

    # API URL for past weather data (multiple weather parameters)
    url = f"https://archive-api.open-meteo.com/v1/era5?latitude={lat}&longitude={lon}&start_date={start_date}&end_date={end_date}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_mean,wind_speed_10m_max&timezone=Asia/Kolkata"

    response = requests.get(url).json()

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
        df_hist.to_csv(f"{city_name}_historical_weather.csv", index=False)
        print(f"✅ Historical weather data saved as '{city_name}_historical_weather.csv'")
        return df_hist
    else:
        print("Error: Could not fetch historical weather data.")
        return None

# Function to predict future weather for the next 6 months
def predict_future_weather(city_name):
    df_hist = get_historical_weather(city_name, years=10)
    if df_hist is None:
        return None  # Stop if there's an error fetching historical data

    future_forecasts = {}

    # Train separate Prophet models for each weather parameter
    for param in ["temp_max", "temp_min", "rainfall", "humidity", "wind_speed"]:
        df = df_hist[["ds", param]].rename(columns={param: "y"})

        print(f"🔄 Training Prophet model for {param}...")
        model = Prophet()
        model.fit(df)

        # Create a dataframe for future 180 days prediction
        future = model.make_future_dataframe(periods=180)
        forecast = model.predict(future)

        # Filter only future predictions
        future_forecast = forecast[forecast["ds"] > df_hist["ds"].max()]
        future_forecast = future_forecast[["ds", "yhat", "yhat_lower", "yhat_upper"]]
        future_forecast.rename(columns={"yhat": param, "yhat_lower": f"{param}_lower", "yhat_upper": f"{param}_upper"}, inplace=True)

        # Store in dictionary
        future_forecasts[param] = future_forecast

        # Plot forecast for this parameter
        model.plot(forecast)
        plt.title(f"Future Forecast for {param}")
        plt.show()
        model.plot_components(forecast)
        plt.show()

    # Combine all future forecasts into one DataFrame
    final_forecast = future_forecasts["temp_max"][["ds"]].copy()
    for param in future_forecasts:
        final_forecast = final_forecast.merge(future_forecasts[param], on="ds", how="left")

    # Save future forecast to CSV
    final_forecast.to_csv(f"{city_name}_future_weather.csv", index=False)
    print(f"✅ 6-month future weather forecast saved as '{city_name}_future_weather.csv'")

# Get input from user
city_name = input("Enter the city name in India: ")
predict_future_weather(city_name)
