import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "../api";
import { MapContainer, TileLayer, Polyline } from "react-leaflet";
import MapController from "../components/MapController";
import "./TripDetail.css";

export default function TripDetail() {
  const { id } = useParams();
  const [trip, setTrip] = useState(null);

  useEffect(() => {
    api
      .get(`/trips/${id}`)
      .then((res) => setTrip(res.data))
      .catch((err) => alert("Failed to load trip: " + err.message));
  }, [id]);

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
          <h2>{trip.name}</h2>
          {trip.description && (
            <p className="trip-description">{trip.description}</p>
          )}
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
        </div>
        <div className="trip-detail-sidebar">
          <div className="details-card">
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
      </div>
    </div>
  );
}
