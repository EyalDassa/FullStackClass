import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "../api";
import { MapContainer, TileLayer, Polyline } from "react-leaflet";
import MapController from "../components/MapController";
import "./TripDetail.css";

export default function TripDetail() {
  const { id } = useParams();
  const [trip, setTrip] = useState(null);
  const [weather, setWeather] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(false);

  useEffect(() => {
    api
      .get(`/trips/${id}`)
      .then((res) => setTrip(res.data))
      .catch((err) => alert("Failed to load trip: " + err.message));
  }, [id]);

  const fetchWeather = async () => {
    if (!trip || !trip.coords || trip.coords.length === 0) return;

    setLoadingWeather(true);
    try {
      // Get the center point of the trip for weather
      const centerCoord = trip.coords[Math.floor(trip.coords.length / 2)];
      const [lon, lat] = centerCoord;

      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}` +
          `&longitude=${lon}` +
          `&daily=temperature_2m_max,temperature_2m_min,weathercode` +
          `&timezone=auto`
      );

      if (response.ok) {
        const weatherData = await response.json();
        const forecast = weatherData.daily.time.slice(1, 4).map((date, i) => ({
          date,
          temp_max: weatherData.daily.temperature_2m_max[i + 1],
          temp_min: weatherData.daily.temperature_2m_min[i + 1],
          weathercode: weatherData.daily.weathercode[i + 1],
        }));
        setWeather(forecast);
      } else {
        alert("Failed to fetch weather data");
      }
    } catch (err) {
      alert("Failed to fetch weather: " + err.message);
    } finally {
      setLoadingWeather(false);
    }
  };

  if (!trip) {
    return (
      <div className="loading-container">
        <p>Loading Trip Details...</p>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="trip-detail-grid">
        <div className="trip-detail-main">
          <div className="trip-header">
            <div className="trip-info">
              <h2>{trip.name}</h2>
              {trip.description && (
                <p className="trip-description">{trip.description}</p>
              )}
            </div>
            <div className="trip-distances">
              <h3>Distances</h3>
              <ul>
                {trip.dayDistances.map((d, i) => (
                  <li key={i}>
                    Day {i + 1}: {d.toFixed(1)} km
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <MapContainer
            className="map-container"
            center={[trip.coords[0][1], trip.coords[0][0]]}
            zoom={12}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <Polyline positions={trip.coords.map(([lon, lat]) => [lat, lon])} />
            <MapController
              bounds={trip.coords.map(([lon, lat]) => [lat, lon])}
            />
          </MapContainer>

          {weather && (
            <div className="weather-forecast">
              <h3>Current Weather Forecast</h3>
              <div className="weather-grid">
                {weather.map((w, i) => (
                  <div key={i} className="weather-day">
                    <div className="weather-date">{w.date}</div>
                    <div className="weather-temp">
                      {w.temp_min}° – {w.temp_max}°
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="trip-detail-sidebar">
          {trip.narrative && (
            <div className="details-card">
              <h3>Itinerary</h3>
              <p className="narrative-text">{trip.narrative}</p>
            </div>
          )}

          <button
            onClick={fetchWeather}
            disabled={loadingWeather}
            className="weather-btn"
          >
            {loadingWeather ? "Loading..." : "Get Current Weather"}
          </button>
        </div>
      </div>
    </div>
  );
}
