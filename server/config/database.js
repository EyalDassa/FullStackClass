const { MongoClient } = require("mongodb");
const uri = process.env.MONGO_URI;
console.log("→ MONGO_URI:", process.env.MONGO_URI);
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

let db;

async function connectDB() {
  if (!db) {
    await client.connect();
    console.log("🗄️  MongoDB connected");
    db = client.db(); // uses the DB name from your URI
  }
  return db;
}

function getDB() {
  if (!db) throw new Error("Database not connected. Call connectDB first.");
  return db;
}

module.exports = { connectDB, getDB };
