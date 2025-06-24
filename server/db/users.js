const bcrypt = require("bcrypt");
const { getDB } = require("../config/database");
const USERS = "users";

async function createUser({ name, email, password }) {
  const db = getDB();
  const hash = await bcrypt.hash(password, 10);
  const { insertedId } = await db.collection(USERS).insertOne({
    name,
    email,
    password: hash,
    createdAt: new Date(),
  });
  return { _id: insertedId, name, email };
}

async function findUserByEmail(email) {
  const db = getDB();
  return db.collection(USERS).findOne({ email });
}

module.exports = { createUser, findUserByEmail };
