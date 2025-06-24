const express = require("express");
const { saveTrip, listTripsForUser, getTripById } = require("../db/trips");
const router = express.Router();

// POST /trips → create a new trip
router.post("/", async (req, res) => {
  try {
    const { name, description = "", type, coords, dayDistances } = req.body;
    // Validate required fields
    if (
      !name ||
      !type ||
      !Array.isArray(coords) ||
      !Array.isArray(dayDistances)
    ) {
      return res.status(400).json({ message: "Missing or invalid fields" });
    }
    // Save into DB
    const trip = await saveTrip({
      owner: req.userId,
      name,
      description,
      type,
      coords,
      dayDistances,
    });
    res.status(201).json(trip);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to save trip" });
  }
});

// GET /trips → list all trips for the logged-in user
router.get("/", async (req, res) => {
  try {
    const trips = await listTripsForUser(req.userId);
    res.json(trips);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to fetch trips" });
  }
});

// GET /trips/:id → fetch one trip by ID
router.get("/:id", async (req, res) => {
  try {
    const trip = await getTripById(req.params.id);
    if (!trip || trip.owner.toString() !== req.userId) {
      return res.status(404).json({ message: "Trip not found" });
    }
    res.json(trip);
  } catch (e) {
    console.error(e);
    res.status(400).json({ message: "Invalid trip ID" });
  }
});

module.exports = router;
