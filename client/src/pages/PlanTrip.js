import React, { useState } from "react";
import api from "../api";
import { MapContainer, TileLayer, Polyline } from "react-leaflet";
import { useNavigate } from "react-router-dom";

export default function PlanTrip() {
  const [location, setLocation] = useState("");
  const [type, setType] = useState("trek");
  const [plan, setPlan] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // 1) Generate the trip preview
  const handlePlan = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setPlan(null);

    try {
      // Step 1: Get route, weather, etc.
      const routeRes = await api.post("/trips/plan/route", { location, type });
      const routeData = routeRes.data;

      // Set an initial plan state so the map and basic info can render
      // while AI content is being generated.
      setPlan({ ...routeData, imageUrl: "", narrative: "Generating..." });

      // Step 2: Get AI content in parallel
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
      });
      navigate("/history");
    } catch (err) {
      alert("Save failed: " + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div>
      <h2>Plan a Trip</h2>

      {/* Trip planning form */}
      <form onSubmit={handlePlan}>
        <input
          placeholder="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          required
        />
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="trek">Trek</option>
          <option value="bike">Bike</option>
        </select>
        <button type="submit" disabled={isLoading}>
          {isLoading ? "Generating..." : "Generate"}
        </button>
      </form>

      {/* Once we have a plan, show preview + save UI */}
      {plan && (
        <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
          {/* Save Trip form */}
          <div style={{ flex: 1 }}>
            <h3>Save this Trip</h3>
            <div>
              <label>Trip Name</label>
              <br />
              <input
                placeholder="e.g. Desert Sunrise Trek"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div style={{ marginTop: "0.5rem" }}>
              <label>Description (optional)</label>
              <br />
              <textarea
                placeholder="Short description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <button onClick={handleSave} style={{ marginTop: "0.5rem" }}>
              Save Trip
            </button>
          </div>

          {/* Map preview */}
          <MapContainer
            style={{ height: "400px", width: "60%" }}
            center={[plan.coords[0][1], plan.coords[0][0]]}
            zoom={12}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Polyline positions={plan.coords.map(([lon, lat]) => [lat, lon])} />
          </MapContainer>

          {/* Trip details */}
          <div style={{ flex: 1 }}>
            <h3>Distances (km/day)</h3>
            <ul>
              {plan.dayDistances.map((d, i) => (
                <li key={i}>
                  Day {i + 1}: {d.toFixed(1)}
                </li>
              ))}
            </ul>
            <h3>Weather</h3>
            <ul>
              {plan.weather.map((w, i) => (
                <li key={i}>
                  {w.date}: {w.temp_min}–{w.temp_max}
                </li>
              ))}
            </ul>
            <img
              src={plan.imageUrl}
              alt={location}
              style={{ maxWidth: "100%", marginTop: "1rem" }}
            />
            <h3>Itinerary</h3>
            <p>{plan.narrative}</p>
          </div>
        </div>
      )}
    </div>
  );
}
