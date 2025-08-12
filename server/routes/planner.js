const express = require("express");
const fetch = (...args) =>
  import("node-fetch").then(({ default: f }) => f(...args));
const router = express.Router();

/* =========================
   Constants / Config
========================= */
const ORS_BASE = "https://api.openrouteservice.org/v2";
const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const OPEN_METEO_BASE = "https://api.open-meteo.com/v1/";
const USER_AGENT = "TripPlannerApp/1.0";

const MAX_KM_PER_DAY = { bike: 60, trek: 10 };
const PROFILE = { bike: "cycling-regular", trek: "foot-hiking" };

/* =========================
   Math / Geo Utils
========================= */
function toRad(d) {
  return (d * Math.PI) / 180;
}
function toDeg(r) {
  return (r * 180) / Math.PI;
}

// Haversine formula (km)
function haversine([lon1, lat1], [lon2, lat2]) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1),
    dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Destination point given start [lon,lat], distanceKm and bearingDeg
function destinationPoint([lon, lat], distanceKm, bearingDeg) {
  const earthRadiusKm = 6371;
  const distanceRadians = distanceKm / earthRadiusKm;
  const bearingRadians = toRad(bearingDeg);

  const startLatRad = toRad(lat);
  const startLonRad = toRad(lon);

  const sinStartLat = Math.sin(startLatRad);
  const cosStartLat = Math.cos(startLatRad);
  const sinDist = Math.sin(distanceRadians);
  const cosDist = Math.cos(distanceRadians);
  const sinBearing = Math.sin(bearingRadians);
  const cosBearing = Math.cos(bearingRadians);

  const sinEndLat = sinStartLat * cosDist + cosStartLat * sinDist * cosBearing;
  const endLatRad = Math.asin(sinEndLat);

  const y = sinBearing * sinDist * cosStartLat;
  const x = cosDist - sinStartLat * sinEndLat;
  const endLonRad = startLonRad + Math.atan2(y, x);

  return [toDeg(endLonRad), toDeg(endLatRad)];
}

/* =========================
   Generic Helpers
========================= */
async function jsonGet(url, headers = {}) {
  const res = await fetch(url, { headers });
  const ct = res.headers.get("content-type");
  const isJson = ct && ct.includes("application/json");
  const data = isJson ? await res.json() : await res.text();
  if (!res.ok)
    throw new Error(
      `GET ${url} failed: ${res.status} ${JSON.stringify(data).slice(0, 200)}`
    );
  return data;
}

async function jsonPost(url, body, headers = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

function sampleKeyPoints(coords, sampleCount) {
  if (sampleCount <= 0 || coords.length === 0) return [];
  const step = (coords.length - 1) / (sampleCount - 1);
  return Array.from(
    { length: sampleCount },
    (_, i) => coords[Math.round(i * step)]
  ).filter(Boolean);
}

async function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/* =========================
   External Services
========================= */
async function geocodeLocation(query) {
  const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(
    query
  )}&format=json&limit=1`;
  const data = await jsonGet(url, { "User-Agent": USER_AGENT });
  if (!data?.[0]) throw new Error("Location not found");
  return [parseFloat(data[0].lon), parseFloat(data[0].lat)];
}

async function reverseGeocode(lon, lat, zoom = 10) {
  const url = `${NOMINATIM_BASE}/reverse?format=json&lat=${lat}&lon=${lon}&zoom=${zoom}`;
  return jsonGet(url, { "User-Agent": USER_AGENT });
}

// Try ORS /nearest with growing radii to get a routable point
async function getRoutablePoint(
  profile,
  lon,
  lat,
  radii = [500, 1000, 2000, 5000, 10000]
) {
  for (const r of radii) {
    try {
      const u = new URL(`${ORS_BASE}/nearest/${profile}`);
      u.searchParams.set("point", `${lon},${lat}`);
      u.searchParams.set("number", "1");
      u.searchParams.set("radius", String(r));

      const res = await fetch(u, {
        headers: { Authorization: process.env.ORS_API_KEY },
      });
      if (!res.ok) continue;
      const j = await res.json();
      if (j?.features?.length) return j.features[0].geometry.coordinates; // [lon,lat]
    } catch {
      /* ignore and try next radius */
    }
  }
  return null;
}

async function orsDirections(profile, coords) {
  return jsonPost(
    `${ORS_BASE}/directions/${profile}/geojson`,
    { coordinates: coords },
    { Authorization: process.env.ORS_API_KEY }
  );
}

async function orsRoundTrip(profile, startLon, startLat, meters, seed) {
  return jsonPost(
    `${ORS_BASE}/directions/${profile}/geojson`,
    {
      coordinates: [[startLon, startLat]],
      options: { round_trip: { length: meters, seed } },
    },
    { Authorization: process.env.ORS_API_KEY }
  );
}

async function fetchWeather(lat, lon) {
  const url =
    `${OPEN_METEO_BASE}/forecast?latitude=${lat}` +
    `&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`;
  const wj = await jsonGet(url);
  // next 3 days (trip starts tomorrow)
  return wj.daily.time.slice(1, 4).map((date, i) => ({
    date,
    temp_max: wj.daily.temperature_2m_max[i + 1],
    temp_min: wj.daily.temperature_2m_min[i + 1],
    weathercode: wj.daily.weathercode[i + 1],
  }));
}

/* =========================
   Route Building
========================= */
async function snapStart(lon, lat, profile) {
  try {
    const u = new URL(`${ORS_BASE}/nearest/${profile}`);
    u.searchParams.set("point", `${lon},${lat}`);
    u.searchParams.set("number", "1");
    u.searchParams.set("radius", "1000");
    const res = await fetch(u, {
      headers: { Authorization: process.env.ORS_API_KEY },
    });
    if (res.ok) {
      const { features } = await res.json();
      if (features?.length) return features[0].geometry.coordinates;
    }
  } catch (e) {
    console.warn("ORS nearest exception:", e.message);
  }
  return [lon, lat]; // fallback to raw
}

async function buildTrekRoute(lon, lat, maxKmPerDay) {
  const meters = Math.min(maxKmPerDay * 1000, 100_000);
  const { ok, data } = await orsRoundTrip(
    PROFILE.trek,
    lon,
    lat,
    meters,
    Math.floor(Math.random() * 10000)
  );
  if (!ok || !data.features?.length)
    throw { message: "Routing error", error: data };
  return data.features[0].geometry.coordinates;
}

async function tryBikeRouteOnce(startLon, startLat, bearing, totalKm) {
  const [gLon, gLat] = destinationPoint([startLon, startLat], totalKm, bearing);
  const destSnap = await getRoutablePoint(
    PROFILE.bike,
    gLon,
    gLat,
    [500, 1000, 2000, 5000, 10000]
  );
  if (!destSnap) return null;

  const { ok, data } = await orsDirections(PROFILE.bike, [
    [startLon, startLat],
    destSnap,
  ]);

  if (!ok) {
    if (data?.error?.code === 2010) return null; // not routable within radius: try other bearing/distance
    return { error: data };
  }
  if (!data.features?.length) return null;
  return { coords: data.features[0].geometry.coordinates };
}

async function fallbackBikeViaLoop(startLon, startLat) {
  // 1) ask ORS for a ~100km round trip
  const { ok, data } = await orsRoundTrip(
    PROFILE.bike,
    startLon,
    startLat,
    100_000,
    Math.floor(Math.random() * 10000)
  );
  if (!ok || !data.features?.length)
    throw { message: "Routing error", error: data };

  const loop = data.features[0].geometry.coordinates;
  if (loop.length < 3) throw new Error("Fallback loop too short");

  // 2) compute cumulative distance along the loop
  const cum = [0];
  for (let i = 1; i < loop.length; i++)
    cum[i] = cum[i - 1] + haversine(loop[i - 1], loop[i]);
  const totalKmLoop = cum[cum.length - 1];

  // 3) pick a target around half (45–55%) to balance days
  const targetKm = Math.min(
    Math.max(totalKmLoop * 0.5, totalKmLoop * 0.45),
    totalKmLoop * 0.55
  );

  // 4) index closest to target
  let splitIdx = 1;
  for (let i = 1; i < cum.length; i++) {
    if (Math.abs(cum[i] - targetKm) < Math.abs(cum[splitIdx] - targetKm))
      splitIdx = i;
  }

  // 5) snap split point and build start -> split
  let [destLon, destLat] = loop[splitIdx];
  const destSnap = await getRoutablePoint(
    PROFILE.bike,
    destLon,
    destLat,
    [500, 1000, 2000, 5000, 10000]
  );
  if (destSnap) [destLon, destLat] = destSnap;

  const ab = await orsDirections(PROFILE.bike, [
    [startLon, startLat],
    [destLon, destLat],
  ]);
  if (!ab.ok || !ab.data.features?.length)
    throw { message: "Routing error", error: ab.data };
  return ab.data.features[0].geometry.coordinates;
}

async function buildBikeRoute(lon, lat) {
  // Snap start more robustly (covers ORS 350m constraint)
  const startSnap = await getRoutablePoint(
    PROFILE.bike,
    lon,
    lat,
    [500, 1000, 2000, 5000]
  );
  if (startSnap) [lon, lat] = startSnap;

  // Try a set of bearings/distances
  const seed = Math.floor(Math.random() * 10000);
  const baseBearing = seed % 360;
  const bearings = [
    baseBearing,
    baseBearing + 30,
    baseBearing - 30,
    baseBearing + 60,
    baseBearing - 60,
    baseBearing + 90,
    baseBearing - 90,
  ].map((b) => (b + 360) % 360);
  const distances = [100, 95, 90, 110, 85, 80, 70, 60]; // km

  for (const b of bearings) {
    for (const d of distances) {
      const out = await tryBikeRouteOnce(lon, lat, b, d);
      if (out?.coords) return out.coords;
      if (out?.error) throw { message: "Routing error", error: out.error };
    }
  }

  // Final fallback via mid-point of a loop
  return fallbackBikeViaLoop(lon, lat);
}

/* =========================
   Route Post-Processing
========================= */
function cumulativeDistances(coords) {
  const cum = [0];
  for (let i = 1; i < coords.length; i++)
    cum[i] = cum[i - 1] + haversine(coords[i - 1], coords[i]);
  return cum;
}

function splitIntoDaysBalanced(coords, days, maxKmPerDay) {
  const dayDistances = Array(days).fill(0);
  const cum = cumulativeDistances(coords);
  const totalKm = cum[cum.length - 1];

  let splitAtKm = totalKm / days;
  if (days === 2) {
    // keep day1 between 40%..60% of total and respect the cap
    const minD = Math.max(0.4 * totalKm, Math.min(splitAtKm, maxKmPerDay));
    const maxD = Math.min(0.6 * totalKm, maxKmPerDay);
    splitAtKm = Math.min(Math.max(splitAtKm, minD), maxD);
  } else {
    splitAtKm = Math.min(splitAtKm, maxKmPerDay);
  }

  let currentDay = 0;
  for (let i = 1; i < coords.length; i++) {
    const seg = haversine(coords[i - 1], coords[i]);
    const nextTotal = dayDistances[currentDay] + seg;

    if (days === 2 && currentDay === 0 && nextTotal > splitAtKm) {
      currentDay = 1;
      dayDistances[currentDay] += seg; // push this segment to day 2
    } else if (nextTotal <= maxKmPerDay) {
      dayDistances[currentDay] = nextTotal;
    } else if (currentDay < days - 1) {
      currentDay++;
      dayDistances[currentDay] += seg;
    } else {
      dayDistances[currentDay] += seg; // last day: may slightly exceed; rare
    }
  }
  return dayDistances;
}

/* =========================
   Handlers
========================= */
router.post("/route", async (req, res) => {
  try {
    const { location, type } = req.body;
    if (!location || !["bike", "trek"].includes(type)) {
      return res
        .status(400)
        .json({ message: "Please provide location and type (bike|trek)" });
    }

    // 1) Geocode & snap start
    let [lon, lat] = await geocodeLocation(location);
    const profile = PROFILE[type];
    [lon, lat] = await snapStart(lon, lat, profile);

    // 2) Build route
    const days = type === "bike" ? 2 : 1;
    const maxKmPerDay = MAX_KM_PER_DAY[type];
    const coords =
      type === "bike"
        ? await buildBikeRoute(lon, lat)
        : await buildTrekRoute(lon, lat, maxKmPerDay);

    if (!coords?.length) {
      return res.status(404).json({
        message:
          "Could not generate a route from this location. Try another start.",
      });
    }

    // 3) Split into days (balanced & capped)
    const dayDistances = splitIntoDaysBalanced(coords, days, maxKmPerDay);

    // 4) Weather (start-point based, per spec)
    const weather = await fetchWeather(lat, lon);

    // 5) Return
    res.json({ coords, dayDistances, weather, lat, lon });
  } catch (e) {
    console.error(e);
    // normalize ORS error passthrough if present
    if (e?.error)
      return res
        .status(500)
        .json({ message: e.message || "Routing error", error: e.error });
    res.status(500).json({ message: e.message || "Failed to generate route" });
  }
});

router.post("/image", async (req, res) => {
  try {
    const { location, type } = req.body;
    if (!location || !type)
      return res.status(400).json({ message: "Missing location or type" });

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

    // key places along the route
    const keyPoints = sampleKeyPoints(coords, 10);
    const placeNames = [];
    for (const [lon, lat] of keyPoints) {
      try {
        const geoData = await reverseGeocode(lon, lat, 10);
        const name =
          geoData.address?.village ||
          geoData.address?.town ||
          geoData.address?.suburb ||
          geoData.display_name.split(",")[0];
        if (name && !placeNames.includes(name)) placeNames.push(name);
        await delay(500); // Nominatim rate-limit
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

    // Call LLM (Groq) with graceful fallback
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

      const ct = groqRes.headers.get("content-type");
      if (groqRes.ok && ct && ct.includes("application/json")) {
        const hfJson = await groqRes.json();
        narrative = hfJson?.choices?.[0]?.message?.content || "";
      } else {
        const text = await groqRes.text();
        console.warn("Groq text error:", groqRes.status, text.slice(0, 100));
      }
    } catch (e) {
      console.warn("Groq text exception:", e.message);
    }

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
