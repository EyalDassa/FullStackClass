const express = require("express");
const fetch = (...args) =>
  import("node-fetch").then(({ default: f }) => f(...args));
const router = express.Router();

// Haversine formula (km)
function haversine([lon1, lat1], [lon2, lat2]) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1),
    dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchSpaceJson(url, data) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data }),
  });
  const contentType = res.headers.get("content-type");
  if (res.ok && contentType && contentType.includes("application/json")) {
    return await res.json();
  } else {
    const text = await res.text();
    throw new Error(`Space error: ${res.status} ${text.slice(0, 100)}`);
  }
}

function sampleKeyPoints(coords, sampleCount) {
  if (sampleCount <= 0 || coords.length === 0) return [];

  // we want sampleCount points, including first and last,
  // so the step between indices is (coords.length - 1) / (sampleCount - 1)
  const step = (coords.length - 1) / (sampleCount - 1);

  return (
    Array.from({ length: sampleCount }, (_, i) => {
      // round to the nearest integer index
      const idx = Math.round(i * step);
      return coords[idx];
    })
      // in case coords is shorter than sampleCount, drop undefined
      .filter(Boolean)
  );
}

router.post("/route", async (req, res) => {
  try {
    const { location, type } = req.body;
    if (!location || !["bike", "trek"].includes(type)) {
      return res
        .status(400)
        .json({ message: "Please provide location and type (bike|trek)" });
    }
    // 1) Geocode with Nominatim
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(location)}&format=json&limit=1`,
      { headers: { "User-Agent": "TripPlannerApp/1.0" } }
    );
    const geoData = await geoRes.json();
    if (!geoData[0]) {
      return res.status(404).json({ message: "Location not found" });
    }
    let lat = parseFloat(geoData[0].lat),
      lon = parseFloat(geoData[0].lon);

    // ─── Snap start point with ORS Nearest ───────────────
    const profile = type === "bike" ? "cycling-regular" : "foot-hiking";
    let snappedLon = lon,
      snappedLat = lat;

    // Build the GET URL
    const snapUrl = new URL(
      `https://api.openrouteservice.org/v2/nearest/${profile}`
    );
    snapUrl.searchParams.set("point", `${lon},${lat}`);
    snapUrl.searchParams.set("number", "1");
    snapUrl.searchParams.set("radius", "1000");

    try {
      const snapRes = await fetch(snapUrl, {
        headers: { Authorization: process.env.ORS_API_KEY },
      });

      if (snapRes.ok) {
        const { features } = await snapRes.json();
        if (features?.length) {
          [snappedLon, snappedLat] = features[0].geometry.coordinates;
        }
      }
      // on 404 or other non-OK, we just keep the raw lon/lat
    } catch (e) {
      console.warn("ORS nearest exception:", e.message);
    }

    // Apply snapped coords (or raw if none)
    lon = snappedLon;
    lat = snappedLat;
    // ────────────────────────────────────────────────────────

    // 2) Compute the round-trip
    const days = type === "bike" ? 2 : 1;
    const maxKmPerDay = type === "bike" ? 60 : 10;
    const totalMeters = days * maxKmPerDay * 1000;
    const roundTripMeters = Math.min(totalMeters, 100_000);

    const orsRes = await fetch(
      `https://api.openrouteservice.org/v2/directions/${profile}/geojson`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: process.env.ORS_API_KEY,
        },
        body: JSON.stringify({
          coordinates: [[lon, lat]],
          options: {
            round_trip: {
              length: roundTripMeters,
              seed: Math.floor(Math.random() * 10000),
            },
          },
        }),
      }
    );

    const orsJson = await orsRes.json();
    if (!orsRes.ok) {
      return res.status(500).json({ message: "Routing error", error: orsJson });
    }

    if (!orsJson.features || orsJson.features.length === 0) {
      return res.status(404).json({
        message:
          "Could not generate a bike route from this location. Please try a different starting point.",
      });
    }

    const coords = orsJson.features[0].geometry.coordinates;

    // 3) Slice into per-day distances
    const dayDistances = Array(days).fill(0);
    let currentDay = 0,
      accum = 0;

    for (let i = 1; i < coords.length; i++) {
      const segmentKm = haversine(coords[i - 1], coords[i]);
      if (accum + segmentKm > maxKmPerDay && currentDay < days - 1) {
        currentDay++;
        accum = 0;
      }
      dayDistances[currentDay] += segmentKm;
      accum += segmentKm;
    }

    // 4) Fetch 3-day forecast from Open-Meteo
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}` +
        `&longitude=${lon}` +
        `&daily=temperature_2m_max,temperature_2m_min,weathercode` +
        `&timezone=auto`
    );
    const wj = await weatherRes.json();
    const weather = wj.daily.time.slice(1, 4).map((date, i) => ({
      date,
      temp_max: wj.daily.temperature_2m_max[i + 1],
      temp_min: wj.daily.temperature_2m_min[i + 1],
      weathercode: wj.daily.weathercode[i + 1],
    }));

    // 7) Return everything
    res.json({ coords, dayDistances, weather, lat, lon });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to generate route" });
  }
});

router.post("/image", async (req, res) => {
  try {
    const { location, type } = req.body;
    if (!location || !type) {
      return res.status(400).json({ message: "Missing location or type" });
    }
    const prompt = `A beautiful ${type} trip in ${location}, showing its iconic landmarks, bright colors, 800x600`;
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
      prompt
    )}`;
    res.json({ imageUrl });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to generate image" });
  }
});

router.post("/narrative", async (req, res) => {
  try {
    const { location, type, dayDistances, coords } = req.body;
    if (!location || !type || !dayDistances || !coords) {
      return res.status(400).json({ message: "Missing parameters" });
    }
    const days = dayDistances.length;

    // To give the AI context, we'll get names for a few key points on the route
    const keyPoints = sampleKeyPoints(coords, 10);

    const placeNames = [];
    for (const point of keyPoints) {
      const [lon, lat] = point;
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`,
          { headers: { "User-Agent": "TripPlannerApp/1.0" } }
        );
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          const name =
            geoData.address?.village ||
            geoData.address?.town ||
            geoData.address?.suburb ||
            geoData.display_name.split(",")[0];
          if (name && !placeNames.includes(name)) {
            placeNames.push(name);
          }
        }
        await new Promise((r) => setTimeout(r, 500)); // Rate limit
      } catch (e) {
        console.warn("Reverse geocoding failed for a point", e.message);
      }
    }

    const prompt = `
You are a friendly travel guide. A user is planning a ${days}-day ${type} trip starting in ${location}.
Their route will take them near the following places: ${placeNames.join(", ")}.
The daily distances (km) are: ${dayDistances
      .map((d) => d.toFixed(1))
      .join(", ")}.

Mention the places you were told about. Keep the response concise.
**Important:** Do not mention coordinates. Describe the journey in a natural, story-like way.
    `.trim();

    let narrative = "";
    try {
      const groqRes = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama3-70b-8192",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 300,
          }),
        }
      );
      const contentType = groqRes.headers.get("content-type");
      if (
        groqRes.ok &&
        contentType &&
        contentType.includes("application/json")
      ) {
        const hfJson = await groqRes.json();
        if (hfJson?.choices?.[0]?.message?.content) {
          narrative = hfJson.choices[0].message.content;
        }
      } else {
        const text = await groqRes.text();
        console.warn("Groq text error:", groqRes.status, text.slice(0, 100));
      }
    } catch (e) {
      console.warn("Groq text exception:", e.message);
    }
    // plain-text fallback
    if (!narrative) {
      narrative =
        dayDistances
          .map((d, i) => `Day ${i + 1}: approx ${d.toFixed(1)} km`)
          .join(". ") + ".";
    }
    res.json({ narrative });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to generate narrative" });
  }
});
module.exports = router;
