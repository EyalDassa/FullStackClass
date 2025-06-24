import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import "./History.css";

export default function History() {
  const [trips, setTrips] = useState([]);

  useEffect(() => {
    api
      .get("/trips")
      .then((res) => setTrips(res.data))
      .catch((err) => alert("Failed to load history: " + err.message));
  }, []);

  return (
    <div className="container">
      <h2 style={{ marginBottom: "2rem" }}>Your Saved Trips</h2>
      {trips.length === 0 ? (
        <p>
          You haven't saved any trips yet. Go to the "Plan" page to create one!
        </p>
      ) : (
        <div className="history-grid">
          {trips.map((trip) => (
            <Link
              to={`/history/${trip._id}`}
              key={trip._id}
              className="trip-card"
            >
              <h3>{trip.name}</h3>
              <p>{trip.description || "No description"}</p>
              <div className="trip-date">
                Saved on {new Date(trip.createdAt).toLocaleDateString()}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
