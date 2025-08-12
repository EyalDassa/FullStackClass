import React, { useState } from "react";
import api from "../api";
import { MapContainer, TileLayer, Polyline } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import MapController from "../components/MapController";
import "./PlanTrip.css";

export default function PlanTrip() {
  const [location, setLocation] = useState("Paris");
  const [type, setType] = useState("bike");
  const [plan, setPlan] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const navigate = useNavigate();

  // 1) Generate the trip preview
  const handlePlan = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setPlan(null);

    try {
      // Step 1: Get route, weather, etc.
      setLoadingStep("Generating route and calculating distances...");
      const routeRes = await api.post("/trips/plan/route", { location, type });
      const routeData = routeRes.data;

      // Set an initial plan state so the map and basic info can render
      // while AI content is being generated.
      setPlan({ ...routeData, imageUrl: "", narrative: "Generating..." });

      // Step 2: Get AI content in parallel
      setLoadingStep("Generating AI image and itinerary...");
      const imagePromise = api.post("/trips/plan/image", { location, type });
      const narrativePromise = api.post("/trips/plan/narrative", {
        location,
        type,
        dayDistances: routeData.dayDistances,
        coords: routeData.coords,
      });

      const [imageRes, narrativeRes] = await Promise.all([
        imagePromise,
        narrativePromise,
      ]);

      // Step 3: Update the plan with the AI content
      setLoadingStep("Finalizing your trip plan...");
      setPlan((prevPlan) => ({
        ...prevPlan,
        imageUrl: imageRes.data.imageUrl,
        narrative: narrativeRes.data.narrative,
      }));
    } catch (err) {
      alert(
        "Failed to plan trip: " + (err.response?.data?.message || err.message)
      );
      setPlan(null); // Clear plan on error
    } finally {
      setIsLoading(false);
      setLoadingStep("");
    }
  };

  // 2) Save the planned trip
  const handleSave = async () => {
    if (!name.trim()) {
      return alert("Please enter a name for your trip.");
    }
    try {
      await api.post("/trips", {
        name,
        description,
        type,
        coords: plan.coords,
        dayDistances: plan.dayDistances,
        narrative: plan.narrative,
      });
      navigate("/history");
    } catch (err) {
      alert("Save failed: " + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="container plan-trip-container">
      <form onSubmit={handlePlan} className="planner-form">
        <input
          placeholder="Enter a city or destination"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          required
        />
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="trek">Trek</option>
          <option value="bike">Bike</option>
        </select>
        <button type="submit" disabled={isLoading}>
          {isLoading ? "Generating..." : "Generate Plan"}
        </button>
      </form>

      {isLoading && (
        <div className="loading-animation">
          <div className="spinner"></div>
          <p className="loading-text">{loadingStep}</p>
        </div>
      )}

      {plan && (
        <div className="plan-results">
          {/* Left Sidebar */}
          <div className="plan-sidebar">
            <div className="save-trip-card">
              <h3>Save Your Trip</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSave();
                }}
              >
                <input
                  placeholder="e.g. Desert Sunrise Trek"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <textarea
                  placeholder="A short, fun description of the trip"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
                <button type="submit">Save Trip</button>
              </form>
            </div>

            <div className="plan-details-card">
              <h3>Trip Details</h3>
              <strong>Distances (km/day)</strong>
              <ul>
                {plan.dayDistances.map((d, i) => (
                  <li key={i}>
                    Day {i + 1}: {d.toFixed(1)} km
                  </li>
                ))}
              </ul>
              <strong style={{ marginTop: "1rem" }}>Weather Forecast</strong>
              <ul>
                {plan.weather.map((w, i) => (
                  <li key={i}>
                    {w.date}: {w.temp_min}° – {w.temp_max}°
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right Main Content */}
          <div className="plan-main">
            <MapContainer
              className="map-container"
              center={[48.8566, 2.3522]} // Default to Paris or a sensible default
              zoom={12}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <Polyline
                positions={plan.coords.map(([lon, lat]) => [lat, lon])}
              />
              <MapController
                bounds={plan.coords.map(([lon, lat]) => [lat, lon])}
              />
            </MapContainer>

            <div className="plan-details-card narrative-card">
              <h3>Your AI-Generated Itinerary</h3>
              {plan.imageUrl && (
                <img
                  src={plan.imageUrl}
                  alt={`AI-generated image for ${location}`}
                  className="plan-image"
                />
              )}
              <p>{plan.narrative}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
