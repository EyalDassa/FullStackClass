const { ObjectId } = require("mongodb");
const { getDB } = require("../config/database");
const C = "trips"; // ← collection name

// Insert a new trip document
async function saveTrip(route) {
  const db = getDB();
  const result = await db.collection(C).insertOne({
    owner: new ObjectId(route.owner),
    name: route.name,
    description: route.description,
    type: route.type,
    coords: route.coords,
    dayDistances: route.dayDistances,
    createdAt: new Date(),
  });
  // result.ops is deprecated; use insertedId + findOne
  const inserted = await db.collection(C).findOne({ _id: result.insertedId });
  return inserted;
}

// List all trips for a given user
async function listTripsForUser(userId) {
  const db = getDB();
  return db
    .collection(C)
    .find({ owner: new ObjectId(userId) })
    .sort({ createdAt: -1 })
    .toArray();
}

// Fetch one trip by its _id
async function getTripById(id) {
  const db = getDB();
  return db.collection(C).findOne({ _id: new ObjectId(id) });
}

module.exports = { saveTrip, listTripsForUser, getTripById };
