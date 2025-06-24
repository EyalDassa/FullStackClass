import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "../api";
import { MapContainer, TileLayer, Polyline } from "react-leaflet";

export default function TripDetail() {
  const { id } = useParams();
  const [trip, setTrip] = useState(null);

  useEffect(() => {
    api
      .get(`/trips/${id}`)
      .then((res) => setTrip(res.data))
      .catch((err) => alert("Failed to load trip: " + err.message));
  }, [id]);

  if (!trip) return <p>Loading…</p>;

  return (
    <div>
      <h2>{trip.name}</h2>
      {trip.description && <p>{trip.description}</p>}
      <MapContainer
        style={{ height: "400px", width: "100%" }}
        center={[trip.coords[0][1], trip.coords[0][0]]}
        zoom={12}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Polyline positions={trip.coords.map(([lon, lat]) => [lat, lon])} />
      </MapContainer>
      <h3>Distances</h3>
      <ul>
        {trip.dayDistances.map((d, i) => (
          <li key={i}>
            Day {i + 1}: {d.toFixed(1)} km
          </li>
        ))}
      </ul>
    </div>
  );
}
