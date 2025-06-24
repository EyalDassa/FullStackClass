require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { connectDB } = require("./config/database");
const planner = require("./routes/planner");
const ensureAuth = require("./middleware/auth");
const tripsRouter = require("./routes/trips");
const authRouter = require("./routes/auth");

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

app.use("/auth", authRouter);
app.use("/trips", ensureAuth, tripsRouter);
app.use("/trips/plan", ensureAuth, planner);

connectDB()
  .then(() => {
    app.get("/", (req, res) => res.send("🚀 API is running"));
    app.listen(PORT, () =>
      console.log(`Server listening on http://localhost:${PORT}`)
    );
  })
  .catch((err) => {
    console.error("❌ Failed to connect to MongoDB:", err);
    process.exit(1);
  });
