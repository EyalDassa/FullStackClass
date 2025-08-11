const express = require("express");
const jwt = require("jsonwebtoken");
const { createUser, findUserByEmail } = require("../db/users");
const bcrypt = require("bcrypt");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// POST /auth/register
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ message: "All fields required" });

  if (await findUserByEmail(email))
    return res.status(409).json({ message: "Email already in use" });

  const user = await createUser({ name, email, password });
  res.status(201).json({ user });
});

// POST /auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await findUserByEmail(email);
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ message: "Invalid credentials" });

  const token = jwt.sign({ sub: user._id }, JWT_SECRET, { expiresIn: "1h" });
  res.json({ token });
});

// POST /auth/logout — on client just drop the token
router.post("/logout", (_req, res) => {
  // With stateless JWT, you simply have the client delete its copy.
  res.json({ message: "Logged out" });
});

module.exports = router;
