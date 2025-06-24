import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api";

export default function History() {
  const [trips, setTrips] = useState([]);

  useEffect(() => {
    api
      .get("/trips")
      .then((res) => setTrips(res.data))
      .catch((err) => alert("Failed to load history: " + err.message));
  }, []);

  return (
    <div>
      <h2>Your Saved Trips</h2>
      {trips.length === 0 ? (
        <p>No trips saved yet.</p>
      ) : (
        <ul>
          {trips.map((trip) => (
            <li key={trip._id}>
              <Link to={`/history/${trip._id}`}>
                {trip.name} — {new Date(trip.createdAt).toLocaleDateString()}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
